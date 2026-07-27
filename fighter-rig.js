import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const TAU = Math.PI * 2;

function smoothstep(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function phase(progress, start, end) {
  return smoothstep((progress - start) / Math.max(0.001, end - start));
}

function mix(a, b, amount) {
  return a + (b - a) * amount;
}

function colorNumber(value, fallback) {
  try {
    return new THREE.Color(value).getHex();
  } catch {
    return fallback;
  }
}

function createEnergyMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color(color) },
      intensity: { value: 1 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float intensity;
      uniform vec3 color;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vec3 viewDir = normalize(-vViewPosition);
        float rim = pow(1.0 - max(0.0, dot(viewDir, vNormal)), 2.4);
        float pulse = 0.72 + sin(time * 7.0) * 0.16;
        vec3 glow = color * (pulse + rim * 1.8) * intensity;
        gl_FragColor = vec4(glow, 0.92);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function createPanel(material, size, bevel = 0) {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2], 1, 1, 1);
  const mesh = new THREE.Mesh(geometry, material);
  if (bevel) {
    mesh.geometry.translate(0, bevel, 0);
  }
  return mesh;
}

function addOutline(mesh, color = 0xa8b49e) {
  const edges = new THREE.EdgesGeometry(mesh.geometry, 24);
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.22 }),
  );
  line.scale.setScalar(1.008);
  mesh.add(line);
}

class FighterRig {
  constructor(fighter, { hangar = false } = {}) {
    this.hangar = hangar;
    this.root = new THREE.Group();
    this.root.name = "fighter-rig";
    this.parts = {};
    this.progress = 0;
    this.time = 0;
    this.setFighter(fighter);
  }

