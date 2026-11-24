import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface MariaOrb3DProps {
  className?: string;
}

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

const CORE_VERTEX_SHADER = /* glsl */ `
  varying vec3 vLocalPos;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;

  void main() {
    vLocalPos = normalize(position);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewPos = -mvPos.xyz;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const CORE_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  varying vec3 vLocalPos;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;

  float hash31(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise3(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(
        mix(hash31(i + vec3(0.0, 0.0, 0.0)), hash31(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), f.x),
        f.y
      ),
      mix(
        mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.0, 1.0)), f.x),
        f.y
      ),
      f.z
    );
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * noise3(p);
      p = p * 2.05 + vec3(1.7, 9.2, 4.3);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 N = normalize(vViewNormal);
    vec3 V = normalize(vViewPos);
    float ndotv = clamp(dot(N, V), 0.0, 1.0);

    // 3D Fresnel rim lighting
    float fresnel = pow(1.0 - ndotv, 2.15);
    float tightRim = pow(1.0 - ndotv, 4.2);

    // Swirling 3D energy lattice / plasma inside the dark glass globe
    vec3 samplePos = vLocalPos * 2.75 + vec3(uTime * 0.28, -uTime * 0.22, uTime * 0.19);
    float n1 = fbm(samplePos);
    float n2 = fbm(samplePos * 1.6 - vec3(uTime * 0.2, uTime * 0.14, -uTime * 0.24));
    float caustic = pow(clamp(1.0 - abs(n1 - n2) * 3.4, 0.0, 1.0), 2.4);

    // Subtle spherical meridian / wave interference for cyber-orb texture
    float wave = 0.5 + 0.5 * sin(vLocalPos.y * 9.0 + n1 * 4.5 - uTime * 2.2);
    float energyField = caustic * 0.65 + wave * 0.16 * n1;

    vec3 deepCore = vec3(0.010, 0.022, 0.068);
    vec3 midCobalt = vec3(0.065, 0.26, 0.78);
    vec3 electricCyan = vec3(0.28, 0.74, 1.0);
    vec3 brightIce = vec3(0.86, 0.96, 1.0);

    // Build interior volumetric shading (darker center, glowing outer shell)
    vec3 color = mix(deepCore, midCobalt, energyField * (0.35 + 0.65 * fresnel));
    color = mix(color, electricCyan, fresnel * 0.82);
    color = mix(color, brightIce, tightRim * 0.92);

    // Subtle 3D studio key-light specular highlight
    vec3 keyDir = normalize(vec3(-0.45, 0.65, 0.78));
    vec3 halfVec = normalize(keyDir + V);
    float spec = pow(max(dot(N, halfVec), 0.0), 34.0);
    color += brightIce * spec * 0.35;

    // Gentle internal luminous breathing pulse
    float pulse = 0.85 + 0.15 * sin(uTime * 2.4);
    color += midCobalt * (1.0 - ndotv) * 0.18 * pulse;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const RING_VERTEX_SHADER = /* glsl */ `
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

const RING_FRAGMENT_SHADER = /* glsl */ `
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

    // Angular sweep around the 3D torus ring
    float angle = atan(vLocalPos.y, vLocalPos.x);
    float directional = 0.5 + 0.5 * cos(angle - uPhase);

    // Bright comet crest + long sweeping tail
    float cometHead = pow(directional, uFocusPower);
    float cometBody = smoothstep(0.14, 0.95, directional);

    vec3 color = mix(uTrailColor, uCoreColor, cometHead);
    color += vec3(1.0) * pow(directional, uFocusPower * 1.9) * 0.55;

    float alpha = cometBody * tubeSoft * uOpacity;
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  }
`;

const AURA_VERTEX_SHADER = /* glsl */ `
  varying vec3 vViewNormal;
  varying vec3 vViewPos;

  void main() {
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewPos = -mvPos.xyz;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const AURA_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;

  void main() {
    vec3 N = normalize(vViewNormal);
    vec3 V = normalize(vViewPos);
    // BackSide sphere: dot(N, V) is negative on facing interior, 0 at silhouette edge
    float edge = clamp(1.0 - abs(dot(N, V)), 0.0, 1.0);
    float halo = pow(1.0 - edge, 2.2) * smoothstep(0.0, 0.48, edge);
    float pulse = 0.86 + 0.14 * sin(uTime * 2.1);

    vec3 auraColor = mix(vec3(0.14, 0.45, 0.98), vec3(0.45, 0.85, 1.0), 0.5);
    float alpha = halo * 0.58 * pulse;
    if (alpha < 0.005) discard;

    gl_FragColor = vec4(auraColor, alpha);
  }
`;

