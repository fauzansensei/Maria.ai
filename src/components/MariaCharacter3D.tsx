import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { MariaMood } from '../lib/mariaContextAnalyzer.ts';
import type { SidebarView } from './Sidebar.tsx';

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
  mood?: MariaMood;
  activeView?: SidebarView;
  spyGuardAlert?: boolean;
  energy?: number;
  size?: 'hero' | 'stage' | 'companion' | 'compact';
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

// Pre-allocated scratch colors to guarantee zero GC in the render loop
const _targetAccent = new THREE.Color();
const _targetHaloCore = new THREE.Color();
const _targetHaloTrail = new THREE.Color();

const ACCENT_CYAN = new THREE.Color(0x22d3ee);
const ACCENT_CYAN_BRIGHT = new THREE.Color(0x7dd3fc);
const ACCENT_BLUE = new THREE.Color(0x2563eb);
const ACCENT_CALM_TEAL = new THREE.Color(0x2dd4bf);
const ACCENT_CALM_TRAIL = new THREE.Color(0x0d9488);
const ACCENT_ALERT_RED = new THREE.Color(0xf43f5e);
const ACCENT_ALERT_DARK = new THREE.Color(0xdc2626);
const ACCENT_MUTED = new THREE.Color(0x64748b);
const ACCENT_MUTED_DARK = new THREE.Color(0x334155);
const COLOR_ICE_WHITE = new THREE.Color(0xe0f2fe);

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(34, 211, 238, 0.38)');
    grad.addColorStop(0.5, 'rgba(15, 23, 42, 0.28)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

type FaceExpression =
  | 'normal'
  | 'happy'
  | 'wink'
  | 'celebrate'
  | 'thinking'
  | 'calm'
  | 'muted'
  | 'alert';

function drawVisorFace(
  ctx: CanvasRenderingContext2D,
  expr: FaceExpression,
  blink: number,
  mouthOpen: number,
  gazeX: number,
  gazeY: number,
  accentHex: string
) {
  const w = 256;
  const h = 160;
  ctx.clearRect(0, 0, w, h);

  // Subtle dark OLED screen backing
  ctx.fillStyle = '#040916';
  ctx.fillRect(0, 0, w, h);

  // Very faint ambient vignette in accent hue
  const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, 120);
  bgGrad.addColorStop(0, expr === 'alert' ? 'rgba(244,63,94,0.18)' : 'rgba(34,211,238,0.12)');
  bgGrad.addColorStop(1, 'rgba(4,9,22,0)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  const gx = gazeX * 8;
  const gy = -gazeY * 5;

  ctx.save();
  ctx.strokeStyle = accentHex;
  ctx.fillStyle = accentHex;
  ctx.shadowColor = accentHex;
  ctx.shadowBlur = expr === 'muted' ? 4 : 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const leftX = 86 + gx;
  const rightX = 170 + gx;
  const eyeY = 66 + gy;

  const drawRoundEye = (cx: number, cy: number, rx: number, ry: number) => {
    const squashedRy = Math.max(2.2, ry * (1 - blink * 0.9));
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, squashedRy, 0, 0, Math.PI * 2);
    ctx.fill();
    if (squashedRy > 8 && expr !== 'muted') {
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(cx - rx * 0.3, cy - squashedRy * 0.32, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = accentHex;
      ctx.shadowBlur = 14;
    }
  };

  const drawHappyArch = (cx: number, cy: number) => {
    ctx.lineWidth = 8.5;
    ctx.beginPath();
    ctx.arc(cx, cy + 5, 17, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
  };

  const drawWinkChevron = (cx: number, cy: number, dir: 1 | -1) => {
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(cx - 14 * dir, cy - 11);
    ctx.lineTo(cx + 12 * dir, cy);
    ctx.lineTo(cx - 14 * dir, cy + 11);
    ctx.stroke();
  };

  if (expr === 'celebrate') {
    drawWinkChevron(leftX, eyeY, 1);
    drawWinkChevron(rightX, eyeY, -1);
  } else if (expr === 'wink') {
    drawRoundEye(leftX, eyeY, 15, 17);
    drawWinkChevron(rightX, eyeY, -1);
  } else if (expr === 'happy') {
    drawHappyArch(leftX, eyeY);
    drawHappyArch(rightX, eyeY);
  } else if (expr === 'calm') {
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(leftX, eyeY - 3, 15, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rightX, eyeY - 3, 15, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  } else if (expr === 'thinking') {
    drawRoundEye(leftX, eyeY - 2, 14, 11);
    drawRoundEye(rightX, eyeY - 2, 14, 15);
  } else if (expr === 'muted') {
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(leftX - 14, eyeY + 2);
    ctx.lineTo(leftX + 14, eyeY + 2);
    ctx.moveTo(rightX - 14, eyeY + 2);
    ctx.lineTo(rightX + 14, eyeY + 2);
    ctx.stroke();
  } else if (expr === 'alert') {
    // Sharp angled tactical eyes
    ctx.lineWidth = 8.5;
    ctx.beginPath();
    ctx.moveTo(leftX - 15, eyeY - 10);
    ctx.lineTo(leftX + 15, eyeY + 2);
    ctx.moveTo(rightX + 15, eyeY - 10);
    ctx.lineTo(rightX - 15, eyeY + 2);
    ctx.stroke();
    drawRoundEye(leftX, eyeY + 7, 10, 7);
    drawRoundEye(rightX, eyeY + 7, 10, 7);
  } else {
    drawRoundEye(leftX, eyeY, 15, 17);
    drawRoundEye(rightX, eyeY, 15, 17);
  }

  // Mouth rendering (curved smile or audio-reactive open :D mouth)
  const mouthX = w / 2 + gx * 0.7;
  const mouthY = 108 + gy * 0.6;

  if (expr === 'alert') {
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(mouthX - 20, mouthY + 4);
    ctx.lineTo(mouthX - 7, mouthY - 3);
    ctx.lineTo(mouthX + 7, mouthY + 4);
    ctx.lineTo(mouthX + 20, mouthY - 3);
    ctx.stroke();
  } else if (expr === 'muted') {
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(mouthX - 14, mouthY);
    ctx.lineTo(mouthX + 14, mouthY);
    ctx.stroke();
  } else if (mouthOpen > 0.14 || expr === 'celebrate') {
    const openAmt = expr === 'celebrate' ? Math.max(0.7, mouthOpen) : mouthOpen;
    const mw = 19 + openAmt * 5;
    const mh = 8 + openAmt * 14;
    ctx.beginPath();
    ctx.moveTo(mouthX - mw, mouthY - 3);
    ctx.lineTo(mouthX + mw, mouthY - 3);
    ctx.quadraticCurveTo(mouthX + mw, mouthY + mh, mouthX, mouthY + mh);
    ctx.quadraticCurveTo(mouthX - mw, mouthY + mh, mouthX - mw, mouthY - 3);
    ctx.closePath();
    ctx.fill();
  } else if (expr === 'thinking') {
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(mouthX - 14, mouthY + 2);
    ctx.quadraticCurveTo(mouthX, mouthY - 2, mouthX + 14, mouthY + 2);
    ctx.stroke();
  } else {
    // Classic warm Sparkle smile
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.arc(mouthX, mouthY - 8, 17, Math.PI * 0.18, Math.PI * 0.82);
    ctx.stroke();
  }

  ctx.restore();
}

export const MariaCharacter3D: React.FC<MariaCharacter3DProps> = ({
  state = 'idle',
  mood = 'neutral',
  activeView = 'chat',
  spyGuardAlert = false,
  energy = 0,
  size = 'hero',
  interactive = true,
  onActivate,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);

  const stateRef = useRef<MariaCharacterState>(state);
  const moodRef = useRef<MariaMood>(mood);
  const activeViewRef = useRef<SidebarView>(activeView);
  const spyGuardAlertRef = useRef<boolean>(spyGuardAlert);
  const energyRef = useRef<number>(energy);
  const interactiveRef = useRef<boolean>(interactive);
  const pointerTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pokeBoostRef = useRef<number>(0);

  stateRef.current = state;
  moodRef.current = mood;
  activeViewRef.current = activeView;
  spyGuardAlertRef.current = spyGuardAlert;
  energyRef.current = energy;
  interactiveRef.current = interactive;

  const containerSizeClass =
    size === 'compact'
      ? 'w-12 h-12'
      : size === 'companion'
      ? 'w-36 h-40 sm:w-40 sm:h-44'
      : size === 'stage'
      ? 'w-48 h-52 sm:w-56 sm:h-60'
      : 'w-36 h-40 sm:w-44 sm:h-48';

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
      renderer.toneMappingExposure = 1.12;
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
      camera.position.set(0, 0.18, 5.4);
      camera.lookAt(0, -0.02, 0);

      // 3-Point Studio Lighting Rig
      const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 1.05);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
      keyLight.position.set(-2.5, 3.8, 4.4);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.6);
      rimLight.position.set(2.8, 1.8, -2.5);
      scene.add(rimLight);

      // Shared PBR Materials (with >= 0.25 roughness delta between armor & joints)
      const whiteArmorMat = new THREE.MeshPhysicalMaterial({
        color: 0xf4f7fb,
        roughness: 0.18,
        metalness: 0.12,
        clearcoat: 0.9,
        clearcoatRoughness: 0.1,
      });
      const navyJointMat = new THREE.MeshStandardMaterial({
        color: 0x132043,
        roughness: 0.45,
        metalness: 0.48,
      });
      const metallicTrimMat = new THREE.MeshStandardMaterial({
        color: 0xb8c5d6,
        metalness: 0.85,
        roughness: 0.24,
      });
      const accentGlowMat = new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        emissive: 0x22d3ee,
        emissiveIntensity: 1.6,
        roughness: 0.15,
        metalness: 0.1,
      });
      materials.push(whiteArmorMat, navyJointMat, metallicTrimMat, accentGlowMat);

      // Dynamic Visor Screen CanvasTexture
      const visorCanvas = document.createElement('canvas');
      visorCanvas.width = 256;
      visorCanvas.height = 160;
      const visorCtx = visorCanvas.getContext('2d')!;
      drawVisorFace(visorCtx, 'normal', 0, 0, 0, 0, '#38bdf8');
      const visorTex = new THREE.CanvasTexture(visorCanvas);
      visorTex.colorSpace = THREE.SRGBColorSpace;
      visorTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      textures.push(visorTex);

      const visorScreenMat = new THREE.MeshStandardMaterial({
        map: visorTex,
        emissiveMap: visorTex,
        emissive: 0xffffff,
        emissiveIntensity: 1.15,
        roughness: 0.08,
        metalness: 0.1,
      });
      materials.push(visorScreenMat);

      // Contact shadow beneath boots
      const shadowTex = createContactShadowTexture();
      textures.push(shadowTex);
      const shadowGeo = new THREE.PlaneGeometry(1.75, 1.75);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.68,
      });
      geometries.push(shadowGeo);
      materials.push(shadowMat);
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.set(0, -1.16, 0);
      scene.add(shadowMesh);

      // Root Mascot Assembly (centered bottom-pivot adjusted cleanly)
      const robotRoot = new THREE.Group();
      scene.add(robotRoot);

      // -------------------------------------------------------------
      // 1. TORSO & PELVIS ASSEMBLY
      // -------------------------------------------------------------
      const bodyGroup = new THREE.Group();
      bodyGroup.position.set(0, -0.34, 0);
      robotRoot.add(bodyGroup);

      // Inner navy core waist
      const waistGeo = new THREE.CylinderGeometry(0.27, 0.23, 0.42, 24);
      geometries.push(waistGeo);
      const waistMesh = new THREE.Mesh(waistGeo, navyJointMat);
      waistMesh.position.set(0, -0.06, 0);
      bodyGroup.add(waistMesh);

      // Pearl-white sculpted upper chest armor
      const chestGeo = new THREE.SphereGeometry(0.36, 32, 24);
      geometries.push(chestGeo);
      const chestMesh = new THREE.Mesh(chestGeo, whiteArmorMat);
      chestMesh.scale.set(1.06, 0.82, 0.86);
      chestMesh.position.set(0, 0.08, 0.02);
      bodyGroup.add(chestMesh);

      // Glowing chest core emblem (circle + cyan halo)
      const coreRingGeo = new THREE.TorusGeometry(0.082, 0.015, 12, 32);
      const coreDiscGeo = new THREE.CircleGeometry(0.064, 24);
      geometries.push(coreRingGeo, coreDiscGeo);
      const coreRing = new THREE.Mesh(coreRingGeo, accentGlowMat);
      coreRing.position.set(0, 0.11, 0.315);
      const coreDisc = new THREE.Mesh(coreDiscGeo, navyJointMat);
      coreDisc.position.set(0, 0.11, 0.312);
      bodyGroup.add(coreRing, coreDisc);

      // Glowing collar V-trim
      const collarTrimGeo = new THREE.TorusGeometry(0.24, 0.016, 10, 32, Math.PI * 1.15);
      geometries.push(collarTrimGeo);
      const collarTrim = new THREE.Mesh(collarTrimGeo, accentGlowMat);
      collarTrim.rotation.x = Math.PI / 2 + 0.35;
      collarTrim.rotation.z = -Math.PI * 0.08;
      collarTrim.position.set(0, 0.25, 0.08);
      bodyGroup.add(collarTrim);

      // Backpack thruster pack (back view detail matching Sparkle reference!)
      const packGeo = new THREE.BoxGeometry(0.32, 0.32, 0.14);
      const packGlowGeo = new THREE.PlaneGeometry(0.18, 0.16);
      geometries.push(packGeo, packGlowGeo);
      const packMesh = new THREE.Mesh(packGeo, navyJointMat);
      packMesh.position.set(0, 0.08, -0.28);
      const packGlowMesh = new THREE.Mesh(packGlowGeo, accentGlowMat);
      packGlowMesh.rotation.y = Math.PI;
      packGlowMesh.position.set(0, 0.08, -0.355);
      bodyGroup.add(packMesh, packGlowMesh);

      // -------------------------------------------------------------
      // 2. HEAD & HELMET ASSEMBLY (Oversized Chibi Proportions!)
      // -------------------------------------------------------------
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 0.36, 0);
      bodyGroup.add(headGroup);

      // Pearl-white rounded helmet dome
      const helmetGeo = new THREE.SphereGeometry(0.56, 40, 32);
      geometries.push(helmetGeo);
      const helmetMesh = new THREE.Mesh(helmetGeo, whiteArmorMat);
      helmetMesh.scale.set(1.16, 0.96, 1.0);
      helmetMesh.position.set(0, 0.42, 0);
      headGroup.add(helmetMesh);

      // Navy visor bezel surround (rounded pillow box)
      const bezelGeo = new THREE.SphereGeometry(0.50, 36, 28);
      geometries.push(bezelGeo);
      const bezelMesh = new THREE.Mesh(bezelGeo, navyJointMat);
      bezelMesh.scale.set(1.06, 0.78, 0.56);
      bezelMesh.position.set(0, 0.41, 0.31);
      headGroup.add(bezelMesh);

      // Curved glowing OLED visor screen
      const visorGeo = new THREE.PlaneGeometry(0.78, 0.48, 16, 10);
      // Curve the plane slightly outward to wrap smoothly over the chibi face
      const vPos = visorGeo.attributes.position;
      for (let i = 0; i < vPos.count; i++) {
        const vx = vPos.getX(i);
        const vy = vPos.getY(i);
        const curveZ = -0.14 * (vx * vx * 2.2 + vy * vy * 1.4);
        vPos.setZ(i, curveZ);
      }
      visorGeo.computeVertexNormals();
      geometries.push(visorGeo);
      const visorMesh = new THREE.Mesh(visorGeo, visorScreenMat);
      visorMesh.position.set(0, 0.41, 0.595);
      headGroup.add(visorMesh);

      // Side Ear-Cups (Left & Right with glowing cyan/red rings)
      const earCupGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.11, 28);
      const earRingGeo = new THREE.TorusGeometry(0.145, 0.022, 12, 32);
      geometries.push(earCupGeo, earRingGeo);

      const leftEarGroup = new THREE.Group();
      leftEarGroup.position.set(-0.65, 0.41, 0.0);
      const leftEarCup = new THREE.Mesh(earCupGeo, whiteArmorMat);
      leftEarCup.rotation.z = Math.PI / 2;
      const leftEarCore = new THREE.Mesh(earCupGeo, navyJointMat);
      leftEarCore.scale.set(0.75, 1.08, 0.75);
      leftEarCore.rotation.z = Math.PI / 2;
      const leftEarRing = new THREE.Mesh(earRingGeo, accentGlowMat);
      leftEarRing.rotation.y = Math.PI / 2;
      leftEarRing.position.set(-0.056, 0, 0);
      leftEarGroup.add(leftEarCup, leftEarCore, leftEarRing);
      headGroup.add(leftEarGroup);

      const rightEarGroup = new THREE.Group();
      rightEarGroup.position.set(0.65, 0.41, 0.0);
      const rightEarCup = new THREE.Mesh(earCupGeo, whiteArmorMat);
      rightEarCup.rotation.z = Math.PI / 2;
      const rightEarCore = new THREE.Mesh(earCupGeo, navyJointMat);
      rightEarCore.scale.set(0.75, 1.08, 0.75);
      rightEarCore.rotation.z = Math.PI / 2;
      const rightEarRing = new THREE.Mesh(earRingGeo, accentGlowMat);
      rightEarRing.rotation.y = Math.PI / 2;
      rightEarRing.position.set(0.056, 0, 0);
      rightEarGroup.add(rightEarCup, rightEarCore, rightEarRing);
      headGroup.add(rightEarGroup);

      // Top Antenna & Glowing 4-Point Star (Sparkle's signature!)
      const antennaGroup = new THREE.Group();
      antennaGroup.position.set(0, 0.95, 0.02);
      headGroup.add(antennaGroup);

      const stalkBaseGeo = new THREE.CylinderGeometry(0.065, 0.09, 0.07, 20);
      const stalkGeo = new THREE.CylinderGeometry(0.018, 0.025, 0.18, 14);
      geometries.push(stalkBaseGeo, stalkGeo);
      const stalkBase = new THREE.Mesh(stalkBaseGeo, navyJointMat);
      const stalkMesh = new THREE.Mesh(stalkGeo, metallicTrimMat);
      stalkMesh.position.set(0, 0.11, 0);
      antennaGroup.add(stalkBase, stalkMesh);

      const starShape = new THREE.Shape();
      const sR = 0.145;
      starShape.moveTo(0, sR);
      starShape.quadraticCurveTo(0, 0, sR, 0);
      starShape.quadraticCurveTo(0, 0, 0, -sR);
      starShape.quadraticCurveTo(0, 0, -sR, 0);
      starShape.quadraticCurveTo(0, 0, 0, sR);
      const starGeo = new THREE.ExtrudeGeometry(starShape, {
        depth: 0.032,
        bevelEnabled: true,
        bevelThickness: 0.014,
        bevelSize: 0.012,
        bevelSegments: 3,
      });
      starGeo.center();
      geometries.push(starGeo);
      const starMesh = new THREE.Mesh(starGeo, accentGlowMat);
      starMesh.position.set(0, 0.27, 0);
      antennaGroup.add(starMesh);

      // -------------------------------------------------------------
      // 3. ARTICULATED ARMS, HANDS & DYNAMIC PROPS
      // -------------------------------------------------------------
      const shoulderGeo = new THREE.SphereGeometry(0.095, 18, 16);
      const upperArmGeo = new THREE.CapsuleGeometry(0.062, 0.14, 8, 14);
      const forearmGeo = new THREE.CapsuleGeometry(0.082, 0.14, 10, 16);
      const handGeo = new THREE.SphereGeometry(0.092, 18, 16);
      const thumbGeo = new THREE.CapsuleGeometry(0.028, 0.055, 6, 10);
      geometries.push(shoulderGeo, upperArmGeo, forearmGeo, handGeo, thumbGeo);

      // Left Arm (can point at Notebook/Projects or celebrate!)
      const leftArmPivot = new THREE.Group();
      leftArmPivot.position.set(-0.37, 0.17, 0.02);
      bodyGroup.add(leftArmPivot);

      const leftShoulder = new THREE.Mesh(shoulderGeo, navyJointMat);
      const leftUpperArm = new THREE.Mesh(upperArmGeo, navyJointMat);
      leftUpperArm.position.set(0, -0.1, 0);
      const leftForearmPivot = new THREE.Group();
      leftForearmPivot.position.set(0, -0.2, 0);
      const leftForearm = new THREE.Mesh(forearmGeo, whiteArmorMat);
      leftForearm.position.set(0, -0.11, 0);
      const leftHand = new THREE.Mesh(handGeo, whiteArmorMat);
      leftHand.position.set(0, -0.24, 0.02);
      leftForearmPivot.add(leftForearm, leftHand);
      leftArmPivot.add(leftShoulder, leftUpperArm, leftForearmPivot);

      // Right Arm (can wave, thumbs-up, think, hold wrench or notebook!)
      const rightArmPivot = new THREE.Group();
      rightArmPivot.position.set(0.37, 0.17, 0.02);
      bodyGroup.add(rightArmPivot);

      const rightShoulder = new THREE.Mesh(shoulderGeo, navyJointMat);
      const rightUpperArm = new THREE.Mesh(upperArmGeo, navyJointMat);
      rightUpperArm.position.set(0, -0.1, 0);
      const rightForearmPivot = new THREE.Group();
      rightForearmPivot.position.set(0, -0.2, 0);
      const rightForearm = new THREE.Mesh(forearmGeo, whiteArmorMat);
      rightForearm.position.set(0, -0.11, 0);
      const rightHand = new THREE.Mesh(handGeo, whiteArmorMat);
      rightHand.position.set(0, -0.24, 0.02);
      const rightThumb = new THREE.Mesh(thumbGeo, whiteArmorMat);
      rightThumb.position.set(-0.04, -0.17, 0.05);
      rightThumb.rotation.z = 0.25;
      rightForearmPivot.add(rightForearm, rightHand, rightThumb);
      rightArmPivot.add(rightShoulder, rightUpperArm, rightForearmPivot);

      // PROP A: Holographic Cyan Wrench (for coding / debugging pose #3!)
      const wrenchGroup = new THREE.Group();
      wrenchGroup.position.set(0.02, -0.26, 0.09);
      wrenchGroup.rotation.set(0.3, 0, -0.35);
      wrenchGroup.scale.setScalar(0.001);
      rightForearmPivot.add(wrenchGroup);

      const wrenchShaftGeo = new THREE.BoxGeometry(0.055, 0.42, 0.032);
      const wrenchHeadGeo = new THREE.TorusGeometry(0.085, 0.028, 10, 24, Math.PI * 1.45);
      geometries.push(wrenchShaftGeo, wrenchHeadGeo);
      const wrenchShaft = new THREE.Mesh(wrenchShaftGeo, accentGlowMat);
      const wrenchHead = new THREE.Mesh(wrenchHeadGeo, accentGlowMat);
      wrenchHead.position.set(0, 0.23, 0);
      wrenchHead.rotation.z = Math.PI * 0.78;
      wrenchGroup.add(wrenchShaft, wrenchHead);

      // PROP B: Holographic Notebook / Project Tablet (for Notebook / Projects view!)
      const tabletGroup = new THREE.Group();
      tabletGroup.position.set(0.04, -0.24, 0.14);
      tabletGroup.rotation.set(-0.4, -0.3, 0.1);
      tabletGroup.scale.setScalar(0.001);
      rightForearmPivot.add(tabletGroup);

      const tabletFrameGeo = new THREE.BoxGeometry(0.28, 0.34, 0.024);
      const tabletScreenGeo = new THREE.PlaneGeometry(0.23, 0.28);
      const tabletLineGeo = new THREE.BoxGeometry(0.16, 0.022, 0.01);
      geometries.push(tabletFrameGeo, tabletScreenGeo, tabletLineGeo);

      const tabletFrame = new THREE.Mesh(tabletFrameGeo, navyJointMat);
      const tabletScreen = new THREE.Mesh(tabletScreenGeo, accentGlowMat);
      tabletScreen.position.set(0, 0, 0.014);
      const tLine1 = new THREE.Mesh(tabletLineGeo, whiteArmorMat);
      tLine1.position.set(0, 0.06, 0.018);
      const tLine2 = new THREE.Mesh(tabletLineGeo, whiteArmorMat);
      tLine2.scale.set(0.75, 1, 1);
      tLine2.position.set(-0.02, 0.0, 0.018);
      const tLine3 = new THREE.Mesh(tabletLineGeo, whiteArmorMat);
      tLine3.scale.set(0.9, 1, 1);
      tLine3.position.set(0, -0.06, 0.018);
      tabletGroup.add(tabletFrame, tabletScreen, tLine1, tLine2, tLine3);

      // -------------------------------------------------------------
      // 4. ARTICULATED LEGS & BOOTS (with glowing sole rings!)
      // -------------------------------------------------------------
      const thighGeo = new THREE.CapsuleGeometry(0.088, 0.16, 8, 16);
      const bootGeo = new THREE.SphereGeometry(0.135, 22, 18);
      const soleRingGeo = new THREE.TorusGeometry(0.095, 0.018, 10, 28);
      geometries.push(thighGeo, bootGeo, soleRingGeo);

      const createLeg = (side: -1 | 1) => {
        const legPivot = new THREE.Group();
        legPivot.position.set(side * 0.165, -0.22, 0);

        const thigh = new THREE.Mesh(thighGeo, navyJointMat);
        thigh.position.set(0, -0.14, 0);

        const shin = new THREE.Mesh(bootGeo, whiteArmorMat);
        shin.scale.set(0.95, 1.05, 1.15);
        shin.position.set(0, -0.34, 0.02);

        const bootBase = new THREE.Mesh(bootGeo, navyJointMat);
        bootBase.scale.set(1.02, 0.58, 1.25);
        bootBase.position.set(0, -0.45, 0.045);

        const soleGlow = new THREE.Mesh(soleRingGeo, accentGlowMat);
        soleGlow.rotation.x = Math.PI / 2;
        soleGlow.position.set(0, -0.505, 0.045);

        legPivot.add(thigh, shin, bootBase, soleGlow);
        return legPivot;
      };

      const leftLegPivot = createLeg(-1);
      const rightLegPivot = createLeg(1);
      bodyGroup.add(leftLegPivot, rightLegPivot);

      // -------------------------------------------------------------
      // 5. FLOATING CELEBRATION SPARKLES & ORBITAL HALO / RADAR RING
      // -------------------------------------------------------------
      const sparkleGroup = new THREE.Group();
      sparkleGroup.position.set(0, 1.05, 0);
      sparkleGroup.scale.setScalar(0.001);
      robotRoot.add(sparkleGroup);

      const miniStarGeo = new THREE.ExtrudeGeometry(starShape, {
        depth: 0.015,
        bevelEnabled: false,
      });
      miniStarGeo.center();
      geometries.push(miniStarGeo);

      const miniSparkles: THREE.Mesh[] = [];
      const sparkleOffsets = [
        [-0.78, 0.12, 0.18],
        [0.82, 0.22, 0.12],
        [-0.56, 0.44, -0.12],
        [0.62, -0.06, 0.24],
      ];
      for (let i = 0; i < sparkleOffsets.length; i++) {
        const sp = new THREE.Mesh(miniStarGeo, accentGlowMat);
        sp.scale.setScalar(0.45);
        sp.position.set(sparkleOffsets[i][0], sparkleOffsets[i][1], sparkleOffsets[i][2]);
        sparkleGroup.add(sp);
        miniSparkles.push(sp);
      }

      // Orbiting 3D Halo / Spy Guard Radar Ring
      const haloGroup = new THREE.Group();
      haloGroup.position.set(0, -0.15, 0);
      robotRoot.add(haloGroup);

      const haloRingGeo = new THREE.TorusGeometry(1.06, 0.028, 16, 88);
      const haloRingMat = new THREE.ShaderMaterial({
        uniforms: {
          uPhase: { value: 0 },
          uOpacity: { value: 0.72 },
          uFocusPower: { value: 2.8 },
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
      let haloRotY = 0.2;
      let haloRotX = 1.28;
      let blinkTimer = 2.4;
      let blinkAmount = 0;
      let smoothedEnergy = 0;
      let lastFaceKey = '';
      let lastDrawAt = -1;

      const updateScene = (delta: number, t: number) => {
        const curState = stateRef.current;
        const curMood = moodRef.current;
        const curView = activeViewRef.current;
        const isAlert =
          spyGuardAlertRef.current || curMood === 'alert' || curState === 'error';
        const rawEnergy = Math.max(0, Math.min(1, energyRef.current));

        const syntheticSpeechWave =
          curState === 'speaking'
            ? 0.3 +
              0.25 * Math.abs(Math.sin(t * 10.2)) +
              0.18 * Math.abs(Math.sin(t * 16.4 + 1.1))
            : 0;
        const targetEnergy =
          curState === 'speaking'
            ? Math.max(rawEnergy, syntheticSpeechWave * 0.78)
            : curState === 'listening'
            ? rawEnergy
            : 0;

        smoothedEnergy = THREE.MathUtils.damp(smoothedEnergy, targetEnergy, 14, delta);
        pokeBoostRef.current = THREE.MathUtils.damp(pokeBoostRef.current, 0, 5.2, delta);
        const poke = pokeBoostRef.current;

        // Blink scheduler
        blinkTimer -= delta;
        if (blinkTimer <= 0) {
          blinkAmount = 1.0;
          blinkTimer = 2.6 + Math.random() * 2.4;
        }
        blinkAmount = THREE.MathUtils.damp(blinkAmount, 0, 15, delta);

        // Determine Accent Color Palette (Cyan / Calm Teal / Spy Guard Crimson Red / Muted)
        let accentHex = '#38bdf8';
        if (isAlert) {
          _targetAccent.copy(ACCENT_ALERT_RED);
          _targetHaloCore.copy(ACCENT_ALERT_RED);
          _targetHaloTrail.copy(ACCENT_ALERT_DARK);
          accentHex = '#fb7185';
        } else if (curState === 'muted') {
          _targetAccent.copy(ACCENT_MUTED);
          _targetHaloCore.copy(ACCENT_MUTED);
          _targetHaloTrail.copy(ACCENT_MUTED_DARK);
          accentHex = '#64748b';
        } else if (curMood === 'calm') {
          _targetAccent.copy(ACCENT_CALM_TEAL);
          _targetHaloCore.copy(ACCENT_CALM_TEAL);
          _targetHaloTrail.copy(ACCENT_CALM_TRAIL);
          accentHex = '#5eead4';
        } else {
          _targetAccent.copy(ACCENT_CYAN);
          _targetHaloCore.copy(COLOR_ICE_WHITE);
          _targetHaloTrail.copy(ACCENT_BLUE);
          accentHex = '#38bdf8';
        }

        accentGlowMat.color.lerp(_targetAccent, Math.min(1, delta * 9));
        accentGlowMat.emissive.lerp(_targetAccent, Math.min(1, delta * 9));
        accentGlowMat.emissiveIntensity = isAlert
          ? 1.85 + 0.75 * Math.sin(t * 9.0)
          : curState === 'muted'
          ? 0.45
          : 1.45 + smoothedEnergy * 1.1;

        rimLight.color.lerp(_targetAccent, Math.min(1, delta * 7));

        // -----------------------------------------------------------
        // POSE & KINEMATICS CHOREOGRAPHY
        // -----------------------------------------------------------
        const isNotebookOrProject = curView === 'notebooks' || curView === 'projects';
        const isThinking = curState === 'thinking' || curState === 'connecting';

        const lookX = interactiveRef.current ? pointerTargetRef.current.x : 0;
        const lookY = interactiveRef.current ? pointerTargetRef.current.y : 0;

        // Root bounce & height
        let floatSpeed = 2.0;
        let floatAmp = 0.04;
        let baseY = 0;

        if (curMood === 'celebrating') {
          floatSpeed = 5.4;
          floatAmp = 0.095;
          baseY = 0.06;
        } else if (isAlert) {
          floatSpeed = 4.2;
          floatAmp = 0.025;
        } else if (curMood === 'calm') {
          floatSpeed = 1.25;
          floatAmp = 0.025;
        } else if (curState === 'speaking') {
          floatSpeed = 3.5;
          floatAmp = 0.038 + smoothedEnergy * 0.03;
        }

        robotRoot.position.y = baseY + Math.sin(t * floatSpeed) * floatAmp + poke * 0.14;
        const shadowScale = 1.0 - robotRoot.position.y * 0.65;
        shadowMesh.scale.setScalar(shadowScale);
        shadowMat.opacity = curState === 'muted' ? 0.35 : 0.65;

        // Body Yaw & Head Gaze
        let targetBodyYaw = lookX * 0.18;
        let targetHeadYaw = lookX * 0.32;
        let targetHeadPitch = -lookY * 0.2;
        let targetHeadRoll = -lookX * 0.06;

        // Arm & Leg Targets
        let lArmX = 0.1 + Math.sin(t * 2.0) * 0.05;
        let lArmZ = 0.22;
        let lForeX = -0.25;

        let rArmX = 0.1 - Math.sin(t * 2.0) * 0.05;
        let rArmZ = -0.22;
        let rForeX = -0.25;

        let lLegX = Math.sin(t * 2.0) * 0.04;
        let lLegZ = 0.04;
        let rLegX = -Math.sin(t * 2.0) * 0.04;
        let rLegZ = -0.04;

        let targetWrenchScale = 0.001;
        let targetTabletScale = 0.001;
        let targetSparkleScale = 0.001;

        if (isAlert) {
          // Spy Guard Red Alert Defensive Scan Pose
          targetHeadYaw += Math.sin(t * 3.8) * 0.35;
          targetHeadPitch += 0.06;
          lArmX = -0.75;
          lArmZ = 0.55;
          lForeX = -0.85;
          rArmX = -0.75;
          rArmZ = -0.55;
          rForeX = -0.85;
          lLegZ = 0.16;
          rLegZ = -0.16;
        } else if (isNotebookOrProject) {
          // Pointing toward Sidebar / Notebook / Project Menu + Holding Holographic Tablet!
          targetBodyYaw = -0.34;
          targetHeadYaw = -0.28 + lookX * 0.18;
          targetHeadRoll = 0.07;
          // Left arm points toward left menu/workspace
          lArmX = -0.45;
          lArmZ = 1.25 + Math.sin(t * 3.0) * 0.08;
          lForeX = -0.1;
          // Right arm holds glowing holographic Notebook/Project tablet forward
          rArmX = -0.75;
          rArmZ = -0.25;
          rForeX = -0.65;
          targetTabletScale = 1.0;
        } else if (curMood === 'celebrating') {
          // Pose 4: SUKA MERAYAKAN! Both arms raised high + playful knee kick!
          targetHeadPitch -= 0.1;
          targetHeadRoll += Math.sin(t * 4.5) * 0.08;
          lArmX = -0.25;
          lArmZ = 2.45 + Math.sin(t * 6.0) * 0.12;
          lForeX = -0.25;
          rArmX = -0.25;
          rArmZ = -2.45 - Math.sin(t * 6.0) * 0.12;
          rForeX = -0.25;
          lLegX = -0.35 + Math.sin(t * 5.4) * 0.25;
          rLegX = 0.2 - Math.sin(t * 5.4) * 0.25;
          targetSparkleScale = 1.0;
        } else if (curMood === 'coding') {
          if (isThinking) {
            // Hand to chin thinking while holding wrench in other hand
            targetHeadRoll += 0.12;
            targetHeadPitch -= 0.06;
            rArmX = -1.15;
            rArmZ = 0.25;
            rForeX = -1.25;
            lArmX = -0.35;
            lArmZ = 0.35;
            lForeX = -0.5;
          } else {
            // Pose 3: SIAP MEMBANTU! Holding glowing cyan wrench cheerfully!
            targetHeadRoll -= 0.06;
            rArmX = -0.85 + Math.sin(t * 3.0) * 0.08;
            rArmZ = -0.45;
            rForeX = -0.75;
            lArmX = 0.15;
            lArmZ = 0.28;
            lForeX = -0.4;
            targetWrenchScale = 1.0;
          }
        } else if (curMood === 'idea') {
          // Pose 2: IDE CERDAS! Winking & right hand thumbs-up / raised!
          targetHeadRoll -= 0.09;
          rArmX = -1.05;
          rArmZ = -0.35;
          rForeX = -0.85;
          lArmX = 0.12;
          lArmZ = 0.25;
          targetSparkleScale = 0.78;
        } else if (curMood === 'calm') {
          // Gentle calming comforting posture
          targetHeadRoll += 0.06;
          targetHeadPitch += 0.05;
          lArmX = -0.25;
          lArmZ = 0.22;
          lForeX = -0.45;
          rArmX = -0.25;
          rArmZ = -0.22;
          rForeX = -0.45;
        } else if (curState === 'speaking' || curMood === 'explaining') {
          // Expressive explaining hand gestures synced to voice cadence
          const wave = Math.sin(t * 5.2);
          targetHeadPitch += Math.sin(t * 6.8) * (0.03 + smoothedEnergy * 0.05);
          targetHeadRoll += Math.sin(t * 2.8) * 0.06;
          lArmX = -0.45 + wave * (0.18 + smoothedEnergy * 0.25);
          lArmZ = 0.42 + smoothedEnergy * 0.2;
          lForeX = -0.65;
          rArmX = -0.55 - wave * (0.18 + smoothedEnergy * 0.25);
          rArmZ = -0.42 - smoothedEnergy * 0.2;
          rForeX = -0.65;
        } else if (isThinking) {
          // General thinking pose (hand near chin + gentle glance)
          targetHeadYaw += Math.sin(t * 1.6) * 0.18;
          targetHeadRoll += 0.1;
          rArmX = -1.1;
          rArmZ = 0.22;
          rForeX = -1.25;
        } else if (curState === 'listening') {
          targetHeadRoll += 0.1;
          lArmX = -0.2;
          lArmZ = 0.34;
          rArmX = -0.2;
          rArmZ = -0.34;
        } else if (curState === 'muted') {
          targetHeadPitch += 0.14;
          lArmZ = 0.16;
          rArmZ = -0.16;
        }

        // Playful wave on click/tap
        if (poke > 0.05) {
          rArmX = THREE.MathUtils.lerp(rArmX, -0.4, poke);
          rArmZ = THREE.MathUtils.lerp(rArmZ, -2.2 - Math.sin(t * 16.0) * 0.35, poke);
          targetHeadPitch -= Math.sin(poke * Math.PI) * 0.2;
        }

        bodyGroup.rotation.y = THREE.MathUtils.damp(bodyGroup.rotation.y, targetBodyYaw, 6, delta);
        headGroup.rotation.y = THREE.MathUtils.damp(headGroup.rotation.y, targetHeadYaw, 7, delta);
        headGroup.rotation.x = THREE.MathUtils.damp(headGroup.rotation.x, targetHeadPitch, 7, delta);
        headGroup.rotation.z = THREE.MathUtils.damp(headGroup.rotation.z, targetHeadRoll, 7, delta);

        leftArmPivot.rotation.x = THREE.MathUtils.damp(leftArmPivot.rotation.x, lArmX, 8, delta);
        leftArmPivot.rotation.z = THREE.MathUtils.damp(leftArmPivot.rotation.z, lArmZ, 8, delta);
        leftForearmPivot.rotation.x = THREE.MathUtils.damp(leftForearmPivot.rotation.x, lForeX, 8, delta);

        rightArmPivot.rotation.x = THREE.MathUtils.damp(rightArmPivot.rotation.x, rArmX, 8, delta);
        rightArmPivot.rotation.z = THREE.MathUtils.damp(rightArmPivot.rotation.z, rArmZ, 8, delta);
        rightForearmPivot.rotation.x = THREE.MathUtils.damp(rightForearmPivot.rotation.x, rForeX, 8, delta);

        leftLegPivot.rotation.x = THREE.MathUtils.damp(leftLegPivot.rotation.x, lLegX, 8, delta);
        leftLegPivot.rotation.z = THREE.MathUtils.damp(leftLegPivot.rotation.z, lLegZ, 8, delta);
        rightLegPivot.rotation.x = THREE.MathUtils.damp(rightLegPivot.rotation.x, rLegX, 8, delta);
        rightLegPivot.rotation.z = THREE.MathUtils.damp(rightLegPivot.rotation.z, rLegZ, 8, delta);

        // Smooth prop scale transitions
        const curWrenchScale = THREE.MathUtils.damp(wrenchGroup.scale.x, targetWrenchScale, 10, delta);
        wrenchGroup.scale.setScalar(curWrenchScale);
        wrenchGroup.visible = curWrenchScale > 0.02;

        const curTabletScale = THREE.MathUtils.damp(tabletGroup.scale.x, targetTabletScale, 10, delta);
        tabletGroup.scale.setScalar(curTabletScale);
        tabletGroup.visible = curTabletScale > 0.02;

        const curSparkleScale = THREE.MathUtils.damp(sparkleGroup.scale.x, targetSparkleScale, 10, delta);
        sparkleGroup.scale.setScalar(curSparkleScale);
        sparkleGroup.visible = curSparkleScale > 0.02;
        if (sparkleGroup.visible) {
          sparkleGroup.rotation.y = t * 1.1;
          for (let i = 0; i < miniSparkles.length; i++) {
            miniSparkles[i].rotation.z = t * 2.4 + i;
          }
        }

        // Star Antenna spin & spring bob
        starMesh.rotation.y = t * (isThinking ? 2.4 : 0.8) + poke * 4.0;
        antennaGroup.rotation.z = Math.sin(t * 3.0) * 0.06 - targetHeadRoll * 0.4;

        // -----------------------------------------------------------
        // DYNAMIC VISOR EXPRESSION DRAWING (CanvasTexture)
        // -----------------------------------------------------------
        let expr: FaceExpression = 'normal';
        if (isAlert) expr = 'alert';
        else if (curState === 'muted') expr = 'muted';
        else if (curMood === 'celebrating' || poke > 0.25) expr = 'celebrate';
        else if (curMood === 'idea') expr = 'wink';
        else if (curMood === 'calm') expr = 'calm';
        else if (isThinking) expr = 'thinking';
        else if (curState === 'speaking' || curMood === 'explaining' || curMood === 'coding') {
          expr = 'happy';
        }

        const mouthOpen =
          curState === 'speaking'
            ? Math.min(1, 0.22 + smoothedEnergy * 0.95)
            : curMood === 'celebrating'
            ? 0.85
            : 0;

        // Quantize subtle values so we redraw only when visibly changed (~24-30fps cap)
        const faceKey = `${expr}|${Math.round(blinkAmount * 8)}|${Math.round(mouthOpen * 10)}|${Math.round(lookX * 6)}|${Math.round(lookY * 6)}|${accentHex}`;
        if (faceKey !== lastFaceKey && (lastDrawAt < 0 || t - lastDrawAt > 0.032)) {
          drawVisorFace(visorCtx, expr, blinkAmount, mouthOpen, lookX, lookY, accentHex);
          visorTex.needsUpdate = true;
          lastFaceKey = faceKey;
          lastDrawAt = t;
        }

        // -----------------------------------------------------------
        // ORBITING 3D HALO / SPY GUARD RADAR RING
        // -----------------------------------------------------------
        let haloSpeed = 0.7;
        let haloOpacity = 0.65;
        let haloScale = 1.0;

        if (isAlert) {
          haloSpeed = 3.2;
          haloOpacity = 0.95;
          haloScale = 1.05 + 0.08 * Math.sin(t * 7.0);
          haloRotX = THREE.MathUtils.damp(haloRotX, 1.48, 8, delta);
        } else if (isThinking) {
          haloSpeed = 2.4;
          haloOpacity = 0.9;
          haloRotX = THREE.MathUtils.damp(haloRotX, 0.85 + Math.sin(t * 1.4) * 0.35, 5, delta);
        } else if (curState === 'speaking') {
          haloSpeed = 1.8 + smoothedEnergy * 1.2;
          haloOpacity = 0.82 + smoothedEnergy * 0.16;
          haloScale = 1.0 + smoothedEnergy * 0.08;
          haloRotX = THREE.MathUtils.damp(haloRotX, 1.24, 6, delta);
        } else if (curState === 'muted') {
          haloSpeed = 0.25;
          haloOpacity = 0.25;
        } else {
          haloRotX = THREE.MathUtils.damp(haloRotX, 1.28 + Math.sin(t * 0.7) * 0.1, 5, delta);
        }

        haloPhase += delta * haloSpeed * 1.9;
        haloRotY += delta * haloSpeed * 0.85;
        haloGroup.rotation.x = haloRotX;
        haloGroup.rotation.y = haloRotY;
        haloGroup.rotation.z = Math.sin(t * 0.8) * 0.14;
        const curHaloScale = THREE.MathUtils.damp(haloGroup.scale.x, haloScale + poke * 0.08, 10, delta);
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
        className={`relative flex items-center justify-center rounded-full border shadow-lg ${
          spyGuardAlert
            ? 'bg-gradient-to-b from-rose-950 to-slate-950 border-rose-500/60'
            : 'bg-gradient-to-b from-[#1a233e] to-[#0b1022] border-sky-400/40'
        } ${containerSizeClass} ${className}`}
        aria-label={`Maria AI (${state})`}
      >
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-3.5 rounded-full ${spyGuardAlert ? 'bg-rose-400' : 'bg-sky-300'}`} />
          <span className={`w-2.5 h-3.5 rounded-full ${spyGuardAlert ? 'bg-rose-400' : 'bg-sky-300'}`} />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `Maria AI 3D character (${state}, ${mood})` : undefined}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`relative select-none ${
        interactive ? 'cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-500 rounded-2xl' : 'pointer-events-none'
      } ${containerSizeClass} ${className}`}
    />
  );
};