  setFighter(fighter) {
    this.fighter = fighter;
    this.root.clear();
    this.parts = {};
    const accent = colorNumber(fighter?.accent, 0xd8ff45);
    const secondary = colorNumber(fighter?.secondary, 0xeef2e8);
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x272d29,
      metalness: 0.88,
      roughness: 0.3,
      emissive: new THREE.Color(accent).multiplyScalar(0.055),
    });
    this.panelMaterial = new THREE.MeshStandardMaterial({
      color: secondary,
      metalness: 0.72,
      roughness: 0.36,
      emissive: new THREE.Color(accent).multiplyScalar(0.025),
    });
    this.darkMaterial = new THREE.MeshStandardMaterial({
      color: 0x090c0b,
      metalness: 0.92,
      roughness: 0.24,
    });
    this.energyMaterial = createEnergyMaterial(accent);

    this.buildCore();
    this.buildWings();
    this.buildEngines();
    this.buildArms();
    this.buildDetails();
    this.setTransform(0);
  }

  register(name, group) {
    group.name = name;
    this.parts[name] = group;
    this.root.add(group);
    return group;
  }

  buildCore() {
    const body = this.register("fuselage", new THREE.Group());
    const bodyMesh = createPanel(this.bodyMaterial, [18, 56, 10]);
    addOutline(bodyMesh);
    body.add(bodyMesh);

    const spine = createPanel(this.panelMaterial, [6, 42, 12]);
    spine.position.z = 6;
    body.add(spine);

    const nose = this.register("nose", new THREE.Group());
    const noseMesh = new THREE.Mesh(new THREE.ConeGeometry(9, 34, 4), this.bodyMaterial);
    noseMesh.rotation.z = Math.PI;
    noseMesh.rotation.y = Math.PI / 4;
    addOutline(noseMesh);
    nose.add(noseMesh);

    const cockpit = this.register("cockpit", new THREE.Group());
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(7, 12, 8, 0, TAU, 0, Math.PI / 2),
      new THREE.MeshPhysicalMaterial({
        color: 0x172327,
        emissive: colorNumber(this.fighter?.accent, 0xd8ff45),
        emissiveIntensity: 0.22,
        metalness: 0.45,
        roughness: 0.12,
        transparent: true,
        opacity: 0.88,
      }),
    );
    canopy.scale.set(0.75, 1.35, 0.55);
    cockpit.add(canopy);

    const core = this.register("core", new THREE.Group());
    this.coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(5.4, 1), this.energyMaterial);
    core.add(this.coreMesh);
  }

  buildWings() {
    [-1, 1].forEach((side) => {
      const wing = this.register(side < 0 ? "leftWing" : "rightWing", new THREE.Group());
      const wingMesh = createPanel(this.bodyMaterial, [38, 20, 4]);
      wingMesh.position.x = side * 18;
      wingMesh.rotation.z = side * -0.24;
      addOutline(wingMesh);
      wing.add(wingMesh);

      const blade = createPanel(this.panelMaterial, [24, 5, 5]);
      blade.position.set(side * 28, -5, 3);
      wing.add(blade);

      const tail = this.register(side < 0 ? "leftTail" : "rightTail", new THREE.Group());
      const tailMesh = createPanel(this.panelMaterial, [8, 20, 4]);
      tailMesh.position.x = side * 13;
      tailMesh.rotation.z = side * -0.3;
      tail.add(tailMesh);
    });
  }

  buildEngines() {
    [-1, 1].forEach((side) => {
      const engine = this.register(side < 0 ? "leftEngine" : "rightEngine", new THREE.Group());
      const housing = createPanel(this.darkMaterial, [10, 28, 11]);
      addOutline(housing, colorNumber(this.fighter?.accent, 0xd8ff45));
      engine.add(housing);
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 3.6, 8, 10), this.energyMaterial);
      exhaust.rotation.x = Math.PI / 2;
      exhaust.position.y = -17;
      engine.add(exhaust);
      engine.userData.exhaust = exhaust;
    });
  }

  buildArms() {
    [-1, 1].forEach((side) => {
      const shoulder = this.register(side < 0 ? "leftShoulder" : "rightShoulder", new THREE.Group());
      const armor = createPanel(this.panelMaterial, [16, 12, 9]);
      armor.rotation.z = side * 0.18;
      addOutline(armor);
      shoulder.add(armor);

      const arm = this.register(side < 0 ? "leftArm" : "rightArm", new THREE.Group());
      const upper = createPanel(this.bodyMaterial, [8, 24, 8]);
      upper.position.y = -7;
      addOutline(upper);
      arm.add(upper);
      const weapon = createPanel(this.panelMaterial, [7, 21, 7]);
      weapon.position.y = -24;
      arm.add(weapon);
      const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.1, 9, 8), this.energyMaterial);
      muzzle.rotation.x = Math.PI / 2;
      muzzle.position.y = -38;
      arm.add(muzzle);
    });
  }

  buildDetails() {
    const crest = this.register("crest", new THREE.Group());
    const crestMesh = createPanel(this.panelMaterial, [3, 16, 4]);
    crestMesh.rotation.z = 0.02;
    crest.add(crestMesh);

    if (this.fighter?.id === "j20" || this.fighter?.id === "gripen") {
      [-1, 1].forEach((side) => {
        const drone = this.register(side < 0 ? "leftDrone" : "rightDrone", new THREE.Group());
        const droneMesh = new THREE.Mesh(new THREE.OctahedronGeometry(5, 0), this.panelMaterial);
        droneMesh.scale.set(1.7, 0.65, 0.45);
        drone.add(droneMesh);
      });
    }
  }

  setTransform(progress) {
    this.progress = Math.max(0, Math.min(1, progress));
    const armor = phase(this.progress, 0.08, 0.34);
    const chest = phase(this.progress, 0.22, 0.5);
    const legs = phase(this.progress, 0.36, 0.68);
    const wings = phase(this.progress, 0.5, 0.82);
    const arms = phase(this.progress, 0.63, 0.9);
    const lock = phase(this.progress, 0.84, 1);

    this.parts.fuselage.position.set(0, mix(0, 8, chest), mix(0, 4, chest));
    this.parts.fuselage.scale.set(mix(1, 1.15, chest), mix(1, 0.68, chest), mix(1, 1.15, chest));

    this.parts.nose.position.set(0, mix(43, 18, chest), mix(0, 10, chest));
    this.parts.nose.rotation.x = mix(0, -1.34, chest);
    this.parts.nose.scale.setScalar(mix(1, 0.78, armor));

    this.parts.cockpit.position.set(0, mix(12, 15, chest), mix(8, 13, chest));
    this.parts.cockpit.rotation.x = mix(0, -0.42, chest);
    this.parts.core.position.set(0, mix(3, 8, lock), mix(6, 16, lock));
    this.parts.core.scale.setScalar(mix(0.52, 1.3, lock));

    [-1, 1].forEach((side) => {
      const wing = this.parts[side < 0 ? "leftWing" : "rightWing"];
      wing.position.set(side * mix(9, 27, wings), mix(0, 15, wings), mix(0, -7, wings));
      wing.rotation.z = side * mix(0, 1.08, wings);
      wing.rotation.y = side * mix(0, 0.52, wings);

      const tail = this.parts[side < 0 ? "leftTail" : "rightTail"];
      tail.position.set(side * mix(7, 15, wings), mix(-25, 19, wings), mix(3, -2, wings));
      tail.rotation.z = side * mix(0, 0.72, wings);

      const engine = this.parts[side < 0 ? "leftEngine" : "rightEngine"];
      engine.position.set(side * mix(7, 11, legs), mix(-26, -39, legs), mix(0, 2, legs));
      engine.rotation.x = mix(0, -0.12, legs);
      engine.rotation.z = side * mix(0, 0.08, legs);

      const shoulder = this.parts[side < 0 ? "leftShoulder" : "rightShoulder"];
      shoulder.position.set(side * mix(22, 17, arms), mix(0, 10, arms), mix(-1, 7, arms));
      shoulder.rotation.z = side * mix(0.12, 0.38, arms);
      shoulder.scale.setScalar(mix(0.35, 1, arms));

      const arm = this.parts[side < 0 ? "leftArm" : "rightArm"];
      arm.position.set(side * mix(28, 22, arms), mix(-1, -5, arms), mix(0, 4, arms));
      arm.rotation.z = side * mix(Math.PI / 2, 0.12, arms);
      arm.scale.setScalar(mix(0.25, 1, arms));

      const drone = this.parts[side < 0 ? "leftDrone" : "rightDrone"];
      if (drone) {
        drone.position.set(side * mix(21, 42, wings), mix(-2, 4, wings), mix(4, 10, wings));
        drone.rotation.z = side * (this.time * 0.7 + wings * 0.6);
        drone.scale.setScalar(mix(0.2, 1, wings));
      }
    });

    this.parts.crest.position.set(0, mix(-19, 25, lock), mix(2, 14, lock));
    this.parts.crest.rotation.x = mix(Math.PI / 2, 0, lock);
    this.parts.crest.scale.setScalar(mix(0.2, 1, lock));

    const spread = this.fighter?.id === "su57" ? 1.12 : this.fighter?.id === "gripen" ? 0.88 : 1;
    this.root.scale.set(spread, 1, 1);
  }

  update(time, transform, overdrive = 0) {
    this.time = time;
    this.setTransform(transform);
    const pulse = 1 + Math.sin(time * 8) * 0.08 + overdrive * 0.04;
    this.coreMesh.rotation.y = time * 1.9;
    this.coreMesh.rotation.z = time * 1.25;
    this.coreMesh.scale.setScalar(pulse);
    this.energyMaterial.uniforms.time.value = time;
    this.energyMaterial.uniforms.intensity.value = 1 + transform * 0.9 + Math.min(1, overdrive) * 0.8;
    ["leftEngine", "rightEngine"].forEach((name) => {
      const exhaust = this.parts[name]?.userData.exhaust;
      if (exhaust) exhaust.scale.y = 0.85 + Math.random() * 0.34 + overdrive * 0.16;
    });
  }
}

