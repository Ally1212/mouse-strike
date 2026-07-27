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
    this.rig = fighter?.rig || {};
    this.profile = this.rig.profile || "hunter";
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
    const bodySize = this.rig.body || [18, 56, 10];
    const body = this.register("fuselage", new THREE.Group());
    const bodyMesh = createPanel(this.bodyMaterial, bodySize);
    addOutline(bodyMesh);
    body.add(bodyMesh);

    const spine = createPanel(this.panelMaterial, [Math.max(5, bodySize[0] * 0.34), bodySize[1] * 0.74, bodySize[2] * 1.18]);
    spine.position.z = bodySize[2] * 0.58;
    body.add(spine);

    const nose = this.register("nose", new THREE.Group());
    const noseMesh = new THREE.Mesh(
      new THREE.ConeGeometry(bodySize[0] * 0.48, bodySize[1] * 0.6, this.profile === "dualist" ? 6 : 4),
      this.bodyMaterial,
    );
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
    const canopyScale = this.profile === "siege" ? 0.9 : this.profile === "skirmisher" ? 0.68 : 0.78;
    canopy.scale.set(canopyScale, 1.35, 0.55);
    cockpit.add(canopy);

    const core = this.register("core", new THREE.Group());
    this.coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(5.4, 1), this.energyMaterial);
    core.add(this.coreMesh);
  }

  buildWings() {
    const wingSize = this.rig.wing || [38, 20, 4];
    [-1, 1].forEach((side) => {
      const wing = this.register(side < 0 ? "leftWing" : "rightWing", new THREE.Group());
      const wingMesh = createPanel(this.bodyMaterial, wingSize);
      wingMesh.position.x = side * wingSize[0] * 0.46;
      wingMesh.rotation.z = side * (this.profile === "skirmisher" ? -0.42 : -0.24);
      addOutline(wingMesh);
      wing.add(wingMesh);

      const blade = createPanel(this.panelMaterial, [wingSize[0] * 0.64, Math.max(4, wingSize[1] * 0.24), wingSize[2] + 1]);
      blade.position.set(side * wingSize[0] * 0.72, -wingSize[1] * 0.24, wingSize[2] * 0.7);
      wing.add(blade);

      const tail = this.register(side < 0 ? "leftTail" : "rightTail", new THREE.Group());
      const tailMesh = createPanel(this.panelMaterial, [8, 20, 4]);
      tailMesh.position.x = side * 13;
      tailMesh.rotation.z = side * -0.3;
      tail.add(tailMesh);
    });
  }

  buildEngines() {
    const engineSize = this.rig.engines || 8;
    [-1, 1].forEach((side) => {
      const engine = this.register(side < 0 ? "leftEngine" : "rightEngine", new THREE.Group());
      const housing = createPanel(this.darkMaterial, [engineSize + 2, 24 + engineSize * 0.55, engineSize + 3]);
      addOutline(housing, colorNumber(this.fighter?.accent, 0xd8ff45));
      engine.add(housing);
      const exhaust = new THREE.Mesh(
        new THREE.CylinderGeometry(engineSize * 0.52, engineSize * 0.4, 7 + engineSize * 0.25, 10),
        this.energyMaterial,
      );
      exhaust.rotation.x = Math.PI / 2;
      exhaust.position.y = -17;
      engine.add(exhaust);
      engine.userData.exhaust = exhaust;
    });
  }

  buildArms() {
    const shoulderSize = this.rig.shoulders || [16, 12, 9];
    const armLength = this.rig.arms || 24;
    [-1, 1].forEach((side) => {
      const shoulder = this.register(side < 0 ? "leftShoulder" : "rightShoulder", new THREE.Group());
      const armor = createPanel(this.panelMaterial, shoulderSize);
      armor.rotation.z = side * 0.18;
      addOutline(armor);
      shoulder.add(armor);

      const arm = this.register(side < 0 ? "leftArm" : "rightArm", new THREE.Group());
      const upper = createPanel(this.bodyMaterial, [Math.max(7, shoulderSize[0] * 0.48), armLength, Math.max(7, shoulderSize[2] * 0.86)]);
      upper.position.y = -7;
      addOutline(upper);
      arm.add(upper);
      const weaponWidth = this.profile === "lancer" ? 5 : this.profile === "siege" ? 10 : 7;
      const weaponLength = this.profile === "lancer" ? armLength * 1.45 : armLength * 0.88;
      const weapon = createPanel(this.panelMaterial, [weaponWidth, weaponLength, weaponWidth]);
      weapon.position.y = -armLength * 0.96;
      arm.add(weapon);
      const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.1, 9, 8), this.energyMaterial);
      muzzle.rotation.x = Math.PI / 2;
      muzzle.position.y = -armLength * 1.58;
      arm.add(muzzle);
    });
  }

  buildDetails() {
    const crest = this.register("crest", new THREE.Group());
    const crestMesh = createPanel(this.panelMaterial, [3, 16, 4]);
    crestMesh.rotation.z = 0.02;
    crest.add(crestMesh);

    this.droneNames = [];
    if (this.profile === "commander" || this.profile === "skirmisher") {
      const droneCount = this.profile === "commander" ? 4 : 2;
      for (let index = 0; index < droneCount; index += 1) {
        const drone = this.register(`drone${index}`, new THREE.Group());
        const droneMesh = new THREE.Mesh(new THREE.OctahedronGeometry(5, 0), this.panelMaterial);
        droneMesh.scale.set(1.7, 0.65, 0.45);
        drone.add(droneMesh);
        this.droneNames.push(`drone${index}`);
      }
    }

    if (this.profile === "hunter") {
      [-1, 1].forEach((side) => {
        const pod = this.register(side < 0 ? "leftPod" : "rightPod", new THREE.Group());
        const rack = createPanel(this.darkMaterial, [9, 23, 8]);
        rack.position.z = 3;
        pod.add(rack);
        for (let slot = -1; slot <= 1; slot += 1) {
          const seeker = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.6, 12, 6), this.energyMaterial);
          seeker.rotation.x = Math.PI / 2;
          seeker.position.set(slot * 2.8, -9, 5);
          pod.add(seeker);
        }
      });
    } else if (this.profile === "lancer") {
      const lance = this.register("lance", new THREE.Group());
      const shaft = createPanel(this.panelMaterial, [5, 72, 6]);
      shaft.position.y = -25;
      lance.add(shaft);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(4, 24, 4), this.energyMaterial);
      tip.rotation.z = Math.PI;
      tip.position.y = -73;
      lance.add(tip);
    } else if (this.profile === "dualist") {
      [-1, 1].forEach((side) => {
        const ring = this.register(side < 0 ? "leftRing" : "rightRing", new THREE.Group());
        const emitter = new THREE.Mesh(new THREE.TorusGeometry(8, 1.8, 8, 24), this.energyMaterial);
        ring.add(emitter);
      });
    } else if (this.profile === "siege") {
      [-1, 1].forEach((side) => {
        const cannon = this.register(side < 0 ? "leftCannon" : "rightCannon", new THREE.Group());
        const barrel = createPanel(this.darkMaterial, [12, 42, 13]);
        cannon.add(barrel);
        const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(4, 5.5, 11, 10), this.energyMaterial);
        muzzle.rotation.x = Math.PI / 2;
        muzzle.position.y = -25;
        cannon.add(muzzle);
      });
    } else if (this.profile === "commander") {
      const commandFin = this.register("commandFin", new THREE.Group());
      const fin = createPanel(this.panelMaterial, [5, 30, 15]);
      fin.rotation.x = 0.34;
      commandFin.add(fin);
    }
  }

  setTransform(progress) {
    this.progress = Math.max(0, Math.min(1, progress));
    const phases = this.rig.phases || {};
    const readPhase = (name, fallback) => phase(this.progress, ...(phases[name] || fallback));
    const armor = readPhase("armor", [0.08, 0.34]);
    const chest = readPhase("chest", [0.22, 0.5]);
    const legs = readPhase("legs", [0.36, 0.68]);
    const wings = readPhase("wings", [0.5, 0.82]);
    const arms = readPhase("arms", [0.63, 0.9]);
    const lock = readPhase("lock", [0.84, 1]);
    const poses = {
      hunter: { wingX: 29, wingY: 14, wingZ: 1.18, wingTilt: 0.56, armX: 21, armZ: 0.08, tailX: 15 },
      lancer: { wingX: 24, wingY: 19, wingZ: 0.78, wingTilt: 0.28, armX: 9, armZ: 0.02, tailX: 12 },
      dualist: { wingX: 31, wingY: 10, wingZ: 1.34, wingTilt: 0.62, armX: 29, armZ: 0.48, tailX: 18 },
      skirmisher: { wingX: 25, wingY: 18, wingZ: 1.5, wingTilt: 0.72, armX: 18, armZ: 0.28, tailX: 12 },
      siege: { wingX: 36, wingY: 8, wingZ: 0.68, wingTilt: 0.24, armX: 29, armZ: 0.05, tailX: 21 },
      commander: { wingX: 30, wingY: 17, wingZ: 1.04, wingTilt: 0.42, armX: 23, armZ: 0.18, tailX: 19 },
    };
    const pose = poses[this.profile] || poses.hunter;

    this.parts.fuselage.position.set(0, mix(0, 8, chest), mix(0, 4, chest));
    const chestWidth = this.profile === "siege" ? 1.32 : this.profile === "skirmisher" ? 1.04 : 1.15;
    this.parts.fuselage.scale.set(mix(1, chestWidth, chest), mix(1, 0.68, chest), mix(1, 1.15, chest));

    this.parts.nose.position.set(0, mix(43, 18, chest), mix(0, 10, chest));
    this.parts.nose.rotation.x = mix(0, -1.34, chest);
    this.parts.nose.scale.setScalar(mix(1, 0.78, armor));

    this.parts.cockpit.position.set(0, mix(12, 15, chest), mix(8, 13, chest));
    this.parts.cockpit.rotation.x = mix(0, -0.42, chest);
    this.parts.core.position.set(0, mix(3, 8, lock), mix(6, 16, lock));
    this.parts.core.scale.setScalar(mix(0.52, 1.3, lock));

    [-1, 1].forEach((side) => {
      const wing = this.parts[side < 0 ? "leftWing" : "rightWing"];
      wing.position.set(side * mix(9, pose.wingX, wings), mix(0, pose.wingY, wings), mix(0, -7, wings));
      wing.rotation.z = side * mix(0, pose.wingZ, wings);
      wing.rotation.y = side * mix(0, pose.wingTilt, wings);

      const tail = this.parts[side < 0 ? "leftTail" : "rightTail"];
      tail.position.set(side * mix(7, pose.tailX, wings), mix(-25, 19, wings), mix(3, -2, wings));
      tail.rotation.z = side * mix(0, 0.72, wings);

      const engine = this.parts[side < 0 ? "leftEngine" : "rightEngine"];
      engine.position.set(side * mix(7, 11, legs), mix(-26, -39, legs), mix(0, 2, legs));
      engine.rotation.x = mix(0, -0.12, legs);
      engine.rotation.z = side * mix(0, 0.08, legs);

      const shoulder = this.parts[side < 0 ? "leftShoulder" : "rightShoulder"];
      const shoulderX = this.profile === "siege" ? 24 : 17;
      shoulder.position.set(side * mix(22, shoulderX, arms), mix(0, 10, arms), mix(-1, 7, arms));
      shoulder.rotation.x = 0;
      shoulder.rotation.z = side * mix(0.12, 0.38, arms);
      shoulder.scale.setScalar(mix(0.35, 1, arms));

      const arm = this.parts[side < 0 ? "leftArm" : "rightArm"];
      arm.position.set(side * mix(28, pose.armX, arms), mix(-1, -5, arms), mix(0, 4, arms));
      arm.rotation.z = side * mix(Math.PI / 2, pose.armZ, arms);
      arm.scale.setScalar(mix(0.25, 1, arms));
    });

    this.droneNames.forEach((name, index) => {
      const drone = this.parts[name];
      const side = index % 2 === 0 ? -1 : 1;
      const rank = Math.floor(index / 2);
      drone.position.set(
        side * mix(20 + rank * 5, 38 + rank * 15, wings),
        mix(-8 - rank * 5, 5 + rank * 8, wings),
        mix(2, 11 + rank * 3, wings),
      );
      drone.rotation.z = side * (this.time * (0.7 + rank * 0.16) + wings * 0.6);
      drone.scale.setScalar(mix(0.2, 1 - rank * 0.08, wings));
    });

    this.parts.crest.position.set(0, mix(-19, 25, lock), mix(2, 14, lock));
    this.parts.crest.rotation.x = mix(Math.PI / 2, 0, lock);
    this.parts.crest.scale.setScalar(mix(0.2, 1, lock));

    if (this.parts.leftPod) {
      [-1, 1].forEach((side) => {
        const pod = this.parts[side < 0 ? "leftPod" : "rightPod"];
        pod.position.set(side * mix(18, 25, arms), mix(-5, 12, arms), mix(1, 9, arms));
        pod.rotation.z = side * mix(0.08, 0.32, arms);
        pod.scale.setScalar(mix(0.45, 1, arms));
      });
    }
    if (this.parts.lance) {
      this.parts.lance.position.set(0, mix(-8, -4, lock), mix(-3, 14, lock));
      this.parts.lance.scale.setScalar(mix(0.15, 1, lock));
    }
    if (this.parts.leftRing) {
      [-1, 1].forEach((side) => {
        const ring = this.parts[side < 0 ? "leftRing" : "rightRing"];
        ring.position.set(side * mix(20, 34, arms), mix(-10, -28, arms), mix(0, 8, arms));
        ring.rotation.y = side * mix(0, 0.42, arms);
        ring.rotation.z = 0;
        ring.scale.setScalar(mix(0.2, 1, arms));
      });
    }
    if (this.parts.leftCannon) {
      [-1, 1].forEach((side) => {
        const cannon = this.parts[side < 0 ? "leftCannon" : "rightCannon"];
        cannon.position.set(side * mix(15, 25, armor), mix(-2, 10, armor), mix(-4, 10, armor));
        cannon.rotation.z = side * mix(Math.PI / 2, 0.05, armor);
        cannon.scale.setScalar(mix(0.35, 1, armor));
      });
    }
    if (this.parts.commandFin) {
      this.parts.commandFin.position.set(0, mix(-20, 22, lock), mix(0, 11, lock));
      this.parts.commandFin.rotation.x = mix(Math.PI / 2, 0, lock);
      this.parts.commandFin.scale.setScalar(mix(0.2, 1, lock));
    }

    const spread = this.profile === "siege" ? 1.08 : this.profile === "skirmisher" ? 0.9 : 1;
    const baseScale = this.rig.cameraScale || 1;
    this.root.scale.set(baseScale * spread, baseScale, baseScale);
  }

  applyAction(action, time) {
    if (action !== "tactical") return;
    const recoil = (Math.sin(time * 8) + 1) * 0.5;
    if (this.profile === "hunter") {
      this.parts.leftPod.rotation.x = -0.18 - recoil * 0.16;
      this.parts.rightPod.rotation.x = -0.18 - recoil * 0.16;
    } else if (this.profile === "lancer") {
      this.parts.lance.position.y -= recoil * 9;
      this.parts.lance.scale.y = 1 + recoil * 0.16;
    } else if (this.profile === "dualist") {
      this.parts.leftRing.rotation.z = time * 2.4;
      this.parts.rightRing.rotation.z = -time * 2.4;
    } else if (this.profile === "skirmisher" || this.profile === "commander") {
      this.droneNames.forEach((name, index) => {
        const drone = this.parts[name];
        drone.position.x *= 1.12 + recoil * 0.12;
        drone.position.y += Math.sin(time * 5 + index) * 4;
      });
    } else if (this.profile === "siege") {
      this.parts.leftCannon.position.y += recoil * 6;
      this.parts.rightCannon.position.y += recoil * 6;
      this.parts.leftShoulder.rotation.x = -recoil * 0.16;
      this.parts.rightShoulder.rotation.x = -recoil * 0.16;
    }
  }

  update(time, transform, overdrive = 0, action = "idle") {
    this.time = time;
    this.setTransform(transform);
    const pulse = 1 + Math.sin(time * 8) * 0.08 + overdrive * 0.04;
    this.coreMesh.rotation.y = time * 1.9;
    this.coreMesh.rotation.z = time * 1.25;
    this.coreMesh.scale.setScalar(pulse);
    this.energyMaterial.uniforms.time.value = time;
    this.energyMaterial.uniforms.intensity.value = 1 + transform * 0.9 + Math.min(1, overdrive) * 0.8;
    this.applyAction(action, time);
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
    let previewMode = "transform";
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
      const enterDuration = selectedFighter?.transformDuration || 1.45;
      const restoreDuration = selectedFighter?.restoreDuration || 0.9;
      let previewTransform = 0;
      if (previewMode === "assault" || previewMode === "tactical") {
        previewTransform = 1;
      } else if (previewMode === "transform") {
        if (reducedMotion) {
          previewTransform = 0.72;
        } else {
          const hold = 0.6;
          const cycle = enterDuration + restoreDuration + hold * 2;
          const cycleTime = age % cycle;
          previewTransform = cycleTime < enterDuration
            ? smoothstep(cycleTime / enterDuration)
            : cycleTime < enterDuration + hold
              ? 1
              : cycleTime < enterDuration + hold + restoreDuration
                ? 1 - smoothstep((cycleTime - enterDuration - hold) / restoreDuration)
                : 0;
        }
      }
      hangarRig.update(seconds, previewTransform, previewMode === "tactical" ? 0.85 : 0, previewMode);
      const profileYaw = selectedFighter?.rig?.profile === "lancer" ? 0.08 : selectedFighter?.rig?.profile === "siege" ? -0.06 : 0;
      hangarRig.root.rotation.y = profileYaw + Math.sin(seconds * 0.45) * 0.11;
      hangarRig.root.rotation.x = previewMode === "flight" ? 0.2 : previewMode === "tactical" ? -0.08 : 0.12;
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
      setPreviewMode(nextMode) {
        previewMode = ["flight", "transform", "assault", "tactical"].includes(nextMode) ? nextMode : "transform";
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
      setPreviewMode() {},
      resizeBattle() {},
      renderBattle() {},
      dispose() {},
    };
  }
}
