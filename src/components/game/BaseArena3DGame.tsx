import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { 
  Play, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Shield, 
  Zap, 
  Crosshair, 
  Trophy, 
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Maximize2
} from "lucide-react";

// Procedural Web Audio Sound Synthesizer (Zero External 404 Dependencies)
class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  playLaser() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch {}
  }

  playHit() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(160, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch {}
  }

  playExplosion() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    try {
      // Noise burst for explosion
      const bufferSize = this.ctx.sampleRate * 0.3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(400, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.3);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      whiteNoise.start();
      whiteNoise.stop(this.ctx.currentTime + 0.3);
    } catch {}
  }

  playVictory() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.1 + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + idx * 0.1);
        osc.stop(this.ctx.currentTime + idx * 0.1 + 0.3);
      });
    } catch {}
  }
}

const sfx = new ProceduralAudioEngine();

// Procedural Radial Soft Contact Shadow Texture
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0.75)");
  gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.35)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Procedural Cybernetic Grid Floor Texture
function createArenaFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#09090b";
  ctx.fillRect(0, 0, 512, 512);

  // Hexagonal and Grid lines
  ctx.strokeStyle = "rgba(79, 70, 229, 0.22)";
  ctx.lineWidth = 2;
  const step = 64;
  for (let x = 0; x <= 512; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Neon glowing intersection dots
  ctx.fillStyle = "#818cf8";
  for (let x = 0; x <= 512; x += step) {
    for (let y = 0; y <= 512; y += step) {
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  texture.needsUpdate = true;
  return texture;
}

interface Projectile {
  mesh: THREE.Mesh;
  direction: THREE.Vector3;
  speed: number;
  life: number;
  isPlayer: boolean;
}

interface DroneEnemy {
  group: THREE.Group;
  health: number;
  maxHealth: number;
  speed: number;
  shootCooldown: number;
  rotor: THREE.Object3D;
  radius: number;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export default function BaseArena3DGame() {
  const mountRef = useRef<HTMLDivElement>(null);

  // Game Shell States: 'title' | 'playing' | 'paused' | 'gameover' | 'victory'
  const [gameState, setGameState] = useState<"title" | "playing" | "paused" | "gameover" | "victory">("title");
  const [score, setScore] = useState<number>(0);
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [wave, setWave] = useState<number>(1);
  const [bossHp, setBossHp] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [dockExpanded, setDockExpanded] = useState<boolean>(false);

  // References for render loop to ensure ZERO GC & 60fps performance
  const gameRef = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    clock?: THREE.Clock;
    playerGroup?: THREE.Group;
    playerMeshParts?: {
      torso: THREE.Mesh;
      visor: THREE.Mesh;
      leftArm: THREE.Mesh;
      rightArm: THREE.Mesh;
      leftShoulder: THREE.Mesh;
      rightShoulder: THREE.Mesh;
      core: THREE.Mesh;
      shadow: THREE.Mesh;
    };
    keys: { [key: string]: boolean };
    mousePos: THREE.Vector2;
    raycaster: THREE.Raycaster;
    aimPlane: THREE.Plane;
    aimTarget: THREE.Vector3;
    projectiles: Projectile[];
    enemies: DroneEnemy[];
    particles: Particle[];
    bossGroup?: THREE.Group;
    bossHealth: number;
    shootCooldown: number;
    hitStopTimer: number;
    screenShake: number;
    animFrameId?: number;
    activeWave: number;
    currentScore: number;
    currentHp: number;
  }>({
    keys: {},
    mousePos: new THREE.Vector2(),
    raycaster: new THREE.Raycaster(),
    aimPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    aimTarget: new THREE.Vector3(),
    projectiles: [],
    enemies: [],
    particles: [],
    bossHealth: 500,
    shootCooldown: 0,
    hitStopTimer: 0,
    screenShake: 0,
    activeWave: 1,
    currentScore: 0,
    currentHp: 100
  });

  const toggleSound = () => {
    sfx.isMuted = !sfx.isMuted;
    setIsMuted(sfx.isMuted);
  };

  const startGame = useCallback(() => {
    setGameState("playing");
    setScore(0);
    setPlayerHp(100);
    setWave(1);
    setBossHp(null);
    gameRef.current.currentScore = 0;
    gameRef.current.currentHp = 100;
    gameRef.current.activeWave = 1;
    gameRef.current.enemies = [];
    gameRef.current.projectiles = [];
    if (gameRef.current.playerGroup) {
      gameRef.current.playerGroup.position.set(0, 0, 0);
    }
  }, []);

  // Assemble Composite 7-Part Hero Mech (THREE.Group)
  const buildHeroMech = (): THREE.Group => {
    const group = new THREE.Group();

    // Materials with distinct roughness & metalness
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      metalness: 0.85,
      roughness: 0.25
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x4338ca,
      metalness: 0.5,
      roughness: 0.4
    });

    const glowVisorMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 2.2,
      roughness: 0.1
    });

    const coreGlowMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0xa855f7,
      emissiveIntensity: 3.0,
      roughness: 0.1
    });

    // 1. Torso (Primary silhouette)
    const torsoGeo = new THREE.BoxGeometry(1.2, 1.4, 0.9);
    const torso = new THREE.Mesh(torsoGeo, armorMat);
    torso.position.y = 1.3;
    torso.castShadow = true;
    group.add(torso);

    // 2. Visor / Head (Accent read)
    const visorGeo = new THREE.BoxGeometry(0.8, 0.4, 0.6);
    const visor = new THREE.Mesh(visorGeo, glowVisorMat);
    visor.position.set(0, 2.1, 0.2);
    group.add(visor);

    // 3 & 4. Dual Shoulder Pauldrons (Secondary silhouette)
    const shoulderGeo = new THREE.BoxGeometry(0.5, 0.5, 0.7);
    const leftShoulder = new THREE.Mesh(shoulderGeo, trimMat);
    leftShoulder.position.set(-0.9, 1.8, 0);
    leftShoulder.castShadow = true;
    group.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(shoulderGeo, trimMat);
    rightShoulder.position.set(0.9, 1.8, 0);
    rightShoulder.castShadow = true;
    group.add(rightShoulder);

    // 5 & 6. Blaster Arms
    const armGeo = new THREE.CylinderGeometry(0.14, 0.18, 1.1, 8);
    armGeo.rotateX(Math.PI / 2);
    const leftArm = new THREE.Mesh(armGeo, armorMat);
    leftArm.position.set(-0.9, 1.3, 0.5);
    leftArm.castShadow = true;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, armorMat);
    rightArm.position.set(0.9, 1.3, 0.5);
    rightArm.castShadow = true;
    group.add(rightArm);

    // 7. Arc Reactor Core
    const coreGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const core = new THREE.Mesh(coreGeo, coreGlowMat);
    core.position.set(0, 1.3, 0.46);
    group.add(core);

    // 8. Grounded Soft Radial Contact Shadow
    const shadowGeo = new THREE.PlaneGeometry(2.4, 2.4);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: createContactShadowTexture(),
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);

    gameRef.current.playerMeshParts = {
      torso,
      visor,
      leftArm,
      rightArm,
      leftShoulder,
      rightShoulder,
      core,
      shadow
    };

    return group;
  };

  // Assemble Composite 4-Part Drone Enemy
  const buildDroneEnemy = (pos: THREE.Vector3): DroneEnemy => {
    const group = new THREE.Group();
    group.position.copy(pos);

    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      metalness: 0.8,
      roughness: 0.3
    });

    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 2.5
    });

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x3f3f46,
      metalness: 0.9,
      roughness: 0.2
    });

    // 1. Central Core
    const hullGeo = new THREE.OctahedronGeometry(0.65);
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.position.y = 1.0;
    hull.castShadow = true;
    group.add(hull);

    // 2. Glowing Sensor Eye
    const eyeGeo = new THREE.SphereGeometry(0.2, 12, 12);
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 1.0, 0.55);
    group.add(eye);

    // 3. Gyroscopic Rotor Ring
    const ringGeo = new THREE.TorusGeometry(0.9, 0.08, 8, 24);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.0;
    group.add(ring);

    // 4. Ground Shadow
    const shadowGeo = new THREE.PlaneGeometry(1.6, 1.6);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: createContactShadowTexture(),
      transparent: true,
      opacity: 0.65,
      depthWrite: false
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);

    return {
      group,
      health: 40 + wave * 10,
      maxHealth: 40 + wave * 10,
      speed: 4.5 + Math.random() * 1.5,
      shootCooldown: Math.random() * 2.0,
      rotor: ring,
      radius: 0.8
    };
  };

  // Assemble Goliath Titan Boss (Multi-Part Model)
  const buildGoliathBoss = (): THREE.Group => {
    const group = new THREE.Group();
    group.position.set(0, 0, -22);

    const titanMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.9,
      roughness: 0.2
    });

    const titanGold = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.8,
      roughness: 0.3
    });

    const plasmaGlow = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0xa855f7,
      emissiveIntensity: 3.5
    });

    // Main Chassis
    const chassisGeo = new THREE.BoxGeometry(4.0, 2.5, 3.2);
    const chassis = new THREE.Mesh(chassisGeo, titanMat);
    chassis.position.y = 2.6;
    chassis.castShadow = true;
    group.add(chassis);

    // Dual Plasma Pods
    [-2.2, 2.2].forEach(x => {
      const podGeo = new THREE.CylinderGeometry(0.6, 0.7, 3.5, 12);
      podGeo.rotateX(Math.PI / 2);
      const pod = new THREE.Mesh(podGeo, titanGold);
      pod.position.set(x, 2.8, 0.2);
      pod.castShadow = true;
      group.add(pod);

      const glowGeo = new THREE.SphereGeometry(0.5, 12, 12);
      const glow = new THREE.Mesh(glowGeo, plasmaGlow);
      glow.position.set(x, 2.8, 2.0);
      group.add(glow);
    });

    // Giant Ground Shadow
    const shadowGeo = new THREE.PlaneGeometry(6.0, 6.0);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: createContactShadowTexture(),
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);

    return group;
  };

  // Spark Particle Burst Helper
  const spawnParticleBurst = (pos: THREE.Vector3, color: number = 0x818cf8, count: number = 8) => {
    if (!gameRef.current.scene) return;
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const mat = new THREE.MeshBasicMaterial({ color });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 6 + 2,
        (Math.random() - 0.5) * 8
      );
      gameRef.current.scene.add(mesh);
      gameRef.current.particles.push({
        mesh,
        velocity,
        life: 0.35,
        maxLife: 0.35
      });
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene with Horizon Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09090b);
    scene.fog = new THREE.FogExp2(0x09090b, 0.024);
    gameRef.current.scene = scene;

    // 2. Camera with studio tilt
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      150
    );
    camera.position.set(0, 16, 18);
    camera.lookAt(0, 0, 0);
    gameRef.current.camera = camera;

    // 3. Studio PBR Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x4338ca, 0x18181b, 0.7);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(15, 25, 12);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    scene.add(dirLight);

    // Accent Rim Light
    const rimLight = new THREE.DirectionalLight(0x06b6d4, 0.8);
    rimLight.position.set(-15, 12, -15);
    scene.add(rimLight);

    // 4. Cybernetic Arena Floor
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({
      map: createArenaFloorTexture(),
      roughness: 0.45,
      metalness: 0.65
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Arena Perimeter Energy Pillars
    const pillarGeo = new THREE.CylinderGeometry(0.4, 0.5, 3.5, 8);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x312e81,
      emissive: 0x4f46e5,
      emissiveIntensity: 0.8
    });
    const arenaRadius = 26;
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(Math.cos(angle) * arenaRadius, 1.75, Math.sin(angle) * arenaRadius);
      pillar.castShadow = true;
      scene.add(pillar);
    }

    // 5. Build and add Hero Mech
    const heroMech = buildHeroMech();
    scene.add(heroMech);
    gameRef.current.playerGroup = heroMech;

    // 6. WebGL Renderer with ACESFilmic Tone Mapping
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    gameRef.current.renderer = renderer;

    const clock = new THREE.Clock();
    gameRef.current.clock = clock;

    // Responsive Canvas Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    // Input Handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      gameRef.current.keys[e.code] = true;
      if (e.code === "Space" || e.code === "Enter") {
        if (gameState === "title" || gameState === "gameover" || gameState === "victory") {
          startGame();
        }
      }
      if (e.code === "KeyP") {
        setGameState(prev => (prev === "playing" ? "paused" : prev === "paused" ? "playing" : prev));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      gameRef.current.keys[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      gameRef.current.mousePos.set(x, y);
    };

    const handlePointerDown = () => {
      // Fire blaster
      if (gameState === "playing" && gameRef.current.shootCooldown <= 0) {
        firePlayerBlaster();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("pointerdown", handlePointerDown);

    // Fire Player Laser Projectile
    const firePlayerBlaster = () => {
      if (!gameRef.current.playerGroup || !gameRef.current.scene) return;
      const origin = gameRef.current.playerGroup.position.clone().add(new THREE.Vector3(0, 1.4, 0));
      const target = gameRef.current.aimTarget.clone();
      const dir = target.sub(origin).setY(0).normalize();
      if (dir.lengthSq() < 0.001) dir.set(0, 0, -1);

      const projGeo = new THREE.SphereGeometry(0.18, 8, 8);
      const projMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      const mesh = new THREE.Mesh(projGeo, projMat);
      mesh.position.copy(origin);
      scene.add(mesh);

      gameRef.current.projectiles.push({
        mesh,
        direction: dir,
        speed: 32,
        life: 1.5,
        isPlayer: true
      });

      gameRef.current.shootCooldown = 0.16;
      sfx.playLaser();

      // Recoil animation on mech arms
      if (gameRef.current.playerMeshParts) {
        gameRef.current.playerMeshParts.leftArm.position.z = 0.35;
        gameRef.current.playerMeshParts.rightArm.position.z = 0.35;
      }
    };

    // Enemy Spawn Director
    let spawnTimer = 0;
    const waveMaxEnemies = 6 + wave * 3;

    // 60FPS Simulation Loop
    const animate = () => {
      gameRef.current.animFrameId = requestAnimationFrame(animate);

      const rawDt = clock.getDelta();
      // Clamp dt to prevent physics tunneling
      const dt = Math.min(rawDt, 0.05);

      // 40ms HitStop Freeze
      if (gameRef.current.hitStopTimer > 0) {
        gameRef.current.hitStopTimer -= dt;
        renderer.render(scene, camera);
        return;
      }

      if (gameState === "playing") {
        const player = gameRef.current.playerGroup;
        const keys = gameRef.current.keys;

        // Player Movement Vector
        if (player) {
          const moveDir = new THREE.Vector3(0, 0, 0);
          if (keys["KeyW"] || keys["ArrowUp"]) moveDir.z -= 1;
          if (keys["KeyS"] || keys["ArrowDown"]) moveDir.z += 1;
          if (keys["KeyA"] || keys["ArrowLeft"]) moveDir.x -= 1;
          if (keys["KeyD"] || keys["ArrowRight"]) moveDir.x += 1;

          if (moveDir.lengthSq() > 0) {
            moveDir.normalize();
            const playerSpeed = 9.5;
            player.position.addScaledVector(moveDir, playerSpeed * dt);
            // Confine inside arena bounds
            const maxBound = 22;
            player.position.x = THREE.MathUtils.clamp(player.position.x, -maxBound, maxBound);
            player.position.z = THREE.MathUtils.clamp(player.position.z, -maxBound, maxBound);
          }

          // Aim Raycaster towards mouse ground intersection
          gameRef.current.raycaster.setFromCamera(gameRef.current.mousePos, camera);
          const intersects = gameRef.current.raycaster.ray.intersectPlane(
            gameRef.current.aimPlane,
            gameRef.current.aimTarget
          );
          if (intersects) {
            const lookTarget = gameRef.current.aimTarget.clone().setY(player.position.y);
            player.lookAt(lookTarget);
          }

          // Camera Follow with Exponential Damping (1 - Math.exp(-k * dt))
          const targetCamX = player.position.x;
          const targetCamZ = player.position.z + 16;
          const factor = 1 - Math.exp(-6.0 * dt);
          camera.position.x += (targetCamX - camera.position.x) * factor;
          camera.position.z += (targetCamZ - camera.position.z) * factor;

          // Camera Shake
          if (gameRef.current.screenShake > 0) {
            camera.position.x += (Math.random() - 0.5) * gameRef.current.screenShake;
            camera.position.y = 16 + (Math.random() - 0.5) * gameRef.current.screenShake;
            gameRef.current.screenShake = Math.max(0, gameRef.current.screenShake - dt * 3.5);
          } else {
            camera.position.y = 16;
          }
        }

        // Restore recoil smoothly
        if (gameRef.current.playerMeshParts) {
          const { leftArm, rightArm } = gameRef.current.playerMeshParts;
          leftArm.position.z += (0.5 - leftArm.position.z) * (1 - Math.exp(-12 * dt));
          rightArm.position.z += (0.5 - rightArm.position.z) * (1 - Math.exp(-12 * dt));
        }

        if (gameRef.current.shootCooldown > 0) {
          gameRef.current.shootCooldown -= dt;
        }

        // Continuous Spawning of Drone Enemies
        spawnTimer += dt;
        if (spawnTimer > 1.8 && gameRef.current.enemies.length < waveMaxEnemies && !gameRef.current.bossGroup) {
          spawnTimer = 0;
          const angle = Math.random() * Math.PI * 2;
          const spawnDist = 18 + Math.random() * 5;
          const spawnPos = new THREE.Vector3(
            Math.cos(angle) * spawnDist,
            0,
            Math.sin(angle) * spawnDist
          );
          const drone = buildDroneEnemy(spawnPos);
          scene.add(drone.group);
          gameRef.current.enemies.push(drone);
        }

        // Boss Encounter on Wave 3
        if (wave >= 3 && !gameRef.current.bossGroup && gameRef.current.currentScore >= 450) {
          const boss = buildGoliathBoss();
          scene.add(boss);
          gameRef.current.bossGroup = boss;
          gameRef.current.bossHealth = 600;
          setBossHp(600);
        }

        // Update Boss AI
        if (gameRef.current.bossGroup && player) {
          const boss = gameRef.current.bossGroup;
          boss.lookAt(player.position.x, boss.position.y, player.position.z);
          // Slow advance towards center
          if (boss.position.distanceTo(player.position) > 10) {
            const bossDir = player.position.clone().sub(boss.position).normalize();
            boss.position.addScaledVector(bossDir, 2.2 * dt);
          }
        }

        // Update Enemies AI & Movement
        for (let i = gameRef.current.enemies.length - 1; i >= 0; i--) {
          const enemy = gameRef.current.enemies[i];
          if (!player) continue;

          // Drone gyroscopic rotor spin
          enemy.rotor.rotation.z += 8 * dt;

          const toPlayer = player.position.clone().sub(enemy.group.position).setY(0);
          const dist = toPlayer.length();

          if (dist > 1.6) {
            toPlayer.normalize();
            enemy.group.position.addScaledVector(toPlayer, enemy.speed * dt);
            enemy.group.lookAt(player.position.x, enemy.group.position.y, player.position.z);
          } else {
            // Collision damage to player
            gameRef.current.currentHp = Math.max(0, gameRef.current.currentHp - 18 * dt);
            setPlayerHp(Math.round(gameRef.current.currentHp));
            gameRef.current.screenShake = 0.4;
            sfx.playHit();

            if (gameRef.current.currentHp <= 0) {
              setGameState("gameover");
            }
          }
        }

        // Update Projectiles & Collision Detection
        for (let i = gameRef.current.projectiles.length - 1; i >= 0; i--) {
          const proj = gameRef.current.projectiles[i];
          proj.life -= dt;
          proj.mesh.position.addScaledVector(proj.direction, proj.speed * dt);

          let hit = false;

          // Check hits against regular enemies
          if (proj.isPlayer) {
            for (let j = gameRef.current.enemies.length - 1; j >= 0; j--) {
              const enemy = gameRef.current.enemies[j];
              const hitDist = proj.mesh.position.distanceTo(
                enemy.group.position.clone().add(new THREE.Vector3(0, 1.0, 0))
              );

              if (hitDist < enemy.radius + 0.3) {
                hit = true;
                enemy.health -= 35;
                spawnParticleBurst(proj.mesh.position, 0x06b6d4, 6);
                sfx.playHit();

                if (enemy.health <= 0) {
                  // Enemy destroyed
                  spawnParticleBurst(enemy.group.position, 0xef4444, 16);
                  sfx.playExplosion();
                  scene.remove(enemy.group);
                  gameRef.current.enemies.splice(j, 1);
                  gameRef.current.currentScore += 25;
                  setScore(gameRef.current.currentScore);
                  gameRef.current.hitStopTimer = 0.04; // 40ms simulation hitstop
                }
                break;
              }
            }

            // Check hits against Boss
            if (!hit && gameRef.current.bossGroup) {
              const boss = gameRef.current.bossGroup;
              const bossDist = proj.mesh.position.distanceTo(
                boss.position.clone().add(new THREE.Vector3(0, 2.5, 0))
              );
              if (bossDist < 3.2) {
                hit = true;
                gameRef.current.bossHealth -= 25;
                setBossHp(Math.max(0, gameRef.current.bossHealth));
                spawnParticleBurst(proj.mesh.position, 0xa855f7, 8);
                sfx.playHit();

                if (gameRef.current.bossHealth <= 0) {
                  spawnParticleBurst(boss.position, 0xf59e0b, 32);
                  sfx.playExplosion();
                  sfx.playVictory();
                  scene.remove(boss);
                  gameRef.current.bossGroup = undefined;
                  gameRef.current.currentScore += 500;
                  setScore(gameRef.current.currentScore);
                  setGameState("victory");
                }
              }
            }
          }

          if (hit || proj.life <= 0) {
            scene.remove(proj.mesh);
            gameRef.current.projectiles.splice(i, 1);
          }
        }

        // Check wave progression
        if (gameRef.current.currentScore > wave * 180 && wave < 3) {
          const nextWave = wave + 1;
          setWave(nextWave);
          gameRef.current.activeWave = nextWave;
          sfx.playVictory();
        }

        // Update Particle Sparks
        for (let i = gameRef.current.particles.length - 1; i >= 0; i--) {
          const p = gameRef.current.particles[i];
          p.life -= dt;
          p.velocity.y -= 14 * dt; // gravity
          p.mesh.position.addScaledVector(p.velocity, dt);
          const scale = THREE.MathUtils.clamp(p.life / p.maxLife, 0.01, 1);
          p.mesh.scale.set(scale, scale, scale);

          if (p.life <= 0) {
            scene.remove(p.mesh);
            gameRef.current.particles.splice(i, 1);
          }
        }
      }

      renderer.render(scene, camera);
    };

    gameRef.current.animFrameId = requestAnimationFrame(animate);

    // Cleanup when component unmounts
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("pointerdown", handlePointerDown);
      }
      if (gameRef.current.animFrameId) {
        cancelAnimationFrame(gameRef.current.animFrameId);
      }
      if (renderer.domElement && container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [gameState, wave, startGame]);

  return (
    <div className="relative w-full h-[620px] sm:h-[700px] bg-zinc-950 rounded-3xl overflow-hidden border border-white/10 shadow-2xl select-none">
      {/* 3D WebGL Canvas Mount Container */}
      <div ref={mountRef} className="w-full h-full cursor-crosshair" />

      {/* Low-Occlusion HUD Overlay (>= 85% Playfield Unobstructed, pointer-events: none) */}
      <div className="absolute inset-0 pointer-events-none p-4 sm:p-6 flex flex-col justify-between z-10">
        {/* Perimeter Status Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Player Health Bar */}
            <div className="bg-black/75 border border-white/10 rounded-2xl p-2.5 px-4 pointer-events-auto shadow-lg flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>HP</span>
              </div>
              <div className="w-28 sm:w-36 h-2.5 bg-zinc-800 rounded-full overflow-hidden border border-white/10">
                <div 
                  className={`h-full transition-all duration-150 ${
                    playerHp > 50 ? "bg-cyan-400" : playerHp > 25 ? "bg-amber-400" : "bg-rose-500"
                  }`} 
                  style={{ width: `${Math.max(0, Math.min(100, playerHp))}%` }} 
                />
              </div>
              <span className="text-xs font-mono font-bold text-white tabular-nums">
                {playerHp}%
              </span>
            </div>

            {/* Current Wave */}
            <div className="bg-black/75 border border-white/10 rounded-2xl p-2.5 px-4 pointer-events-auto shadow-lg flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-purple" />
              <span className="text-xs font-mono font-bold text-white">
                WAVE <span className="text-brand-purple tabular-nums">{wave}</span>/3
              </span>
            </div>
          </div>

          {/* Score & Sound Toggle */}
          <div className="flex items-center gap-2">
            <div className="bg-black/75 border border-white/10 rounded-2xl p-2.5 px-4 pointer-events-auto shadow-lg flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono font-bold text-amber-300 tabular-nums">
                {score.toLocaleString()} PTS
              </span>
            </div>

            <button
              onClick={toggleSound}
              className="p-2.5 rounded-2xl bg-black/75 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 pointer-events-auto transition-colors"
              title={isMuted ? "Unmute Audio" : "Mute Audio"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* Boss Health Bar (When active) */}
        {bossHp !== null && (
          <div className="self-center w-full max-w-md bg-black/85 border border-purple-500/40 rounded-2xl p-3 shadow-2xl pointer-events-auto animate-pulse">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-purple-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                GOLIATH CYBER-TITAN BOSS
              </span>
              <span className="tabular-nums">{bossHp}/600</span>
            </div>
            <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-purple-500/30">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-100" 
                style={{ width: `${(bossHp / 600) * 100}%` }} 
              />
            </div>
          </div>
        )}

        {/* Flat Minimal Control Hint */}
        <div className="text-center">
          <span className="text-[11px] font-mono text-zinc-400 bg-black/70 border border-white/10 px-3 py-1 rounded-full pointer-events-auto">
            [WASD / Arrows] Move &nbsp;•&nbsp; [Mouse] Aim &nbsp;•&nbsp; [Click] Fire &nbsp;•&nbsp; [P] Pause
          </span>
        </div>
      </div>

      {/* Game Shell Modal: Title Screen */}
      {gameState === "title" && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6 z-20">
          <div className="max-w-md w-full bg-zinc-950 border border-brand-purple/40 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
            {/* Bespoke Inline SVG Logo */}
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-purple/20 border border-brand-purple/40 flex items-center justify-center text-brand-purple shadow-inner">
              <Crosshair className="w-8 h-8 animate-spin" style={{ animationDuration: "12s" }} />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                <Shield className="w-3 h-3" /> Three.js 60FPS Cybernetic Arena
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">
                BASE MECH ARENA 3D
              </h1>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Pilot the composite Cyber-Mech on Base L2. Vanquish swarms of kinetic drones, survive 3 escalating waves, and destroy the Goliath Titan.
              </p>
            </div>

            <button
              onClick={startGame}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm font-display flex items-center justify-center gap-2 shadow-lg shadow-brand-purple/30 transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>ENGAGE ARENA [ENTER / SPACE]</span>
            </button>

            <div className="text-[11px] font-mono text-zinc-500">
              Procedural Web Audio SFX &nbsp;•&nbsp; Damped PBR Camera &nbsp;•&nbsp; 60 FPS
            </div>
          </div>
        </div>
      )}

      {/* Game Shell Modal: Pause */}
      {gameState === "paused" && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6 z-20">
          <div className="max-w-sm w-full bg-zinc-950 border border-white/20 rounded-3xl p-6 text-center space-y-4">
            <h2 className="text-xl font-bold font-display text-white">SIMULATION PAUSED</h2>
            <p className="text-xs text-zinc-400">Score: {score} | Wave: {wave}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setGameState("playing")}
                className="flex-1 py-3 rounded-xl bg-brand-purple text-white font-bold text-xs"
              >
                Resume
              </button>
              <button
                onClick={startGame}
                className="py-3 px-4 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs"
              >
                Restart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Shell Modal: Game Over */}
      {gameState === "gameover" && (
        <div className="absolute inset-0 bg-black/85 flex items-center justify-center p-6 z-20">
          <div className="max-w-md w-full bg-zinc-950 border border-rose-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black font-display text-white">MECH DESTROYED</h2>
              <p className="text-xs text-zinc-400">Your hull integrity was compromised by enemy drones.</p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 font-mono text-xs flex justify-around">
              <div>
                <span className="text-zinc-500 block text-[10px]">FINAL SCORE</span>
                <span className="text-lg font-bold text-amber-300 tabular-nums">{score}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">WAVE REACHED</span>
                <span className="text-lg font-bold text-white tabular-nums">{wave}/3</span>
              </div>
            </div>
            <button
              onClick={startGame}
              className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-display flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>REDEPLOY MECH [SPACE]</span>
            </button>
          </div>
        </div>
      )}

      {/* Game Shell Modal: Victory */}
      {gameState === "victory" && (
        <div className="absolute inset-0 bg-black/85 flex items-center justify-center p-6 z-20">
          <div className="max-w-md w-full bg-zinc-950 border border-amber-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black font-display text-white">ARENA CHAMPION!</h2>
              <p className="text-xs text-zinc-400">The Goliath Titan has fallen. Base Arena is secured.</p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 font-mono text-xs flex justify-around">
              <div>
                <span className="text-zinc-500 block text-[10px]">TOTAL SCORE</span>
                <span className="text-lg font-bold text-amber-300 tabular-nums">{score}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">STATUS</span>
                <span className="text-lg font-bold text-emerald-400">VICTORY</span>
              </div>
            </div>
            <button
              onClick={startGame}
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs font-display flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>PLAY AGAIN</span>
            </button>
          </div>
        </div>
      )}

      {/* Viewport-First Collapsible Bottom Control Dock (<= 15% Viewport Footprint) */}
      <div className="absolute bottom-2 left-4 right-4 z-10 pointer-events-auto">
        <div className="bg-zinc-900/95 border border-white/10 rounded-2xl p-2.5 px-4 shadow-xl flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-300">
            <Crosshair className="w-4 h-4 text-brand-purple" />
            <span className="font-bold">Base Arena Engine</span>
            <span className="text-[10px] text-zinc-500 hidden sm:inline">| Three.js WebGL + PBR Lighting</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDockExpanded(!dockExpanded)}
              className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg"
            >
              <span>{dockExpanded ? "Hide Specs" : "Specs"}</span>
              {dockExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {dockExpanded && (
          <div className="mt-1.5 p-3 rounded-2xl bg-zinc-950/95 border border-white/10 text-[11px] font-mono text-zinc-400 space-y-1">
            <div className="flex justify-between">
              <span>Model Architecture:</span>
              <span className="text-white">7-Part Composite THREE.Group (Zero 404 External URLs)</span>
            </div>
            <div className="flex justify-between">
              <span>Audio Synthesis:</span>
              <span className="text-emerald-400">Procedural Web Audio API Sawtooth / Noise</span>
            </div>
            <div className="flex justify-between">
              <span>Lighting & Pipeline:</span>
              <span className="text-brand-purple">ACESFilmicToneMapping + PCFSoftShadowMap</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