class BossRig {
  constructor() {
    this.root = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(46, 74, 16),
      new THREE.MeshStandardMaterial({ color: 0x521825, metalness: 0.86, roughness: 0.3 }),
    );
    addOutline(body, 0xff6b73);
    this.root.add(body);
    this.wings = [];
    this.pods = [];
    [-1, 1].forEach((side) => {
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(68, 20, 8),
        new THREE.MeshStandardMaterial({ color: 0x7a2332, metalness: 0.8, roughness: 0.34 }),
      );
      wing.position.x = side * 46;
      wing.rotation.z = side * 0.18;
      addOutline(wing, 0xff9d61);
      this.root.add(wing);
      this.wings.push(wing);
      const pod = new THREE.Mesh(new THREE.BoxGeometry(20, 32, 14), new THREE.MeshStandardMaterial({
        color: 0xc2394f,
        emissive: 0x3b050c,
        metalness: 0.72,
        roughness: 0.32,
      }));
      pod.position.set(side * 68, -4, 3);
      this.root.add(pod);
      this.pods.push(pod);
    });
    this.coreMaterial = createEnergyMaterial(0xff365f);
    this.core = new THREE.Mesh(new THREE.IcosahedronGeometry(12, 1), this.coreMaterial);
    this.core.position.z = 13;
    this.root.add(this.core);
  }

  update(time, phaseValue, parts) {
    const phaseAmount = Math.max(0, Math.min(1, (phaseValue - 1) / 2));
    this.wings.forEach((wing, index) => {
      const side = index === 0 ? -1 : 1;
      wing.position.x = side * mix(46, 63, phaseAmount);
      wing.rotation.z = side * mix(0.18, 0.58, phaseAmount);
    });
    this.pods.forEach((pod, index) => {
      const key = index === 0 ? "left" : "right";
      pod.visible = !parts?.[key]?.destroyed;
      pod.position.x = (index === 0 ? -1 : 1) * mix(68, 82, phaseAmount);
    });
    this.core.scale.setScalar(mix(0.72, 1.35, phaseAmount) * (1 + Math.sin(time * 7) * 0.07));
    this.core.rotation.y = time;
    this.coreMaterial.uniforms.time.value = time;
    this.coreMaterial.uniforms.intensity.value = 1.1 + phaseAmount;
  }
}