export const MariaOrb3D: React.FC<MariaOrb3DProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);

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

      const initialWidth = Math.max(container.clientWidth, 40);
      const initialHeight = Math.max(container.clientHeight, 40);
      renderer.setSize(initialWidth, initialHeight, false);

      const canvas = renderer.domElement;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      canvas.style.pointerEvents = 'none';

      container.innerHTML = '';
      container.appendChild(canvas);

      const scene = new THREE.Scene();

      // Mandatory Studio Environment Reflection (RoomEnvironment)
      pmremGenerator = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      envRenderTarget = pmremGenerator.fromScene(roomEnv, 0.04);
      scene.environment = envRenderTarget.texture;
      roomEnv.dispose();
      pmremGenerator.dispose();
      pmremGenerator = null;

      const camera = new THREE.PerspectiveCamera(34, initialWidth / initialHeight, 0.1, 20);
      camera.position.set(0, 0, 4.35);

      // Balanced 3-point lighting for glossy glass rim layer
      const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x09132e, 0.9);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xe0f2fe, 1.8);
      keyLight.position.set(-2.5, 3.0, 4.0);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
      rimLight.position.set(2.8, -2.0, -2.2);
      scene.add(rimLight);

      // Root 3D Orb Assembly
      const orbRoot = new THREE.Group();
      scene.add(orbRoot);

      // 1. Dark Volumetric Energy Core Sphere
      const coreGeo = new THREE.SphereGeometry(0.84, 48, 48);
      const coreMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
        },
        vertexShader: CORE_VERTEX_SHADER,
        fragmentShader: CORE_FRAGMENT_SHADER,
      });
      geometries.push(coreGeo);
      materials.push(coreMat);
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.renderOrder = 1;
      orbRoot.add(coreMesh);

      // 2. Subtle Glass Specular Shell (uses RoomEnvironment reflections)
      const glassGeo = new THREE.SphereGeometry(0.858, 40, 40);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0x0a1c44),
        roughness: 0.12,
        metalness: 0.15,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      });
      geometries.push(glassGeo);
      materials.push(glassMat);
      const glassMesh = new THREE.Mesh(glassGeo, glassMat);
      glassMesh.renderOrder = 2;
      orbRoot.add(glassMesh);

      // 3. Outer Soft Atmospheric Blue Halo
      const auraGeo = new THREE.SphereGeometry(1.16, 36, 36);
      const auraMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
        },
        vertexShader: AURA_VERTEX_SHADER,
        fragmentShader: AURA_FRAGMENT_SHADER,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      });
      geometries.push(auraGeo);
      materials.push(auraMat);
      const auraMesh = new THREE.Mesh(auraGeo, auraMat);
      auraMesh.renderOrder = 0;
      orbRoot.add(auraMesh);

      // 4. Primary 3D Tilted Orbital Crescent Ring (occluded naturally by core sphere)
      const primaryRingGroup = new THREE.Group();
      orbRoot.add(primaryRingGroup);

      const primaryRingGeo = new THREE.TorusGeometry(0.95, 0.072, 24, 96);
      const primaryRingMat = new THREE.ShaderMaterial({
        uniforms: {
          uPhase: { value: 0 },
          uOpacity: { value: 0.98 },
          uFocusPower: { value: 3.0 },
          uCoreColor: { value: new THREE.Color(0xdbeafe) },
          uTrailColor: { value: new THREE.Color(0x2563eb) },
        },
        vertexShader: RING_VERTEX_SHADER,
        fragmentShader: RING_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      geometries.push(primaryRingGeo);
      materials.push(primaryRingMat);
      const primaryRingMesh = new THREE.Mesh(primaryRingGeo, primaryRingMat);
      primaryRingMesh.renderOrder = 3;
      primaryRingGroup.add(primaryRingMesh);

      // 5. Secondary Soft Cobalt-Cyan 3D Energy Ribbon (counter-precessing)
      const secondaryRingGroup = new THREE.Group();
      orbRoot.add(secondaryRingGroup);

      const secondaryRingGeo = new THREE.TorusGeometry(0.99, 0.115, 20, 80);
      const secondaryRingMat = new THREE.ShaderMaterial({
        uniforms: {
          uPhase: { value: Math.PI * 0.7 },
          uOpacity: { value: 0.48 },
          uFocusPower: { value: 1.8 },
          uCoreColor: { value: new THREE.Color(0x7dd3fc) },
          uTrailColor: { value: new THREE.Color(0x1d4ed8) },
        },
        vertexShader: RING_VERTEX_SHADER,
        fragmentShader: RING_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      geometries.push(secondaryRingGeo);
      materials.push(secondaryRingMat);
      const secondaryRingMesh = new THREE.Mesh(secondaryRingGeo, secondaryRingMat);
      secondaryRingMesh.renderOrder = 4;
      secondaryRingGroup.add(secondaryRingMesh);

      // 6. Inner Luminous Equatorial Accent Arc (gives crisp edge-on 3D sliver flash)
      const innerArcGeo = new THREE.TorusGeometry(0.9, 0.036, 16, 80);
      const innerArcMat = new THREE.ShaderMaterial({
        uniforms: {
          uPhase: { value: 0.2 },
          uOpacity: { value: 0.88 },
          uFocusPower: { value: 4.5 },
          uCoreColor: { value: new THREE.Color(0xffffff) },
          uTrailColor: { value: new THREE.Color(0x38bdf8) },
        },
        vertexShader: RING_VERTEX_SHADER,
        fragmentShader: RING_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      geometries.push(innerArcGeo);
      materials.push(innerArcMat);
      const innerArcMesh = new THREE.Mesh(innerArcGeo, innerArcMat);
      innerArcMesh.renderOrder = 5;
      primaryRingGroup.add(innerArcMesh);

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
        const w = Math.max(Math.round(entry.contentRect.width), 32);
        const h = Math.max(Math.round(entry.contentRect.height), 32);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      });
      resizeObserver.observe(container);

      const timer = new THREE.Timer();
      timer.connect(document);
      let elapsed = 0;

      const updateScene = (t: number) => {
        coreMat.uniforms.uTime.value = t;
        auraMat.uniforms.uTime.value = t;

        // Core dark globe gentle 3D rotation
        coreMesh.rotation.y = t * 0.65;
        coreMesh.rotation.x = Math.sin(t * 0.48) * 0.28;

        // Primary 3D orbital crescent: full 3D pitch/yaw/roll tumbling matching reference
        primaryRingGroup.rotation.y = t * 2.15;
        primaryRingGroup.rotation.x = Math.sin(t * 1.35) * 0.78 + 0.32;
        primaryRingGroup.rotation.z = t * 0.95;
        primaryRingMat.uniforms.uPhase.value = t * 3.1;
        innerArcMat.uniforms.uPhase.value = t * 3.1 + 0.18;

        // Secondary volumetric cobalt aura ring counter-tumbling
        secondaryRingGroup.rotation.y = -t * 1.45 + 0.85;
        secondaryRingGroup.rotation.x = Math.cos(t * 1.1) * 0.75 - 0.35;
        secondaryRingGroup.rotation.z = -t * 0.72;
        secondaryRingMat.uniforms.uPhase.value = -t * 2.2;

        // Subtle volumetric breathing scale
        const breathe = 1.0 + Math.sin(t * 2.6) * 0.032;
        orbRoot.scale.setScalar(breathe);
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
            const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
            if (state === gl.UNSIGNALED && polls < 20) {
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
        const delta = Math.max(0, Math.min(timer.getDelta(), 0.05));
        elapsed += delta * motionFactor;
        updateScene(elapsed);
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
        envRenderTarget?.dispose();
        pmremGenerator?.dispose();
        renderer?.dispose();
      };
    }
  }, []);

  if (fallbackMode) {
    return (
      <div
        className={`relative rounded-full bg-gradient-to-br from-[#0a1a44] via-[#04091b] to-[#02040d] ring-1 ring-sky-400/60 shadow-[0_0_12px_rgba(56,189,248,0.45)] ${className}`}
      />
    );
  }

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
    />
  );
};
