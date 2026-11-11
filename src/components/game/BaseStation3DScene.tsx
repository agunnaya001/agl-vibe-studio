import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { 
  Box, 
  Layers, 
  Rotate3d, 
  Sparkles, 
  Sun, 
  Moon, 
  Sliders, 
  Maximize2,
  ChevronDown,
  ChevronUp
} from "lucide-react";

// Procedural Radial Soft Contact Shadow
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0.8)");
  gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.35)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Procedural Brushed Metal Finish Texture
function createBrushedMetalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#1e1e24";
  ctx.fillRect(0, 0, 256, 256);

  // Subtle linear brushed grain
  for (let i = 0; i < 400; i++) {
    const y = Math.random() * 256;
    const len = Math.random() * 120 + 20;
    const x = Math.random() * 256;
    ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random() * 0.08 + 0.02})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.needsUpdate = true;
  return texture;
}

const FINISHES = [
  { id: "amethyst", name: "Amethyst Alloy", color: 0x7c3aed, metalness: 0.85, roughness: 0.25, emissive: 0x4c1d95 },
  { id: "gold", name: "Imperial Gold", color: 0xd97706, metalness: 0.95, roughness: 0.2, emissive: 0x78350f },
  { id: "chrome", name: "Cyber Chrome", color: 0xe4e4e7, metalness: 0.98, roughness: 0.12, emissive: 0x27272a },
  { id: "titanium", name: "Raw Titanium", color: 0x3f3f46, metalness: 0.75, roughness: 0.45, emissive: 0x18181b }
];