function setupRenderer(canvas, alpha = true) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  return renderer;
}

function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xb8d8d0, 0x14110e, 1.55));
  const key = new THREE.DirectionalLight(0xffffff, 2.7);
  key.position.set(-70, 90, 130);
  scene.add(key);
  const rim = new THREE.PointLight(0xd8ff45, 18, 260, 2);
  rim.position.set(80, -30, 65);
  scene.add(rim);
  const danger = new THREE.PointLight(0xff4d3d, 11, 230, 2);
  danger.position.set(-90, 20, 35);
  scene.add(danger);
}

export function createVisualSystem({ hangarCanvas, battleCanvas, fighter, reducedMotion = false }) {
  try {
    const hangarRenderer = setupRenderer(hangarCanvas, true);
    const battleRenderer = setupRenderer(battleCanvas, true);
    const hangarScene = new THREE.Scene();
    const battleScene = new THREE.Scene();
    addLights(hangarScene);
    addLights(battleScene);

    const hangarCamera = new THREE.PerspectiveCamera(34, 2.4, 0.1, 1000);
    hangarCamera.position.set(0, -175, 125);
    hangarCamera.lookAt(0, 4, 0);

    const battleCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    battleCamera.position.set(0, 0, 500);
    battleCamera.lookAt(0, 0, 0);

    const hangarRig = new FighterRig(fighter, { hangar: true });
    hangarRig.root.rotation.x = 0.12;
    hangarScene.add(hangarRig.root);

    const battleRig = new FighterRig(fighter);
    battleScene.add(battleRig.root);
    const bossRig = new BossRig();
    bossRig.root.visible = false;
    battleScene.add(bossRig.root);

    let hangarComposer = null;
    if (!reducedMotion) {
      hangarComposer = new EffectComposer(hangarRenderer);
      hangarComposer.addPass(new RenderPass(hangarScene, hangarCamera));
      hangarComposer.addPass(new UnrealBloomPass(new THREE.Vector2(800, 320), 0.3, 0.32, 0.38));
    }

    let selectedFighter = fighter;
    let previewStart = performance.now();
    let hangarFrame = 0;

    function resizeRenderer(renderer, canvas) {
      const width = Math.max(1, Math.floor(canvas.clientWidth));
      const height = Math.max(1, Math.floor(canvas.clientHeight));
      const dpr = Math.min(window.devicePixelRatio || 1, width < 500 ? 1.25 : 1.6);
      const targetWidth = Math.floor(width * dpr);
      const targetHeight = Math.floor(height * dpr);
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        renderer.setPixelRatio(dpr);
        renderer.setSize(width, height, false);
        return { width, height, changed: true };
      }
      return { width, height, changed: false };
    }

    function renderHangar(now) {
      const size = resizeRenderer(hangarRenderer, hangarCanvas);
      hangarCamera.aspect = size.width / size.height;
      hangarCamera.updateProjectionMatrix();
      if (size.changed && hangarComposer) hangarComposer.setSize(size.width, size.height);
      const seconds = now / 1000;
      const age = (now - previewStart) / 1000;
      const previewTransform = reducedMotion ? 1 : age < 0.35 ? 0 : age < 1.8 ? smoothstep((age - 0.35) / 1.45) : 1;
      hangarRig.update(seconds, previewTransform, 0);
      hangarRig.root.rotation.y = Math.sin(seconds * 0.45) * 0.11;
      hangarRig.root.position.y = Math.sin(seconds * 1.2) * 2;
      if (hangarComposer) hangarComposer.render();
      else hangarRenderer.render(hangarScene, hangarCamera);
      hangarFrame = requestAnimationFrame(renderHangar);
    }
    hangarFrame = requestAnimationFrame(renderHangar);

    return {
      available: true,
      setFighter(nextFighter) {
        if (!nextFighter || nextFighter.id === selectedFighter?.id) return;
        selectedFighter = nextFighter;
        hangarRig.setFighter(nextFighter);
        battleRig.setFighter(nextFighter);
        previewStart = performance.now();
      },
      resizeBattle(width, height) {
        resizeRenderer(battleRenderer, battleCanvas);
        battleCamera.left = -width / 2;
        battleCamera.right = width / 2;
        battleCamera.top = height / 2;
        battleCamera.bottom = -height / 2;
        battleCamera.updateProjectionMatrix();
      },
      renderBattle(state, currentFighter) {
        this.setFighter(currentFighter);
        const seconds = state.elapsed || performance.now() / 1000;
        battleRig.root.visible = state.running || state.ended;
        battleRig.root.position.set(
          state.player.x - state.width / 2,
          state.height / 2 - state.player.y,
          12,
        );
        battleRig.root.rotation.x = mix(0.04, -0.16, state.transformProgress || 0);
        battleRig.root.rotation.y = Math.max(-0.18, Math.min(0.18, (state.pointer.x - state.player.x) / 180));
        battleRig.update(seconds, state.transformProgress || 0, state.overdrive || 0);
        const fighterScale = mix(0.78, 0.92, state.transformProgress || 0);
        battleRig.root.scale.multiplyScalar(fighterScale);

        const boss = state.enemies.find((enemy) => enemy.type === "boss");
        bossRig.root.visible = Boolean(boss);
        if (boss) {
          bossRig.root.position.set(boss.x - state.width / 2, state.height / 2 - boss.y, 5);
          bossRig.root.scale.setScalar(0.82);
          bossRig.update(seconds, boss.bossPhase || 1, boss.parts);
        }
        battleRenderer.render(battleScene, battleCamera);
      },
      dispose() {
        cancelAnimationFrame(hangarFrame);
        hangarRenderer.dispose();
        battleRenderer.dispose();
      },
    };
  } catch (error) {
    console.warn("Three.js visual system unavailable; using Canvas fallback.", error);
    return {
      available: false,
      setFighter() {},
      resizeBattle() {},
      renderBattle() {},
      dispose() {},
    };
  }
}
