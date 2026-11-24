import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type MariaCharacterState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'connecting'
  | 'muted'
  | 'error';

interface MariaCharacter3DProps {
  state?: MariaCharacterState;
  energy?: number;
  size?: 'hero' | 'stage' | 'compact';
  interactive?: boolean;
  onActivate?: () => void;
  className?: string;
}

const HALO_VERTEX_SHADER = /* glsl */ `
  varying vec3 vLocalPos;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;

  void main() {
    vLocalPos = position;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewPos = -mvPos.xyz;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const HALO_FRAGMENT_SHADER = /* glsl */ `
  uniform float uPhase;
  uniform float uOpacity;
  uniform float uFocusPower;
  uniform vec3 uCoreColor;
  uniform vec3 uTrailColor;
  varying vec3 vLocalPos;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;

  void main() {
    vec3 N = normalize(vViewNormal);
    vec3 V = normalize(vViewPos);
    float tubeFace = clamp(abs(dot(N, V)), 0.0, 1.0);
    float tubeSoft = pow(tubeFace, 0.72);

    float angle = atan(vLocalPos.y, vLocalPos.x);
    float directional = 0.5 + 0.5 * cos(angle - uPhase);
    float cometHead = pow(directional, uFocusPower);
    float cometBody = smoothstep(0.12, 0.96, directional);

    vec3 color = mix(uTrailColor, uCoreColor, cometHead);
    color += vec3(1.0) * pow(directional, uFocusPower * 1.8) * 0.48;

    float alpha = cometBody * tubeSoft * uOpacity;
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  }
`;

const detectSoftwareWebGL = (): boolean => {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
};

// Pre-allocated scratch colors to guarantee zero GC inside the render loop
const _targetEyeColor = new THREE.Color();
const _targetHaloCore = new THREE.Color();
const _targetHaloTrail = new THREE.Color();
const _targetEarGlow = new THREE.Color();

const COLOR_CYAN_BRIGHT = new THREE.Color(0xbae6fd);
const COLOR_CYAN_EYE = new THREE.Color(0x7dd3fc);
const COLOR_COBALT_THINK = new THREE.Color(0x38bdf8);
const COLOR_BLUE_TRAIL = new THREE.Color(0x2563eb);
const COLOR_WHITE_ICE = new THREE.Color(0xe0f2fe);
const COLOR_MUTED_SLATE = new THREE.Color(0x64748b);
const COLOR_MUTED_TRAIL = new THREE.Color(0x334155);
const COLOR_ERROR_CORAL = new THREE.Color(0xfb7185);
const COLOR_ERROR_TRAIL = new THREE.Color(0xe11d48);
const COLOR_CORAL_ACCENT = new THREE.Color(0xf39296);

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(37, 99, 235, 0.42)');
    grad.addColorStop(0.45, 'rgba(15, 23, 42, 0.24)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const MariaCharacter3D: React.FC<MariaCharacter3DProps> = ({
  state = 'idle',
  energy = 0,
  size = 'hero',
  interactive = true,
  onActivate,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);

  // Mutable refs for state & audio energy so React updates never tear down WebGL
  const stateRef = useRef<MariaCharacterState>(state);
  const energyRef = useRef<number>(energy);
  const interactiveRef = useRef<boolean>(interactive);
  const pointerTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pokeBoostRef = useRef<number>(0);

  stateRef.current = state;
  energyRef.current = energy;
  interactiveRef.current = interactive;

  const containerSizeClass =
    size === 'compact'
      ? 'w-12 h-12'
      : size === 'stage'
      ? 'w-44 h-44 sm:w-52 sm:h-52'
      : 'w-32 h-32 sm:w-40 sm:h-40';

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let renderer: THREE.WebGLRenderer | null = null;
    let pmremGenerator: THREE.PMREMGenerator | null = null;
    let envRenderTarget: THREE.WebGLRenderTarget | null = null;
    let frameId = 0;
    let disposed = false;

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    try {
      const isSoftwareGl = detectSoftwareWebGL();
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        premultipliedAlpha: false,
      });

      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));

      const initW = Math.max(container.clientWidth, 64);
      const initH = Math.max(container.clientHeight, 64);
      renderer.setSize(initW, initH, false);

      const canvas = renderer.domElement;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';

      container.innerHTML = '';
      container.appendChild(canvas);

      const scene = new THREE.Scene();

      // Studio reflection environment
      pmremGenerator = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      envRenderTarget = pmremGenerator.fromScene(roomEnv, 0.04);
      scene.environment = envRenderTarget.texture;
      roomEnv.dispose();
      pmremGenerator.dispose();
      pmremGenerator = null;

      const camera = new THREE.PerspectiveCamera(32, initW / initH, 0.1, 30);
      camera.position.set(0, 0.08, 4.9);
      camera.lookAt(0, -0.04, 0);

      // Balanced 3-point lighting rig (warm key, cool hemisphere fill, cyan rim)
      const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0b132b, 0.95);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xfff5eb, 1.9);
      keyLight.position.set(-2.6, 3.4, 4.2);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.65);
      rimLight.position.set(2.8, 1.5, -2.8);
      scene.add(rimLight);

      const accentFill = new THREE.PointLight(0xf39296, 0.6, 6);
      accentFill.position.set(1.4, 1.2, 2.0);
      scene.add(accentFill);

      // Root character group (pivoted cleanly so hover/tilt feels natural)
      const characterRoot = new THREE.Group();
      scene.add(characterRoot);

      // Soft grounded contact shadow beneath the hovering bust
      const shadowTex = createContactShadowTexture();
      textures.push(shadowTex);
      const shadowGeo = new THREE.PlaneGeometry(1.75, 1.75);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.72,
      });
      geometries.push(shadowGeo);
      materials.push(shadowMat);
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.set(0, -1.04, 0);
      scene.add(shadowMesh);

      // Sculpted floating base collar pedestal (Part 1)
      const collarPoints = [
        new THREE.Vector2(0.0, -0.1),
        new THREE.Vector2(0.32, -0.1),
        new THREE.Vector2(0.42, -0.05),
        new THREE.Vector2(0.44, 0.03),
        new THREE.Vector2(0.34, 0.08),
        new THREE.Vector2(0.18, 0.08),
        new THREE.Vector2(0.0, 0.08),
      ];
      const collarGeo = new THREE.LatheGeometry(collarPoints, 40);
      const collarMat = new THREE.MeshStandardMaterial({
        color: 0x9fb2cb,
        metalness: 0.88,
        roughness: 0.22,
      });
      geometries.push(collarGeo);
      materials.push(collarMat);
      const collarMesh = new THREE.Mesh(collarGeo, collarMat);
      collarMesh.position.set(0, -0.76, -0.02);
      characterRoot.add(collarMesh);

      // Collar under-glow ring (Part 2)
      const collarGlowGeo = new THREE.TorusGeometry(0.43, 0.018, 12, 48);
      const collarGlowMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.4,
        roughness: 0.2,
        metalness: 0.1,
      });
      geometries.push(collarGlowGeo);
      materials.push(collarGlowMat);
      const collarGlowMesh = new THREE.Mesh(collarGlowGeo, collarGlowMat);
      collarGlowMesh.rotation.x = Math.PI / 2;
      collarGlowMesh.position.set(0, -0.76, -0.02);
      characterRoot.add(collarGlowMesh);

      // Head Assembly (tracks pointer gaze + vocal tilt)
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 0.04, 0);
      characterRoot.add(headGroup);

      // Part 3: Primary Silhouette — Sculpted Midnight-Navy Ceramic Head Chassis (LatheGeometry)
      const headProfile = [
        new THREE.Vector2(0.0, -0.62),
        new THREE.Vector2(0.28, -0.60),
        new THREE.Vector2(0.52, -0.46),
        new THREE.Vector2(0.66, -0.22),
        new THREE.Vector2(0.71, 0.04),
        new THREE.Vector2(0.68, 0.30),
        new THREE.Vector2(0.56, 0.52),
        new THREE.Vector2(0.35, 0.66),
        new THREE.Vector2(0.14, 0.71),
        new THREE.Vector2(0.0, 0.72),
      ];
      const headChassisGeo = new THREE.LatheGeometry(headProfile, 48);
      const headChassisMat = new THREE.MeshPhysicalMaterial({
        color: 0x151e3a,
        roughness: 0.38,
        metalness: 0.36,
        clearcoat: 0.45,
        clearcoatRoughness: 0.24,
      });
      geometries.push(headChassisGeo);
      materials.push(headChassisMat);
      const headChassisMesh = new THREE.Mesh(headChassisGeo, headChassisMat);
      headChassisMesh.scale.set(1.06, 0.98, 0.92);
      headGroup.add(headChassisMesh);

      // Part 4: Glossy Dark Optical Glass Visor Faceplate
      const visorGeo = new THREE.SphereGeometry(0.62, 44, 36);
      const visorMat = new THREE.MeshPhysicalMaterial({
        color: 0x040814,
        roughness: 0.06,
        metalness: 0.12,
        clearcoat: 1.0,
        clearcoatRoughness: 0.04,
      });
      geometries.push(visorGeo);
      materials.push(visorMat);
      const visorMesh = new THREE.Mesh(visorGeo, visorMat);
      visorMesh.scale.set(0.96, 0.84, 0.62);
      visorMesh.position.set(0, 0.01, 0.29);
      headGroup.add(visorMesh);

      // Part 5: Brushed Silver-Blue Metallic Face Bezel Ring (echoing MariaLogo circle)
      const bezelGeo = new THREE.TorusGeometry(0.57, 0.026, 16, 64);
      const bezelMat = new THREE.MeshStandardMaterial({
        color: 0xb8c5d6,
        metalness: 0.90,
        roughness: 0.20,
      });
      geometries.push(bezelGeo);
      materials.push(bezelMat);
      const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
      bezelMesh.scale.set(1.02, 0.9, 1.0);
      bezelMesh.position.set(0, 0.01, 0.44);
      headGroup.add(bezelMesh);

      // Part 6: Expressive Luminous Eyes (Left & Right)
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(0, 0.08, 0.635);
      headGroup.add(eyeGroup);

      const eyeGeo = new THREE.CapsuleGeometry(0.056, 0.085, 10, 18);
      const eyeMat = new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        emissive: 0x7dd3fc,
        emissiveIntensity: 1.55,
        roughness: 0.15,
        metalness: 0.05,
      });
      geometries.push(eyeGeo);
      materials.push(eyeMat);

      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.205, 0, -0.025);
      leftEye.rotation.y = -0.22;
      eyeGroup.add(leftEye);

      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.205, 0, -0.025);
      rightEye.rotation.y = 0.22;
      eyeGroup.add(rightEye);

      // Subtle bright pupil glint points inside eyes
      const glintGeo = new THREE.SphereGeometry(0.02, 12, 12);
      const glintMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
      });
      geometries.push(glintGeo);
      materials.push(glintMat);

      const leftGlint = new THREE.Mesh(glintGeo, glintMat);
      leftGlint.position.set(-0.188, 0.032, 0.034);
      eyeGroup.add(leftGlint);

      const rightGlint = new THREE.Mesh(glintGeo, glintMat);
      rightGlint.position.set(0.222, 0.032, 0.034);
      eyeGroup.add(rightGlint);

      // Part 7: Reactive 5-Bar Voice Waveform Mouth
      const mouthGroup = new THREE.Group();
      mouthGroup.position.set(0, -0.175, 0.628);
      headGroup.add(mouthGroup);

      const barGeo = new THREE.CapsuleGeometry(0.017, 0.042, 6, 12);
      const barMat = new THREE.MeshStandardMaterial({
        color: 0xbae6fd,
        emissive: 0x7dd3fc,
        emissiveIntensity: 1.45,
        roughness: 0.2,
        metalness: 0.05,
      });
      geometries.push(barGeo);
      materials.push(barMat);

      const mouthBars: THREE.Mesh[] = [];
      const barX = [-0.125, -0.062, 0, 0.062, 0.125];
      const barZ = [-0.026, -0.008, 0.0, -0.008, -0.026];
      for (let i = 0; i < 5; i++) {
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set(barX[i], 0, barZ[i]);
        mouthGroup.add(bar);
        mouthBars.push(bar);
      }

      // Part 8: Signature Coral-Pink Crest Fin & 4-Point Sparkle Star (from MariaLogo)
      const crestShape = new THREE.Shape();
      crestShape.moveTo(-0.02, -0.16);
      crestShape.lineTo(0.04, -0.16);
      crestShape.lineTo(0.24, 0.18);
      crestShape.lineTo(0.17, 0.21);
      crestShape.closePath();

      const crestGeo = new THREE.ExtrudeGeometry(crestShape, {
        depth: 0.035,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.012,
        bevelSegments: 3,
      });
      crestGeo.center();
      const crestMat = new THREE.MeshStandardMaterial({
        color: 0xf39296,
        emissive: 0xf39296,
        emissiveIntensity: 0.28,
        metalness: 0.68,
        roughness: 0.24,
      });
      geometries.push(crestGeo);
      materials.push(crestMat);
      const crestMesh = new THREE.Mesh(crestGeo, crestMat);
      crestMesh.position.set(0.41, 0.45, 0.28);
      crestMesh.rotation.set(-0.22, 0.35, -0.12);
      headGroup.add(crestMesh);

      // 4-point star emblem hovering gracefully above upper-right brow
      const starShape = new THREE.Shape();
      const sOuter = 0.095;
      const sInner = 0.026;
      starShape.moveTo(0, sOuter);
      starShape.quadraticCurveTo(0, 0, sOuter, 0);
      starShape.quadraticCurveTo(0, 0, 0, -sOuter);
      starShape.quadraticCurveTo(0, 0, -sOuter, 0);
      starShape.quadraticCurveTo(0, 0, 0, sOuter);
      const starGeo = new THREE.ExtrudeGeometry(starShape, {
        depth: 0.02,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
      });
      starGeo.center();
      // Keep sInner reference clean
      void sInner;
      const starMat = new THREE.MeshStandardMaterial({
        color: 0xf39296,
        emissive: 0xf39296,
        emissiveIntensity: 0.65,
        metalness: 0.55,
        roughness: 0.2,
      });
      geometries.push(starGeo);
      materials.push(starMat);
      const starMesh = new THREE.Mesh(starGeo, starMat);
      starMesh.position.set(0.58, 0.58, 0.26);
      headGroup.add(starMesh);

      // Part 9: Articulated Side Audio Wing Ear-Pods
      const earPodGeo = new THREE.CapsuleGeometry(0.105, 0.22, 10, 20);
      const earPodMat = new THREE.MeshStandardMaterial({
        color: 0x1d284a,
        metalness: 0.55,
        roughness: 0.28,
      });
      const earRingGeo = new THREE.TorusGeometry(0.082, 0.016, 12, 32);
      const earRingMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.25,
        roughness: 0.2,
        metalness: 0.15,
      });
      geometries.push(earPodGeo, earRingGeo);
      materials.push(earPodMat, earRingMat);

      const leftEarGroup = new THREE.Group();
      leftEarGroup.position.set(-0.78, 0.02, -0.02);
      const leftEarPod = new THREE.Mesh(earPodGeo, earPodMat);
      const leftEarRing = new THREE.Mesh(earRingGeo, earRingMat);
      leftEarRing.rotation.y = Math.PI / 2;
      leftEarRing.position.set(-0.088, 0, 0);
      leftEarGroup.add(leftEarPod, leftEarRing);
      headGroup.add(leftEarGroup);

      const rightEarGroup = new THREE.Group();
      rightEarGroup.position.set(0.78, 0.02, -0.02);
      const rightEarPod = new THREE.Mesh(earPodGeo, earPodMat);
      const rightEarRing = new THREE.Mesh(earRingGeo, earRingMat);
      rightEarRing.rotation.y = Math.PI / 2;
      rightEarRing.position.set(0.088, 0, 0);
      rightEarGroup.add(rightEarPod, rightEarRing);
      headGroup.add(rightEarGroup);

      // Part 10: Orbiting Holographic Energy Halo (echoing MariaOrb3D)
      const haloGroup = new THREE.Group();
      characterRoot.add(haloGroup);

      const haloRingGeo = new THREE.TorusGeometry(1.06, 0.032, 18, 96);
      const haloRingMat = new THREE.ShaderMaterial({
        uniforms: {
          uPhase: { value: 0 },
          uOpacity: { value: 0.85 },
          uFocusPower: { value: 3.0 },
          uCoreColor: { value: new THREE.Color(0xbae6fd) },
          uTrailColor: { value: new THREE.Color(0x2563eb) },
        },
        vertexShader: HALO_VERTEX_SHADER,
        fragmentShader: HALO_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      geometries.push(haloRingGeo);
      materials.push(haloRingMat);
      const haloRingMesh = new THREE.Mesh(haloRingGeo, haloRingMat);
      haloGroup.add(haloRingMesh);

      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }

      const handleContextLost = (e: Event) => {
        e.preventDefault();
        if (!disposed) {
          cancelAnimationFrame(frameId);
          window.clearTimeout(frameId);
        }
      };

      const handleContextRestored = () => {
        if (!disposed) {
          tick();
        }
      };

      canvas.addEventListener('webglcontextlost', handleContextLost);
      canvas.addEventListener('webglcontextrestored', handleContextRestored);

      const resizeObserver = new ResizeObserver((entries) => {
        if (disposed || !renderer) return;
        const entry = entries[0];
        if (!entry) return;
        const w = Math.max(Math.round(entry.contentRect.width), 48);
        const h = Math.max(Math.round(entry.contentRect.height), 48);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      });
      resizeObserver.observe(container);

      const timer = new THREE.Timer();
      timer.connect(document);
      let elapsed = 0;
      let haloPhase = 0;
      let haloRotY = 0.25;
      let haloRotX = 1.15;
      let blinkTimer = 2.6;
      let blinkAmount = 0;
      let smoothedEnergy = 0;

      const updateScene = (delta: number, t: number) => {
        const curState = stateRef.current;
        const rawEnergy = Math.max(0, Math.min(1, energyRef.current));

        // For speaking without external mic energy (e.g. TTS playback), blend organic cadence
        const syntheticSpeechWave =
          curState === 'speaking'
            ? 0.28 +
              0.24 * Math.abs(Math.sin(t * 9.5)) +
              0.16 * Math.abs(Math.sin(t * 15.2 + 1.1))
            : 0;
        const targetEnergy =
          curState === 'speaking'
            ? Math.max(rawEnergy, syntheticSpeechWave * 0.72)
            : curState === 'listening'
            ? rawEnergy
            : 0;

        smoothedEnergy = THREE.MathUtils.damp(smoothedEnergy, targetEnergy, 14, delta);
        pokeBoostRef.current = THREE.MathUtils.damp(pokeBoostRef.current, 0, 5.5, delta);
        const poke = pokeBoostRef.current;

        // Blink scheduling
        blinkTimer -= delta;
        if (blinkTimer <= 0) {
          blinkAmount = 1.0;
          blinkTimer = 2.8 + Math.random() * 2.4;
        }
        blinkAmount = THREE.MathUtils.damp(blinkAmount, 0, 14, delta);

        // Hover float & bounce
        const hoverSpeed =
          curState === 'thinking' || curState === 'connecting'
            ? 3.2
            : curState === 'speaking'
            ? 3.8
            : 1.9;
        const hoverAmp = curState === 'muted' ? 0.015 : 0.042;
        characterRoot.position.y =
          Math.sin(t * hoverSpeed) * hoverAmp + poke * 0.12;

        // Shadow breathing inversely to float height
        const shadowScale = 1.0 - characterRoot.position.y * 0.8;
        shadowMesh.scale.setScalar(shadowScale);
        shadowMat.opacity = curState === 'muted' ? 0.42 : 0.68 + smoothedEnergy * 0.18;

        // Head gaze + state expression posture
        const lookX = interactiveRef.current ? pointerTargetRef.current.x : 0;
        const lookY = interactiveRef.current ? pointerTargetRef.current.y : 0;

        let targetHeadYaw = lookX * 0.34;
        let targetHeadPitch = -lookY * 0.22;
        let targetHeadRoll = -lookX * 0.08;

        if (curState === 'listening') {
          targetHeadRoll += 0.09; // Attentive slight head tilt
          targetHeadPitch -= 0.04;
        } else if (curState === 'thinking' || curState === 'connecting') {
          targetHeadYaw += Math.sin(t * 1.4) * 0.14;
          targetHeadPitch -= 0.08;
          targetHeadRoll += Math.cos(t * 1.1) * 0.06;
        } else if (curState === 'speaking') {
          targetHeadPitch += Math.sin(t * 7.2) * (0.03 + smoothedEnergy * 0.06);
          targetHeadRoll += Math.sin(t * 3.1) * 0.055;
        } else if (curState === 'muted') {
          targetHeadPitch += 0.11; // Subtle resting downward nod
        } else if (curState === 'error') {
          targetHeadRoll -= 0.1;
          targetHeadYaw += Math.sin(t * 12.0) * 0.04;
        }

        // Add playful nod on user click
        targetHeadPitch -= Math.sin(poke * Math.PI) * 0.25;

        headGroup.rotation.y = THREE.MathUtils.damp(headGroup.rotation.y, targetHeadYaw, 7, delta);
        headGroup.rotation.x = THREE.MathUtils.damp(headGroup.rotation.x, targetHeadPitch, 7, delta);
        headGroup.rotation.z = THREE.MathUtils.damp(headGroup.rotation.z, targetHeadRoll, 7, delta);

        // Eye expressions & colors
        let targetEyeScaleY = 1.0;
        let targetEyeScaleX = 1.0;
        let targetEyeOffsetX = lookX * 0.028;
        let targetEyeOffsetY = lookY * 0.02;
        let eyeIntensity = 1.5;

        if (curState === 'speaking') {
          _targetEyeColor.copy(COLOR_CYAN_BRIGHT);
          eyeIntensity = 1.85 + smoothedEnergy * 1.3;
          targetEyeScaleY = 0.84 - smoothedEnergy * 0.14; // Warm smiling squint
          targetEyeScaleX = 1.08 + smoothedEnergy * 0.1;
        } else if (curState === 'listening') {
          _targetEyeColor.copy(COLOR_CYAN_EYE);
          eyeIntensity = 1.7 + smoothedEnergy * 0.8;
          targetEyeScaleY = 1.06 + smoothedEnergy * 0.08;
        } else if (curState === 'thinking' || curState === 'connecting') {
          _targetEyeColor.copy(COLOR_COBALT_THINK);
          eyeIntensity = 1.65 + 0.4 * Math.sin(t * 5.0);
          targetEyeScaleY = 0.78;
          targetEyeOffsetX = Math.sin(t * 2.4) * 0.045;
          targetEyeOffsetY = 0.025;
        } else if (curState === 'muted') {
          _targetEyeColor.copy(COLOR_MUTED_SLATE);
          eyeIntensity = 0.45;
          targetEyeScaleY = 0.22;
        } else if (curState === 'error') {
          _targetEyeColor.copy(COLOR_ERROR_CORAL);
          eyeIntensity = 1.5;
          targetEyeScaleY = 0.72;
        } else {
          _targetEyeColor.copy(COLOR_CYAN_EYE);
          eyeIntensity = 1.45;
        }

        // Apply blink + click wink
        const finalEyeScaleY = Math.max(0.08, targetEyeScaleY * (1.0 - blinkAmount * 0.92));
        leftEye.scale.y = THREE.MathUtils.damp(leftEye.scale.y, finalEyeScaleY, 22, delta);
        rightEye.scale.y = THREE.MathUtils.damp(rightEye.scale.y, finalEyeScaleY, 22, delta);
        leftEye.scale.x = THREE.MathUtils.damp(leftEye.scale.x, targetEyeScaleX, 12, delta);
        rightEye.scale.x = THREE.MathUtils.damp(rightEye.scale.x, targetEyeScaleX, 12, delta);

        eyeGroup.position.x = THREE.MathUtils.damp(eyeGroup.position.x, targetEyeOffsetX, 10, delta);
        eyeGroup.position.y = THREE.MathUtils.damp(eyeGroup.position.y, 0.08 + targetEyeOffsetY, 10, delta);

        const glintVisible = finalEyeScaleY > 0.35 && curState !== 'muted';
        leftGlint.visible = glintVisible;
        rightGlint.visible = glintVisible;

        eyeMat.color.lerp(_targetEyeColor, Math.min(1, delta * 8));
        eyeMat.emissive.lerp(_targetEyeColor, Math.min(1, delta * 8));
        eyeMat.emissiveIntensity = THREE.MathUtils.damp(
          eyeMat.emissiveIntensity,
          eyeIntensity,
          10,
          delta
        );

        // Mouth 5-bar waveform modulation
        for (let i = 0; i < mouthBars.length; i++) {
          const bar = mouthBars[i];
          const centerWeight = 1.0 - Math.abs(i - 2) * 0.22;
          let targetBarY = 0.45;

          if (curState === 'speaking') {
            const harmonic =
              0.55 +
              0.45 * Math.sin(t * 14.0 + i * 1.15) * Math.cos(t * 6.5 - i * 0.7);
            targetBarY = 0.55 + (0.45 + smoothedEnergy * 2.2) * centerWeight * Math.abs(harmonic);
          } else if (curState === 'listening') {
            const micWave = 0.5 + 0.5 * Math.sin(t * 8.0 + i * 0.9);
            targetBarY = 0.45 + smoothedEnergy * 1.5 * centerWeight * micWave;
          } else if (curState === 'thinking' || curState === 'connecting') {
            const scan = Math.max(0, Math.sin(t * 5.2 - i * 0.85));
            targetBarY = 0.35 + scan * 0.95;
          } else if (curState === 'muted') {
            targetBarY = 0.22;
          } else if (curState === 'error') {
            targetBarY = i === 1 || i === 3 ? 0.65 : 0.35;
          } else {
            // Subtle breathing smile curve in idle
            targetBarY = 0.32 + centerWeight * 0.22 + Math.sin(t * 2.1 + i * 0.5) * 0.06;
          }

          bar.scale.y = THREE.MathUtils.damp(bar.scale.y, targetBarY, 18, delta);
        }

        barMat.color.lerp(_targetEyeColor, Math.min(1, delta * 8));
        barMat.emissive.lerp(_targetEyeColor, Math.min(1, delta * 8));
        barMat.emissiveIntensity = THREE.MathUtils.damp(
          barMat.emissiveIntensity,
          curState === 'muted' ? 0.3 : 1.3 + smoothedEnergy * 1.2,
          10,
          delta
        );

        // Articulated audio wing ear-pods
        const earOffset =
          curState === 'listening'
            ? 0.84 + smoothedEnergy * 0.05
            : curState === 'speaking'
            ? 0.81 + smoothedEnergy * 0.07
            : curState === 'muted'
            ? 0.74
            : 0.78;
        const earTilt =
          curState === 'listening' ? 0.14 : curState === 'speaking' ? 0.08 : 0.0;

        leftEarGroup.position.x = THREE.MathUtils.damp(leftEarGroup.position.x, -earOffset, 10, delta);
        rightEarGroup.position.x = THREE.MathUtils.damp(rightEarGroup.position.x, earOffset, 10, delta);
        leftEarGroup.rotation.z = THREE.MathUtils.damp(leftEarGroup.rotation.z, earTilt, 8, delta);
        rightEarGroup.rotation.z = THREE.MathUtils.damp(rightEarGroup.rotation.z, -earTilt, 8, delta);

        _targetEarGlow.copy(
          curState === 'error'
            ? COLOR_ERROR_CORAL
            : curState === 'muted'
            ? COLOR_MUTED_SLATE
            : curState === 'speaking'
            ? COLOR_CORAL_ACCENT
            : COLOR_COBALT_THINK
        );
        earRingMat.color.lerp(_targetEarGlow, Math.min(1, delta * 8));
        earRingMat.emissive.lerp(_targetEarGlow, Math.min(1, delta * 8));
        earRingMat.emissiveIntensity = THREE.MathUtils.damp(
          earRingMat.emissiveIntensity,
          curState === 'muted' ? 0.25 : 1.1 + smoothedEnergy * 1.2,
          10,
          delta
        );

        // Coral sparkle star subtle rotation & pulse
        starMesh.rotation.z = t * (curState === 'thinking' ? 1.8 : 0.55) + poke * 3.0;
        const starScale =
          1.0 +
          (curState === 'speaking' ? smoothedEnergy * 0.25 : Math.sin(t * 2.5) * 0.06) +
          poke * 0.25;
        starMesh.scale.setScalar(starScale);
        starMat.emissiveIntensity =
          curState === 'muted' ? 0.2 : 0.6 + smoothedEnergy * 0.9 + poke * 0.6;

        // Collar under-glow sync
        collarGlowMat.color.lerp(_targetEyeColor, Math.min(1, delta * 8));
        collarGlowMat.emissive.lerp(_targetEyeColor, Math.min(1, delta * 8));
        collarGlowMat.emissiveIntensity = curState === 'muted' ? 0.3 : 1.1 + smoothedEnergy * 0.8;

        // Orbiting 3D Holographic Energy Halo
        let haloSpeed = 0.7;
        let haloOpacity = 0.72;
        let haloScale = 1.0;

        if (curState === 'thinking' || curState === 'connecting') {
          haloSpeed = 2.4;
          haloOpacity = 0.96;
          _targetHaloCore.copy(COLOR_WHITE_ICE);
          _targetHaloTrail.copy(COLOR_COBALT_THINK);
          haloRotX = THREE.MathUtils.damp(haloRotX, 0.75 + Math.sin(t * 1.4) * 0.45, 5, delta);
        } else if (curState === 'speaking') {
          haloSpeed = 1.8 + smoothedEnergy * 1.4;
          haloOpacity = 0.86 + smoothedEnergy * 0.14;
          haloScale = 1.02 + smoothedEnergy * 0.09;
          _targetHaloCore.copy(COLOR_WHITE_ICE);
          _targetHaloTrail.copy(COLOR_BLUE_TRAIL);
          haloRotX = THREE.MathUtils.damp(haloRotX, 1.08 + Math.sin(t * 2.1) * 0.22, 6, delta);
        } else if (curState === 'listening') {
          haloSpeed = 1.1;
          haloOpacity = 0.85 + smoothedEnergy * 0.12;
          haloScale = 1.0 + smoothedEnergy * 0.06;
          _targetHaloCore.copy(COLOR_CYAN_BRIGHT);
          _targetHaloTrail.copy(COLOR_BLUE_TRAIL);
          haloRotX = THREE.MathUtils.damp(haloRotX, 1.18, 5, delta);
        } else if (curState === 'muted') {
          haloSpeed = 0.25;
          haloOpacity = 0.28;
          _targetHaloCore.copy(COLOR_MUTED_SLATE);
          _targetHaloTrail.copy(COLOR_MUTED_TRAIL);
          haloRotX = THREE.MathUtils.damp(haloRotX, 1.28, 5, delta);
        } else if (curState === 'error') {
          haloSpeed = 0.6;
          haloOpacity = 0.78;
          _targetHaloCore.copy(COLOR_ERROR_CORAL);
          _targetHaloTrail.copy(COLOR_ERROR_TRAIL);
          haloRotX = THREE.MathUtils.damp(haloRotX, 1.1, 5, delta);
        } else {
          _targetHaloCore.copy(COLOR_CYAN_BRIGHT);
          _targetHaloTrail.copy(COLOR_BLUE_TRAIL);
          haloRotX = THREE.MathUtils.damp(haloRotX, 1.16 + Math.sin(t * 0.7) * 0.14, 5, delta);
        }

        haloPhase += delta * haloSpeed * 1.9;
        haloRotY += delta * haloSpeed * 0.85;
        haloGroup.rotation.x = haloRotX;
        haloGroup.rotation.y = haloRotY;
        haloGroup.rotation.z = Math.sin(t * 0.8) * 0.18;
        const curHaloScale = THREE.MathUtils.damp(haloGroup.scale.x, haloScale + poke * 0.1, 10, delta);
        haloGroup.scale.setScalar(curHaloScale);

        haloRingMat.uniforms.uPhase.value = haloPhase;
        haloRingMat.uniforms.uOpacity.value = THREE.MathUtils.damp(
          haloRingMat.uniforms.uOpacity.value,
          haloOpacity,
          8,
          delta
        );
        (haloRingMat.uniforms.uCoreColor.value as THREE.Color).lerp(
          _targetHaloCore,
          Math.min(1, delta * 8)
        );
        (haloRingMat.uniforms.uTrailColor.value as THREE.Color).lerp(
          _targetHaloTrail,
          Math.min(1, delta * 8)
        );
      };

      const afterDraw = (cb: () => void) => {
        if (!renderer || disposed) return;
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (typeof gl.fenceSync === 'function') {
          const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
          gl.flush();
          let polls = 0;
          const poll = () => {
            if (disposed) {
              if (sync) gl.deleteSync(sync);
              return;
            }
            polls += 1;
            const syncState = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
            if (syncState === gl.UNSIGNALED && polls < 20) {
              frameId = window.setTimeout(poll, 5);
            } else {
              if (sync) gl.deleteSync(sync);
              frameId = window.setTimeout(cb, 80);
            }
          };
          frameId = window.setTimeout(poll, 5);
        } else {
          frameId = window.setTimeout(cb, 80);
        }
      };

      const motionFactor = prefersReducedMotion ? 0.35 : 1.0;

      const tick = () => {
        if (disposed || !renderer) return;
        timer.update();
        const delta = Math.max(0, Math.min(timer.getDelta(), 0.05)) * motionFactor;
        elapsed += delta;
        updateScene(delta, elapsed);
        renderer.render(scene, camera);
        if (isSoftwareGl) {
          afterDraw(tick);
        } else {
          frameId = requestAnimationFrame(tick);
        }
      };

      tick();

      return () => {
        disposed = true;
        cancelAnimationFrame(frameId);
        window.clearTimeout(frameId);
        timer.dispose();
        resizeObserver.disconnect();
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);

        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
        textures.forEach((tx) => tx.dispose());
        if (envRenderTarget) {
          envRenderTarget.dispose();
        }
        renderer?.dispose();
        if (container.contains(canvas)) {
          container.removeChild(canvas);
        }
      };
    } catch {
      setFallbackMode(true);
      return () => {
        disposed = true;
        cancelAnimationFrame(frameId);
        window.clearTimeout(frameId);
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
        textures.forEach((tx) => tx.dispose());
        envRenderTarget?.dispose();
        pmremGenerator?.dispose();
        renderer?.dispose();
      };
    }
  }, []);

  // Global subtle pointer tracking when interactive is enabled
  useEffect(() => {
    if (!interactive) {
      pointerTargetRef.current = { x: 0, y: 0 };
      return;
    }

    const handlePointerMove = (e: PointerEvent) => {
      const el = mountRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / 280));
      const ny = Math.max(-1, Math.min(1, -(e.clientY - cy) / 240));
      pointerTargetRef.current = { x: nx, y: ny };
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [interactive]);

  const handleClick = () => {
    if (!interactive) return;
    pokeBoostRef.current = 1.0;
    onActivate?.();
  };

  if (fallbackMode) {
    return (
      <div
        className={`relative flex items-center justify-center rounded-full bg-gradient-to-b from-[#1a233e] to-[#0b1022] border border-sky-400/40 shadow-lg ${containerSizeClass} ${className}`}
        aria-label={`Maria AI (${state})`}
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-3.5 rounded-full bg-sky-300" />
          <span className="w-2.5 h-3.5 rounded-full bg-sky-300" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `Maria AI 3D character (${state})` : undefined}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`relative select-none ${
        interactive ? 'cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-500 rounded-full' : 'pointer-events-none'
      } ${containerSizeClass} ${className}`}
    />
  );
};