export default function BaseStation3DScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedFinish, setSelectedFinish] = useState(FINISHES[0]);
  const [explodeProgress, setExplodeProgress] = useState(0);
  const [isRotating, setIsRotating] = useState(true);
  const [lightingMode, setLightingMode] = useState<"studio" | "cyber" | "ambient">("studio");
  const [dockExpanded, setDockExpanded] = useState(false);

  const sceneRef = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    controls?: OrbitControls;
    vaultGroup?: THREE.Group;
    parts?: {
      outerShellTop: THREE.Mesh;
      outerShellBottom: THREE.Mesh;
      magRingOuter: THREE.Mesh;
      magRingInner: THREE.Mesh;
      quantumCore: THREE.Mesh;
      cryoPipes: THREE.Mesh[];
      containmentCage: THREE.Mesh;
      basePlatform: THREE.Mesh;
      contactShadow: THREE.Mesh;
    };
    directionalLight?: THREE.DirectionalLight;
    rimLight?: THREE.DirectionalLight;
    hemiLight?: THREE.HemisphereLight;
    animFrameId?: number;
  }>({});

  // Update Material Finishes Dynamically
  useEffect(() => {
    if (!sceneRef.current.parts) return;
    const { outerShellTop, outerShellBottom, magRingOuter, containmentCage } = sceneRef.current.parts;
    
    [outerShellTop, outerShellBottom].forEach(m => {
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.color.setHex(selectedFinish.color);
      mat.metalness = selectedFinish.metalness;
      mat.roughness = selectedFinish.roughness;
    });

    const ringMat = magRingOuter.material as THREE.MeshStandardMaterial;
    ringMat.emissive.setHex(selectedFinish.emissive);
  }, [selectedFinish]);

  // Update Lighting Mode
  useEffect(() => {
    if (!sceneRef.current.directionalLight || !sceneRef.current.hemiLight) return;
    const { directionalLight, rimLight, hemiLight } = sceneRef.current;

    if (lightingMode === "studio") {
      directionalLight.color.setHex(0xffffff);
      directionalLight.intensity = 1.6;
      hemiLight.color.setHex(0x6366f1);
      hemiLight.groundColor.setHex(0x18181b);
    } else if (lightingMode === "cyber") {
      directionalLight.color.setHex(0x06b6d4);
      directionalLight.intensity = 2.0;
      hemiLight.color.setHex(0xa855f7);
      hemiLight.groundColor.setHex(0x09090b);
    } else {
      directionalLight.color.setHex(0xfef08a);
      directionalLight.intensity = 1.0;
      hemiLight.color.setHex(0x3b82f6);
      hemiLight.groundColor.setHex(0x27272a);
    }
  }, [lightingMode]);

  // Apply Exploded View Displacement
  useEffect(() => {
    if (!sceneRef.current.parts) return;
    const { outerShellTop, outerShellBottom, magRingOuter, magRingInner, cryoPipes } = sceneRef.current.parts;

    // Displace parts smoothly based on explodeProgress (0.0 to 1.0)
    outerShellTop.position.y = 1.8 + explodeProgress * 2.2;
    outerShellBottom.position.y = 0.5 - explodeProgress * 1.5;
    magRingOuter.scale.setScalar(1 + explodeProgress * 0.6);
    magRingInner.position.y = 1.15 + explodeProgress * 0.8;

    cryoPipes.forEach((pipe, idx) => {
      const sign = idx % 2 === 0 ? 1 : -1;
      pipe.position.x = (idx < 2 ? -1.4 : 1.4) + sign * explodeProgress * 1.2;
    });
  }, [explodeProgress]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Horizon Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09090b);
    scene.fog = new THREE.FogExp2(0x09090b, 0.035);
    sceneRef.current.scene = scene;

    // 2. Camera with studio portrait perspective
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 3.5, 7.5);
    sceneRef.current.camera = camera;

    // 3. WebGL Renderer with ACESFilmicToneMapping
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    sceneRef.current.renderer = renderer;

    // 4. OrbitControls with smooth exponential damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Stay above ground
    controls.minDistance = 3.5;
    controls.maxDistance = 14;
    sceneRef.current.controls = controls;

    // 5. Studio PBR Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x6366f1, 0x18181b, 0.8);
    scene.add(hemiLight);
    sceneRef.current.hemiLight = hemiLight;

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
    dirLight.position.set(6, 12, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);
    sceneRef.current.directionalLight = dirLight;

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.0);
    rimLight.position.set(-6, 6, -6);
    scene.add(rimLight);
    sceneRef.current.rimLight = rimLight;

    // 6. Ground Pedestal with radial shadow
    const floorGeo = new THREE.CylinderGeometry(4.5, 4.8, 0.2, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.6,
      roughness: 0.5
    });
    const pedestal = new THREE.Mesh(floorGeo, floorMat);
    pedestal.position.y = -0.1;
    pedestal.receiveShadow = true;
    scene.add(pedestal);

    // Ground Contact Shadow
    const shadowGeo = new THREE.PlaneGeometry(6, 6);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: createContactShadowTexture(),
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    scene.add(shadow);

    // 7. Assemble Composite 9-Part Quantum Vault (THREE.Group)
    const vaultGroup = new THREE.Group();
    vaultGroup.position.set(0, 0, 0);

    const metalTex = createBrushedMetalTexture();

    // Materials
    const shellMat = new THREE.MeshStandardMaterial({
      color: selectedFinish.color,
      metalness: selectedFinish.metalness,
      roughness: selectedFinish.roughness,
      map: metalTex
    });

    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      metalness: 0.9,
      roughness: 0.2
    });

    const glowCoreMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 3.5,
      roughness: 0.1
    });

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x3f3f46,
      metalness: 0.9,
      roughness: 0.2,
      emissive: selectedFinish.emissive,
      emissiveIntensity: 0.6
    });

    // Part 1: Base Platform
    const baseGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.4, 16);
    const basePlatform = new THREE.Mesh(baseGeo, darkTrimMat);
    basePlatform.position.y = 0.2;
    basePlatform.castShadow = true;
    vaultGroup.add(basePlatform);

    // Part 2: Outer Shell Bottom
    const bottomGeo = new THREE.CylinderGeometry(1.4, 1.6, 0.6, 8);
    const outerShellBottom = new THREE.Mesh(bottomGeo, shellMat);
    outerShellBottom.position.y = 0.5;
    outerShellBottom.castShadow = true;
    vaultGroup.add(outerShellBottom);

    // Part 3: Outer Shell Top (With bevel read)
    const topGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.6, 8);
    const outerShellTop = new THREE.Mesh(topGeo, shellMat);
    outerShellTop.position.y = 1.8;
    outerShellTop.castShadow = true;
    vaultGroup.add(outerShellTop);

    // Part 4: Quantum Core (Center)
    const coreGeo = new THREE.IcosahedronGeometry(0.55, 2);
    const quantumCore = new THREE.Mesh(coreGeo, glowCoreMat);
    quantumCore.position.y = 1.15;
    vaultGroup.add(quantumCore);

    // Part 5: Magnetic Outer Ring
    const ringOuterGeo = new THREE.TorusGeometry(1.5, 0.08, 12, 32);
    const magRingOuter = new THREE.Mesh(ringOuterGeo, ringMat);
    magRingOuter.rotation.x = Math.PI / 2;
    magRingOuter.position.y = 1.15;
    vaultGroup.add(magRingOuter);

    // Part 6: Magnetic Inner Ring
    const ringInnerGeo = new THREE.TorusGeometry(1.0, 0.05, 8, 24);
    const magRingInner = new THREE.Mesh(ringInnerGeo, darkTrimMat);
    magRingInner.rotation.x = Math.PI / 3;
    magRingInner.position.y = 1.15;
    vaultGroup.add(magRingInner);

    // Part 7: Containment Cage (Geodesic cage)
    const cageGeo = new THREE.IcosahedronGeometry(0.85, 1);
    const cageMat = new THREE.MeshStandardMaterial({
      color: 0x71717a,
      wireframe: true,
      metalness: 0.9,
      roughness: 0.2
    });
    const containmentCage = new THREE.Mesh(cageGeo, cageMat);
    containmentCage.position.y = 1.15;
    vaultGroup.add(containmentCage);

    // Part 8 & 9: Cryo Conductor Pipes (4 surrounding columns)
    const cryoPipes: THREE.Mesh[] = [];
    const pipeGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
    const pipeAngles = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
    pipeAngles.forEach(angle => {
      const pipe = new THREE.Mesh(pipeGeo, darkTrimMat);
      pipe.position.set(Math.cos(angle) * 1.3, 1.15, Math.sin(angle) * 1.3);
      pipe.castShadow = true;
      vaultGroup.add(pipe);
      cryoPipes.push(pipe);
    });

    scene.add(vaultGroup);
    sceneRef.current.vaultGroup = vaultGroup;
    sceneRef.current.parts = {
      outerShellTop,
      outerShellBottom,
      magRingOuter,
      magRingInner,
      quantumCore,
      cryoPipes,
      containmentCage,
      basePlatform,
      contactShadow: shadow
    };

    // Responsive Canvas Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // 60FPS Render Loop with zero GC
    const clock = new THREE.Clock();
    const animate = () => {
      sceneRef.current.animFrameId = requestAnimationFrame(animate);
      const dt = clock.getDelta();

      controls.update();

      // Idle Rotation of core & rings
      if (isRotating && vaultGroup) {
        vaultGroup.rotation.y += 0.4 * dt;
        quantumCore.rotation.x += 1.2 * dt;
        quantumCore.rotation.y += 0.8 * dt;
        magRingInner.rotation.z += 2.0 * dt;
        containmentCage.rotation.y -= 0.6 * dt;
      }

      renderer.render(scene, camera);
    };

    sceneRef.current.animFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (sceneRef.current.animFrameId) {
        cancelAnimationFrame(sceneRef.current.animFrameId);
      }
      if (renderer.domElement && container) {
        container.removeChild(renderer.domElement);
      }
      controls.dispose();
      renderer.dispose();
    };
  }, [isRotating]);

  return (
    <div className="relative w-full h-[580px] sm:h-[660px] bg-zinc-950 rounded-3xl overflow-hidden border border-white/10 shadow-2xl select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Header Badge */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="bg-black/80 border border-white/10 rounded-2xl p-3 px-4 shadow-xl flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Box className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold font-display text-white">Quantum Staking Vault 3D</h3>
              <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                PBR Studio
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              9-part composite procedural asset with dynamic exploded view
            </p>
          </div>
        </div>
      </div>

      {/* Top Right Quick Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={() => setIsRotating(!isRotating)}
          className={`p-2.5 rounded-2xl border text-xs font-mono flex items-center gap-1.5 transition-all shadow-lg ${
            isRotating 
              ? "bg-purple-600/90 text-white border-purple-400" 
              : "bg-black/80 text-zinc-400 hover:text-white border-white/10 hover:bg-zinc-800"
          }`}
          title="Toggle Turntable Rotation"
        >
          <Rotate3d className="w-4 h-4" />
          <span className="hidden sm:inline">{isRotating ? "Pause Spin" : "Auto Spin"}</span>
        </button>

        <div className="bg-black/80 border border-white/10 rounded-2xl p-1 flex items-center gap-1 shadow-lg">
          {(["studio", "cyber", "ambient"] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setLightingMode(mode)}
              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-mono uppercase transition-all ${
                lightingMode === mode 
                  ? "bg-brand-purple text-white font-bold" 
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Viewport-First Collapsible Bottom Control Dock (<= 15% Viewport Footprint) */}
      <div className="absolute bottom-3 left-4 right-4 z-10">
        <div className="bg-zinc-900/95 border border-white/10 rounded-2xl p-3 px-4 shadow-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Exploded View Slider */}
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-300 shrink-0">
                <Layers className="w-4 h-4 text-brand-purple" />
                <span>Explode:</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={explodeProgress}
                onChange={(e) => setExplodeProgress(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <span className="text-xs font-mono font-bold text-white tabular-nums min-w-[36px]">
                {Math.round(explodeProgress * 100)}%
              </span>
            </div>

            {/* Finish Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <span className="text-[10px] font-mono text-zinc-500 uppercase mr-1 shrink-0">Finish:</span>
              {FINISHES.map(finish => (
                <button
                  key={finish.id}
                  onClick={() => setSelectedFinish(finish)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 shrink-0 border ${
                    selectedFinish.id === finish.id
                      ? "bg-white/15 text-white border-white/40 font-bold shadow-sm"
                      : "bg-black/40 text-zinc-400 border-white/5 hover:text-zinc-200"
                  }`}
                >
                  <span 
                    className="w-2.5 h-2.5 rounded-full border border-white/20" 
                    style={{ backgroundColor: `#${finish.color.toString(16).padStart(6, '0')}` }} 
                  />
                  <span>{finish.name.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
