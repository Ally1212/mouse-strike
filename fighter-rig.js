import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
        float rim = pow(1.0 - max(0.0, dot(viewDir, vNormal)), 3.1);
        float pulse = 0.22 + sin(time * 6.0) * 0.025;
        vec3 glow = color * (pulse + rim * 0.42) * intensity;
        gl_FragColor = vec4(glow, 0.48);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function createPanel(material, size, bevel = 0) {
  const radius = Math.min(size[0], size[1], size[2]) * 0.18;
  const geometry = new RoundedBoxGeometry(size[0], size[1], size[2], 3, radius);
  const mesh = new THREE.Mesh(geometry, material);
  if (bevel) {
    mesh.geometry.translate(0, bevel, 0);
  }
  return mesh;
}

function createPlanform(material, { span, chord, thickness, side, sweep = 0.34, taper = 0.58, curve = 0 }) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -chord * 0.48);
  shape.lineTo(side * span, -chord * 0.48 + chord * sweep);
  if (curve > 0) {
    shape.quadraticCurveTo(side * span * (0.96 + curve * 0.08), chord * (0.08 + curve), side * span * taper, chord * 0.5);
  } else {
    shape.lineTo(side * span * taper, chord * 0.5);
  }
  shape.lineTo(0, chord * 0.34);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: Math.min(0.8, thickness * 0.16),
    bevelThickness: Math.min(0.7, thickness * 0.14),
  });
  geometry.translate(0, 0, -thickness / 2);
  return new THREE.Mesh(geometry, material);
}

function createFuselage(material, { width, length, height, tailWidth = 0.45 }) {
  const sections = [
    { y: length * 0.5, width: width * 0.08, height: height * 0.18 },
    { y: length * 0.28, width: width * 0.58, height: height * 0.82 },
    { y: length * 0.02, width, height },
    { y: -length * 0.3, width: width * 0.86, height: height * 0.86 },
    { y: -length * 0.5, width: width * tailWidth, height: height * 0.62 },
  ];
  const ringSize = 12;
  const vertices = [];
  const indices = [];
  sections.forEach((section) => {
    for (let ring = 0; ring < ringSize; ring += 1) {
      const angle = (ring / ringSize) * TAU;
      vertices.push(
        Math.cos(angle) * section.width * 0.5,
        section.y,
        Math.sin(angle) * section.height * 0.5,
      );
    }
  });
  for (let section = 0; section < sections.length - 1; section += 1) {
    for (let ring = 0; ring < ringSize; ring += 1) {
      const nextRing = (ring + 1) % ringSize;
      const a = section * ringSize + ring;
      const b = section * ringSize + nextRing;
      const c = (section + 1) * ringSize + nextRing;
      const d = (section + 1) * ringSize + ring;
      indices.push(a, b, d, b, c, d);
    }
  }
  for (let ring = 1; ring < ringSize - 1; ring += 1) {
    indices.push(0, ring, ring + 1);
    const tailStart = (sections.length - 1) * ringSize;
    indices.push(tailStart, tailStart + ring + 1, tailStart + ring);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

function createWedgeNose(material, { width, length, height }) {
  const halfWidth = width * 0.5;
  const front = length * 0.5;
  const back = -length * 0.5;
  const vertices = [
    0, front, 0,
    -halfWidth, back, height * 0.38,
    halfWidth, back, height * 0.38,
    -halfWidth * 0.82, back, -height * 0.48,
    halfWidth * 0.82, back, -height * 0.48,
  ];
  const indices = [
    0, 2, 1,
    0, 4, 2,
    0, 3, 4,
    0, 1, 3,
    1, 2, 4,
    1, 4, 3,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

function createFin(material, { chord, height, thickness, sweep = 0.18 }) {
  const shape = new THREE.Shape();
  shape.moveTo(-chord * 0.5, 0);
  shape.lineTo(chord * 0.5, 0);
  shape.lineTo(chord * (0.12 - sweep), height);
  shape.lineTo(-chord * (0.3 + sweep * 0.25), height * 0.84);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: Math.min(0.6, thickness * 0.16),
    bevelThickness: Math.min(0.5, thickness * 0.12),
  });
  const position = geometry.getAttribute("position");
  for (let index = 0; index < position.count; index += 1) {
    const originalX = position.getX(index);
    const originalY = position.getY(index);
    const originalZ = position.getZ(index) - thickness / 2;
    position.setXYZ(index, originalZ, originalX, originalY);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

const ASSAULT_POSES = {
  falcon: {
    body: [0, 8, 5], bodyScale: [1.08, 0.68, 1.18], nose: [0, 20, 14], noseRotation: [-1.28, 0, 0],
    cockpit: [0, 15, 16], core: [0, 8, 18], wing: [34, 10, 0, 0.12, 0.7, 1.78],
    engine: [11, -38, 2, -0.12, 0, 0.12], shoulder: [20, 11, 8, 0, 0, 0.58],
    arm: [27, -5, 8, 0, 0.12, 0.58], tail: [19, 23, 5, 0, 0, 0.92], canard: [14, 16, 12, 0, 0.42, 0.82],
    rootScale: [1, 1.02, 1],
  },
  specter: {
    body: [0, 4, 5], bodyScale: [1.42, 0.78, 1.04], nose: [0, 28, 9], noseRotation: [-0.5, 0, 0],
    cockpit: [0, 16, 13], core: [0, 5, 17], wing: [44, 2, 8, 0.04, 0.22, 0.34],
    engine: [21, -29, 3, -0.18, 0, 0.32], shoulder: [31, 7, 7, 0, 0, 1.12],
    arm: [38, 14, 3, 0, 0, 0.18], tail: [0, 0, 0, 0, 0, 0], canard: [0, 0, 0, 0, 0, 0],
    rootScale: [1.08, 0.94, 1],
  },
  hunter: {
    body: [0, 8, 4], bodyScale: [1.22, 0.66, 1.16], nose: [0, 17, 12], noseRotation: [-1.42, 0, 0],
    cockpit: [0, 14, 14], core: [0, 8, 17], wing: [30, 9, -6, 0.08, 0.62, 1.08],
    engine: [9, -40, 2, -0.1, 0, 0.08], shoulder: [18, 10, 7, 0, 0, 0.42],
    arm: [22, -7, 5, 0, 0, 0.12], tail: [16, 20, -1, 0, 0, 0.78], canard: [13, 17, 10, 0, 0.32, 0.72],
    rootScale: [1.04, 1, 1],
  },
  lancer: {
    body: [0, 5, 5], bodyScale: [0.92, 0.78, 1.28], nose: [0, 27, 11], noseRotation: [-1.02, 0, 0],
    cockpit: [0, 16, 15], core: [0, 8, 18], wing: [22, 1, -3, 0, 0.18, 1.5],
    engine: [7, -42, 2, -0.08, 0, 0.03], shoulder: [13, 12, 8, 0, 0, 0.2],
    arm: [10, -7, 7, 0, 0, 0.03], tail: [0, 29, 0, -0.3, 0, 0], canard: [12, 23, 12, 0, 0.1, 0.2],
    rootScale: [0.9, 1.05, 1],
  },
  dualist: {
    body: [0, 7, 6], bodyScale: [1.14, 0.72, 1.16], nose: [0, 18, 13], noseRotation: [-1.35, 0, 0],
    cockpit: [0, 14, 15], core: [0, 8, 18], wing: [35, 12, -5, 0.18, 0.8, 1.72],
    engine: [14, -35, 2, -0.12, 0, 0.22], shoulder: [22, 9, 8, 0, 0, 0.72],
    arm: [31, -3, 8, 0, 0, 0.72], tail: [0, 25, 0, -0.44, 0, 0], canard: [26, 2, 13, 0, 0.44, 1.22],
    rootScale: [1.04, 0.98, 1],
  },
  skirmisher: {
    body: [0, 10, 6], bodyScale: [0.82, 0.8, 1.2], nose: [0, 21, 13], noseRotation: [-1.28, 0, 0],
    cockpit: [0, 16, 15], core: [0, 10, 19], wing: [27, 19, 7, 0.1, 0.92, 2.02],
    centerEngine: [0, -39, 3, -0.08, 0, 0], shoulder: [15, 12, 9, 0, 0, 0.62],
    arm: [18, -4, 8, 0, 0, 0.42], tail: [0, 28, 1, -0.52, 0, 0], canard: [20, 8, 14, 0, 0.5, 1.3],
    rootScale: [0.92, 1.08, 1],
  },
  siege: {
    body: [0, 2, 5], bodyScale: [1.48, 0.9, 1.14], nose: [0, 31, 8], noseRotation: [-0.36, 0, 0],
    cockpit: [0, 14, 13], core: [0, 3, 17], wing: [39, -3, 5, 0.04, 0.22, 0.28],
    engine: [19, -29, 1, -0.22, 0, 0.28], shoulder: [29, 15, 8, 0, 0, 1.24],
    arm: [33, 22, -2, 0, 0, 0.08], tail: [22, -1, 10, 0, 0, 0.34], canard: [16, 18, 9, 0, 0.18, 0.3],
    rootScale: [1.08, 0.9, 1],
  },
  commander: {
    body: [0, 9, 6], bodyScale: [1.04, 0.7, 1.26], nose: [0, 24, 16], noseRotation: [-1.16, 0, 0],
    cockpit: [0, 17, 17], core: [0, 9, 20], wing: [38, 15, 1, 0.18, 0.76, 1.72],
    engine: [10, -41, 3, -0.1, 0, 0.1], shoulder: [20, 12, 9, 0, 0, 0.46],
    arm: [13, -2, 9, 0, 0, 0.12], tail: [21, 23, 6, 0, 0, 0.78], canard: [31, 20, 18, 0, 0.82, 1.3],
    rootScale: [0.98, 1.03, 1],
  },
};

function addOutline(mesh, color = 0xa8b49e) {
  const edges = new THREE.EdgesGeometry(mesh.geometry, 38);
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.1 }),
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
    this.pose = ASSAULT_POSES[this.profile] || ASSAULT_POSES.hunter;
    this.toolModeIndex = 0;
    this.root.clear();
    this.parts = {};
    const accent = colorNumber(fighter?.accent, 0xd8ff45);
    const secondary = colorNumber(fighter?.secondary, 0xeef2e8);
    const accentColor = new THREE.Color(accent);
    const bodyColor = accentColor.clone().offsetHSL(0, -0.12, -0.02);
    const panelColor = accentColor.clone().lerp(new THREE.Color(secondary), 0.3).offsetHSL(0, -0.06, 0.04);
    const darkColor = accentColor.clone().offsetHSL(0, -0.2, -0.12);
    this.bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: bodyColor,
      metalness: 0.78,
      roughness: 0.38,
      clearcoat: 0.28,
      clearcoatRoughness: 0.44,
      emissive: accentColor.clone().multiplyScalar(0.014),
    });
    this.panelMaterial = new THREE.MeshPhysicalMaterial({
      color: panelColor,
      metalness: 0.66,
      roughness: 0.34,
      clearcoat: 0.38,
      clearcoatRoughness: 0.34,
      emissive: accentColor.clone().multiplyScalar(0.008),
    });
    this.darkMaterial = new THREE.MeshPhysicalMaterial({
      color: darkColor,
      metalness: 0.84,
      roughness: 0.3,
      clearcoat: 0.18,
      clearcoatRoughness: 0.5,
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
    const bodyMesh = createFuselage(this.bodyMaterial, {
      width: bodySize[0],
      length: bodySize[1],
      height: bodySize[2],
      tailWidth: this.rig.bodyTaper || 0.45,
    });
    addOutline(bodyMesh);
    body.add(bodyMesh);

    const spine = createPanel(this.panelMaterial, [Math.max(5, bodySize[0] * 0.34), bodySize[1] * 0.74, bodySize[2] * 1.18]);
    spine.position.z = bodySize[2] * 0.58;
    body.add(spine);

    const nose = this.register("nose", new THREE.Group());
    const noseMesh = createWedgeNose(this.bodyMaterial, {
      width: bodySize[0] * 0.72,
      length: bodySize[1] * 0.62,
      height: bodySize[2] * 0.78,
    });
    addOutline(noseMesh);
    nose.add(noseMesh);

    const cockpit = this.register("cockpit", new THREE.Group());
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(7, 18, 12, 0, TAU, 0, Math.PI / 2),
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(colorNumber(this.fighter?.accent, 0xd8ff45)).lerp(new THREE.Color(0x071012), 0.72),
        emissive: colorNumber(this.fighter?.accent, 0xd8ff45),
        emissiveIntensity: 0.055,
        metalness: 0.34,
        roughness: 0.16,
        clearcoat: 0.62,
        clearcoatRoughness: 0.18,
        transparent: true,
        opacity: 0.88,
      }),
    );
    const canopyScale = this.profile === "siege" ? 0.9 : this.profile === "skirmisher" ? 0.68 : 0.78;
    canopy.scale.set(canopyScale, 1.35, 0.55);
    cockpit.add(canopy);

    const core = this.register("core", new THREE.Group());
    this.coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(5.2, 1), this.energyMaterial);
    core.add(this.coreMesh);

    const intakeCount = this.rig.engineCount === 1 ? 1 : 2;
    for (let index = 0; index < intakeCount; index += 1) {
      const side = intakeCount === 1 ? 0 : index === 0 ? -1 : 1;
      const intake = this.register(side === 0 ? "centerIntake" : side < 0 ? "leftIntake" : "rightIntake", new THREE.Group());
      const intakeMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(bodySize[0] * 0.18, bodySize[0] * 0.28, 12, 6, 1, true),
        this.darkMaterial,
      );
      intakeMesh.position.set(side * bodySize[0] * 0.3, 4, -bodySize[2] * 0.34);
      intake.add(intakeMesh);
    }
  }

  buildWings() {
    const wingSize = this.rig.wing || [38, 20, 4];
    [-1, 1].forEach((side) => {
      const wing = this.register(side < 0 ? "leftWing" : "rightWing", new THREE.Group());
      const wingMesh = createPlanform(this.bodyMaterial, {
        span: wingSize[0] * 0.84,
        chord: wingSize[1],
        thickness: wingSize[2],
        side,
        sweep: this.rig.wingSweep || 0.34,
        taper: this.rig.wingTaper || 0.58,
        curve: this.rig.wingCurve || 0,
      });
      addOutline(wingMesh);
      wing.add(wingMesh);

      const blade = createPanel(this.panelMaterial, [wingSize[0] * 0.64, Math.max(4, wingSize[1] * 0.24), wingSize[2] + 1]);
      blade.position.set(side * wingSize[0] * 0.5, wingSize[1] * 0.08, wingSize[2] * 0.72);
      blade.rotation.z = side * -0.18;
      wing.add(blade);
    });

    if (this.fighter?.shape?.tailless) {
      // Tailless airframes keep the rear silhouette clean.
    } else if (this.fighter?.shape?.twinTail) {
      [-1, 1].forEach((side) => {
        const tail = this.register(side < 0 ? "leftTail" : "rightTail", new THREE.Group());
        const tailMesh = createFin(this.panelMaterial, {
          chord: Math.max(10, this.fighter.shape.tail * 0.85),
          height: Math.max(12, this.fighter.shape.tail),
          thickness: 3.2,
          sweep: 0.24,
        });
        tailMesh.rotation.y = side * (this.rig.tailCant || 0.32);
        tail.add(tailMesh);
      });
    } else {
      const tail = this.register("centerTail", new THREE.Group());
      const tailMesh = createFin(this.panelMaterial, {
        chord: Math.max(11, this.fighter.shape.tail),
        height: Math.max(14, this.fighter.shape.tail * 1.22),
        thickness: 3.2,
        sweep: this.profile === "skirmisher" ? 0.3 : 0.18,
      });
      tail.add(tailMesh);
    }

    if ((this.fighter?.shape?.canard || 0) >= 8) {
      [-1, 1].forEach((side) => {
        const canard = this.register(side < 0 ? "leftCanard" : "rightCanard", new THREE.Group());
        const canardMesh = createPlanform(this.panelMaterial, {
          span: this.fighter.shape.canard * 1.35,
          chord: 7,
          thickness: 2.2,
          side,
          sweep: 0.18,
          taper: 0.68,
        });
        addOutline(canardMesh);
        canard.add(canardMesh);
      });
    }
  }

  buildEngines() {
    const engineSize = this.rig.engines || 8;
    const engineCount = this.rig.engineCount || 2;
    this.engineNames = [];
    const sides = engineCount === 1 ? [0] : [-1, 1];
    sides.forEach((side) => {
      const name = side === 0 ? "centerEngine" : side < 0 ? "leftEngine" : "rightEngine";
      const engine = this.register(name, new THREE.Group());
      this.engineNames.push(name);
      const housingLength = 24 + engineSize * 0.55;
      const housing = new THREE.Mesh(
        new THREE.CylinderGeometry(engineSize * 0.58, engineSize * 0.72, housingLength, this.profile === "siege" ? 16 : 14),
        this.darkMaterial,
      );
      addOutline(housing, colorNumber(this.fighter?.accent, 0xd8ff45));
      engine.add(housing);
      const exhaust = new THREE.Mesh(
        new THREE.CylinderGeometry(engineSize * 0.52, engineSize * 0.4, 7 + engineSize * 0.25, 14),
        this.energyMaterial,
      );
      exhaust.rotation.x = Math.PI / 2;
      exhaust.position.y = -housingLength * 0.58;
      engine.add(exhaust);
      engine.userData.exhaust = exhaust;
    });
  }

  buildArms() {
    const shoulderSize = this.rig.shoulders || [16, 12, 9];
    const armLength = this.rig.arms || 24;
    this.toolMounts = (this.fighter?.toolModes || []).map(() => []);
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
      (this.fighter?.toolModes || []).forEach((mode, modeIndex) => {
        const mount = this.createToolAttachment(mode, armLength, side);
        mount.visible = modeIndex === this.toolModeIndex;
        arm.add(mount);
        this.toolMounts[modeIndex].push(mount);
      });
    });
  }

  createToolAttachment(mode, armLength, side) {
    const group = new THREE.Group();
    group.name = `${mode.id}-${side < 0 ? "left" : "right"}`;
    const length = armLength * (mode.pattern === "rail" ? 1.5 : mode.pattern === "heavy" ? 1.12 : 0.92);
    if (mode.pattern === "wave") {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(7, 1.8, 8, 24), this.energyMaterial);
      ring.position.y = -armLength * 1.08;
      group.add(ring);
    } else if (mode.pattern === "seeker") {
      const rack = createPanel(this.darkMaterial, [9, length, 8]);
      rack.position.y = -armLength * 0.92;
      group.add(rack);
      for (let slot = -1; slot <= 1; slot += 1) {
        const missile = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.5, 10, 6), this.energyMaterial);
        missile.position.set(slot * 2.7, -armLength * 1.25, 4);
        group.add(missile);
      }
    } else if (mode.pattern === "drone") {
      const drone = new THREE.Mesh(new THREE.OctahedronGeometry(6, 0), this.panelMaterial);
      drone.scale.set(1.7, 0.72, 0.48);
      drone.position.y = -armLength * 1.05;
      group.add(drone);
    } else {
      const width = mode.pattern === "heavy" ? 11 : mode.pattern === "rail" ? 4.5 : 7;
      const weapon = createPanel(mode.pattern === "heavy" ? this.darkMaterial : this.panelMaterial, [width, length, width]);
      weapon.position.y = -armLength * 0.95;
      group.add(weapon);
      const muzzleRadius = mode.pattern === "heavy" ? 4.2 : mode.pattern === "rail" ? 2 : 2.8;
      const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(muzzleRadius * 0.72, muzzleRadius, 9, 8), this.energyMaterial);
      muzzle.position.y = -armLength * 0.95 - length * 0.54;
      group.add(muzzle);
    }
    return group;
  }

  setToolMode(index) {
    const count = this.toolMounts?.length || 0;
    this.toolModeIndex = count ? ((Number(index) || 0) % count + count) % count : 0;
    this.toolMounts?.forEach((mounts, modeIndex) => {
      mounts.forEach((mount) => {
        mount.visible = modeIndex === this.toolModeIndex;
      });
    });
  }

  buildDetails() {
    const crest = this.register("crest", new THREE.Group());
    const crestMesh = createPanel(this.panelMaterial, [3, 16, 4]);
    crestMesh.rotation.z = 0.02;
    crest.add(crestMesh);

    this.droneNames = [];
    if (this.profile === "commander" || this.profile === "skirmisher" || this.profile === "specter") {
      const droneCount = this.profile === "commander" ? 4 : this.profile === "specter" ? 1 : 2;
      for (let index = 0; index < droneCount; index += 1) {
        const drone = this.register(`drone${index}`, new THREE.Group());
        const droneMesh = new THREE.Mesh(new THREE.OctahedronGeometry(5, 0), this.panelMaterial);
        droneMesh.scale.set(1.7, 0.65, 0.45);
        drone.add(droneMesh);
        this.droneNames.push(`drone${index}`);
      }
    }

    if (this.profile === "falcon") {
      [-1, 1].forEach((side) => {
        const feather = this.register(side < 0 ? "leftFeather" : "rightFeather", new THREE.Group());
        for (let bladeIndex = 0; bladeIndex < 3; bladeIndex += 1) {
          const blade = createPanel(this.panelMaterial, [3.4, 18 - bladeIndex * 2.5, 3]);
          blade.position.set(side * bladeIndex * 3.2, -bladeIndex * 2.6, bladeIndex * 1.2);
          blade.rotation.z = side * (0.18 + bladeIndex * 0.08);
          feather.add(blade);
        }
      });
    } else if (this.profile === "hunter") {
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

        const talon = this.register(side < 0 ? "leftTalon" : "rightTalon", new THREE.Group());
        for (let claw = -1; claw <= 1; claw += 1) {
          const blade = new THREE.Mesh(new THREE.ConeGeometry(1.15, 13, 4), this.panelMaterial);
          blade.rotation.z = Math.PI;
          blade.position.set(claw * 3.2, -6, Math.abs(claw) * -1.2);
          blade.rotation.x = claw * 0.12;
          talon.add(blade);
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

      const lanceGuard = this.register("lanceGuard", new THREE.Group());
      const guard = createPanel(this.panelMaterial, [39, 5, 8]);
      lanceGuard.add(guard);
      [-1, 1].forEach((side) => {
        const shield = this.register(side < 0 ? "leftShield" : "rightShield", new THREE.Group());
        const plate = createPanel(this.bodyMaterial, [11, 42, 6]);
        plate.rotation.z = side * 0.08;
        addOutline(plate);
        shield.add(plate);
      });
    } else if (this.profile === "dualist") {
      [-1, 1].forEach((side) => {
        const ring = this.register(side < 0 ? "leftRing" : "rightRing", new THREE.Group());
        const outer = new THREE.Mesh(new THREE.TorusGeometry(9, 1.5, 8, 28), this.panelMaterial);
        const inner = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.65, 6, 24), this.energyMaterial);
        inner.rotation.x = 0.18;
        ring.add(outer, inner);
      });
      const phaseHalo = this.register("phaseHalo", new THREE.Group());
      const halo = new THREE.Mesh(new THREE.TorusGeometry(20, 1.25, 8, 36), this.panelMaterial);
      halo.scale.y = 0.72;
      phaseHalo.add(halo);
      [-1, 1].forEach((side) => {
        const node = new THREE.Mesh(new THREE.OctahedronGeometry(2.4, 0), this.energyMaterial);
        node.position.x = side * 20;
        phaseHalo.add(node);
      });
    } else if (this.profile === "skirmisher") {
      [-1, 1].forEach((side) => {
        const rail = this.register(side < 0 ? "leftRail" : "rightRail", new THREE.Group());
        const runner = createPanel(this.panelMaterial, [5, 42, 5]);
        runner.rotation.z = side * 0.08;
        const fin = createPanel(this.bodyMaterial, [12, 7, 3]);
        fin.position.y = -20;
        rail.add(runner, fin);
      });
      const overclockRotor = this.register("overclockRotor", new THREE.Group());
      const rotor = new THREE.Mesh(new THREE.TorusGeometry(12, 1.2, 8, 28), this.panelMaterial);
      rotor.scale.y = 0.66;
      overclockRotor.add(rotor);
    } else if (this.profile === "siege") {
      [-1, 1].forEach((side) => {
        const cannon = this.register(side < 0 ? "leftCannon" : "rightCannon", new THREE.Group());
        const barrel = createPanel(this.darkMaterial, [12, 42, 13]);
        cannon.add(barrel);
        const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(4, 5.5, 11, 10), this.energyMaterial);
        muzzle.rotation.x = Math.PI / 2;
        muzzle.position.y = -25;
        cannon.add(muzzle);

        const anchor = this.register(side < 0 ? "leftAnchor" : "rightAnchor", new THREE.Group());
        const strut = createPanel(this.darkMaterial, [11, 34, 11]);
        strut.rotation.z = side * 0.18;
        const foot = createPanel(this.panelMaterial, [22, 10, 15]);
        foot.position.y = -20;
        anchor.add(strut, foot);
      });
      const siegeDeck = this.register("siegeDeck", new THREE.Group());
      const deck = createPanel(this.bodyMaterial, [52, 24, 7]);
      addOutline(deck);
      siegeDeck.add(deck);
    } else if (this.profile === "specter") {
      const twinRail = this.register("twinRail", new THREE.Group());
      [-1, 1].forEach((side) => {
        const rail = createPanel(this.panelMaterial, [6, 48, 5]);
        rail.position.x = side * 7;
        twinRail.add(rail);
      });
    } else if (this.profile === "commander") {
      const commandFin = this.register("commandFin", new THREE.Group());
      const fin = createPanel(this.panelMaterial, [5, 30, 15]);
      fin.rotation.x = 0.34;
      commandFin.add(fin);

      const commandCrown = this.register("commandCrown", new THREE.Group());
      for (let index = -2; index <= 2; index += 1) {
        const blade = createPanel(index === 0 ? this.panelMaterial : this.bodyMaterial, [4, 18 + (2 - Math.abs(index)) * 4, 4]);
        blade.position.x = index * 8;
        blade.rotation.z = index * -0.1;
        commandCrown.add(blade);
      }
      [-1, 1].forEach((side) => {
        const horn = this.register(side < 0 ? "leftCommandHorn" : "rightCommandHorn", new THREE.Group());
        const spike = new THREE.Mesh(new THREE.ConeGeometry(2.2, 24, 4), this.panelMaterial);
        spike.rotation.z = side * 1.04;
        horn.add(spike);
      });
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
    const bodyArc = Math.sin(chest * Math.PI);
    const armArc = Math.sin(arms * Math.PI);
    const pose = this.pose;
    const setCenterPose = (part, flightPosition, assaultPosition, amount, flightRotation = [0, 0, 0], assaultRotation = [0, 0, 0]) => {
      if (!part) return;
      part.position.set(
        mix(flightPosition[0], assaultPosition[0], amount),
        mix(flightPosition[1], assaultPosition[1], amount),
        mix(flightPosition[2], assaultPosition[2], amount),
      );
      part.rotation.set(
        mix(flightRotation[0], assaultRotation[0], amount),
        mix(flightRotation[1], assaultRotation[1], amount),
        mix(flightRotation[2], assaultRotation[2], amount),
      );
    };
    const setMirroredPose = (part, side, flight, assault, amount) => {
      if (!part) return;
      part.position.set(
        side * mix(flight[0], assault[0], amount),
        mix(flight[1], assault[1], amount),
        mix(flight[2], assault[2], amount),
      );
      part.rotation.set(
        mix(flight[3] || 0, assault[3] || 0, amount),
        side * mix(flight[4] || 0, assault[4] || 0, amount),
        side * mix(flight[5] || 0, assault[5] || 0, amount),
      );
    };

    setCenterPose(this.parts.fuselage, [0, 0, 0], pose.body, chest);
    this.parts.fuselage.scale.set(
      mix(1, pose.bodyScale[0], chest),
      mix(1, pose.bodyScale[1], chest),
      mix(1, pose.bodyScale[2], chest),
    );

    setCenterPose(this.parts.nose, [0, 43, 0], pose.nose, chest, [0, 0, 0], pose.noseRotation);
    this.parts.nose.scale.setScalar(mix(1, 0.78, armor));
    setCenterPose(this.parts.cockpit, [0, 12, 8], pose.cockpit, chest, [0, 0, 0], [-0.42, 0, 0]);
    setCenterPose(this.parts.core, [0, 3, 6], pose.core, lock);
    this.parts.core.scale.setScalar(mix(0.52, 1.3, lock));

    [-1, 1].forEach((side) => {
      const wing = this.parts[side < 0 ? "leftWing" : "rightWing"];
      setMirroredPose(wing, side, [9, 0, 0, 0, 0, 0], pose.wing, wings);
      const wingArc = Math.sin(wings * Math.PI);
      if (this.profile === "falcon") {
        wing.position.x += side * wingArc * 13;
        wing.position.z += wingArc * 12;
        wing.rotation.x += wingArc * 0.38;
      } else if (this.profile === "specter") {
        wing.position.y += wingArc * 12;
        wing.position.z += wingArc * 9;
        wing.rotation.y += side * wingArc * 0.26;
      } else if (this.profile === "hunter") {
        wing.position.y -= wingArc * 13;
        wing.rotation.x += wingArc * 0.42;
      } else if (this.profile === "lancer") {
        wing.position.z += wingArc * 15;
        wing.rotation.y += side * wingArc * 0.5;
      } else if (this.profile === "dualist") {
        wing.position.x += side * wingArc * 11;
        wing.position.z += wingArc * 17;
        wing.rotation.x += wingArc * 0.48;
      } else if (this.profile === "skirmisher") {
        wing.position.x += side * wingArc * 18;
        wing.position.y -= wingArc * 11;
        wing.rotation.z += side * wingArc * 0.72;
      } else if (this.profile === "siege") {
        wing.position.y += wingArc * 17;
        wing.position.z += wingArc * 8;
      } else if (this.profile === "commander") {
        wing.position.y -= wingArc * 15;
        wing.position.z += wingArc * 14;
        wing.rotation.y += side * wingArc * 0.34;
      }

      const tail = this.parts[side < 0 ? "leftTail" : "rightTail"];
      setMirroredPose(tail, side, [7, -25, 5, 0, 0, 0], pose.tail, wings);

      const canard = this.parts[side < 0 ? "leftCanard" : "rightCanard"];
      setMirroredPose(canard, side, [6, 22, 3, 0, 0, -0.08], pose.canard, armor);
      if (canard) {
        const canardArc = Math.sin(armor * Math.PI);
        canard.position.z += canardArc * (this.profile === "commander" ? 13 : this.profile === "dualist" ? 9 : 5);
        canard.rotation.x += canardArc * (this.profile === "skirmisher" ? 0.65 : 0.28);
      }

      const engine = this.parts[side < 0 ? "leftEngine" : "rightEngine"];
      setMirroredPose(engine, side, [7, -26, 0, 0, 0, 0], pose.engine || [10, -39, 2, -0.1, 0, 0.08], legs);
      if (engine) {
        const engineArc = Math.sin(legs * Math.PI);
        if (this.profile === "dualist") engine.position.x += side * engineArc * 8;
        if (this.profile === "siege") engine.position.y -= engineArc * 12;
        if (this.profile === "commander") engine.position.z += engineArc * 9;
      }

      const shoulder = this.parts[side < 0 ? "leftShoulder" : "rightShoulder"];
      setMirroredPose(shoulder, side, [22, 0, -1, 0, 0, 0.12], pose.shoulder, arms);
      shoulder.scale.setScalar(mix(0.35, 1, arms));

      const arm = this.parts[side < 0 ? "leftArm" : "rightArm"];
      setMirroredPose(arm, side, [28, -1, 0, 0, 0, Math.PI / 2], pose.arm, arms);
      arm.scale.setScalar(mix(0.25, 1, arms));
      if (this.profile === "falcon") {
        arm.position.x += side * armArc * 8;
        arm.position.z += armArc * 12;
        arm.rotation.y += side * armArc * 0.46;
      } else if (this.profile === "specter") {
        arm.position.x += side * armArc * 14;
        arm.position.y += armArc * 12;
        arm.rotation.z += side * armArc * 0.28;
      } else if (this.profile === "hunter") {
        arm.position.y -= armArc * 10;
        arm.rotation.x -= armArc * 0.34;
      } else if (this.profile === "lancer") {
        arm.position.x -= side * armArc * 8;
        arm.rotation.z -= side * armArc * 0.46;
      } else if (this.profile === "dualist") {
        arm.position.x += side * armArc * 12;
        arm.rotation.y += side * armArc * 0.62;
      } else if (this.profile === "skirmisher") {
        arm.position.y += armArc * 15;
        arm.rotation.z += side * armArc * 0.72;
      } else if (this.profile === "siege") {
        arm.position.y += armArc * 18;
        arm.position.z -= armArc * 8;
      } else if (this.profile === "commander") {
        arm.position.x -= side * armArc * 10;
        arm.position.z += armArc * 10;
      }
    });

    if (this.parts.centerEngine) {
      setCenterPose(this.parts.centerEngine, [0, -26, 0], pose.centerEngine || [0, -39, 3], legs, [0, 0, 0], [pose.centerEngine?.[3] || 0, 0, 0]);
      const engineArc = Math.sin(legs * Math.PI);
      this.parts.centerEngine.position.z += engineArc * 15;
      this.parts.centerEngine.rotation.x -= engineArc * 0.72;
    }

    this.parts.fuselage.rotation.set(0, 0, 0);
    if (this.profile === "falcon") this.parts.fuselage.rotation.z = bodyArc * -0.16;
    if (this.profile === "specter") this.parts.fuselage.rotation.x = mix(0, -0.3, chest);
    if (this.profile === "hunter") this.parts.fuselage.rotation.x = bodyArc * -0.18;
    if (this.profile === "lancer") this.parts.fuselage.rotation.x = bodyArc * 0.14;
    if (this.profile === "dualist") this.parts.fuselage.rotation.z = bodyArc * 0.34;
    if (this.profile === "skirmisher") this.parts.fuselage.rotation.y = bodyArc * 0.5;
    if (this.profile === "siege") this.parts.fuselage.rotation.x = mix(0, -0.52, chest);
    if (this.profile === "commander") this.parts.fuselage.rotation.x = mix(0, -0.16, chest);

    if (this.parts.centerTail) {
      setCenterPose(this.parts.centerTail, [0, -25, 6], pose.tail, wings, [0, 0, 0], [pose.tail[3] || -0.48, 0, 0]);
      this.parts.centerTail.scale.setScalar(mix(1, 0.82, wings));
    }

    ["centerIntake", "leftIntake", "rightIntake"].forEach((name) => {
      const intake = this.parts[name];
      if (!intake) return;
      const side = name === "leftIntake" ? -1 : name === "rightIntake" ? 1 : 0;
      intake.position.set(side * mix(0, 8, chest), mix(0, 9, chest), mix(0, 4, chest));
      intake.rotation.x = mix(0, -0.36, chest);
    });

    this.droneNames.forEach((name, index) => {
      const drone = this.parts[name];
      const side = index % 2 === 0 ? -1 : 1;
      const rank = Math.floor(index / 2);
      const dronePhase = this.profile === "commander"
        ? phase(this.progress, 0.16 + index * 0.08, 0.52 + index * 0.08)
        : phase(this.progress, 0.02 + index * 0.08, 0.42 + index * 0.08);
      drone.position.set(
        side * mix(20 + rank * 5, this.profile === "commander" ? 42 + rank * 14 : 36 + rank * 10, dronePhase),
        mix(-8 - rank * 5, this.profile === "commander" ? 12 + rank * 8 : 5 + rank * 5, dronePhase),
        mix(2, this.profile === "commander" ? 16 + rank * 3 : 11 + rank * 3, dronePhase),
      );
      drone.rotation.z = side * (this.time * (0.7 + rank * 0.16) + dronePhase * 0.6);
      drone.scale.setScalar(mix(0.08, 1 - rank * 0.08, dronePhase));
    });

    this.parts.crest.position.set(0, mix(-19, 25, lock), mix(2, 14, lock));
    this.parts.crest.rotation.x = mix(Math.PI / 2, 0, lock);
    this.parts.crest.scale.setScalar(mix(0.2, 1, lock));

    if (this.parts.leftFeather) {
      [-1, 1].forEach((side) => {
        const feather = this.parts[side < 0 ? "leftFeather" : "rightFeather"];
        const featherPhase = phase(this.progress, side < 0 ? 0.2 : 0.28, side < 0 ? 0.72 : 0.8);
        feather.position.set(side * mix(18, 33, featherPhase), mix(-8, -20, featherPhase), mix(-2, 12, featherPhase));
        feather.rotation.x = mix(Math.PI / 2, -0.2, featherPhase);
        feather.rotation.z = side * mix(0.8, 0.12, featherPhase);
        feather.scale.setScalar(mix(0.05, 1, featherPhase));
      });
    }

    if (this.parts.twinRail) {
      const railPhase = phase(this.progress, 0.46, 0.9);
      this.parts.twinRail.position.set(0, mix(-18, -11, railPhase), mix(-7, 14, railPhase));
      this.parts.twinRail.rotation.x = mix(Math.PI / 2, -0.08, railPhase);
      this.parts.twinRail.scale.setScalar(mix(0.06, 1, railPhase));
    }

    if (this.parts.leftPod) {
      [-1, 1].forEach((side) => {
        const pod = this.parts[side < 0 ? "leftPod" : "rightPod"];
        pod.position.set(side * mix(18, 25, arms), mix(-5, 12, arms), mix(1, 9, arms));
        pod.rotation.z = side * mix(0.08, 0.32, arms);
        pod.scale.setScalar(mix(0.45, 1, arms));

        const talon = this.parts[side < 0 ? "leftTalon" : "rightTalon"];
        talon.position.set(side * mix(22, 34, lock), mix(-8, -30, lock), mix(0, 10, lock));
        talon.rotation.x = mix(Math.PI / 2, -0.18, lock);
        talon.rotation.z = side * mix(0.42, 0.08, lock);
        talon.scale.setScalar(mix(0.05, 1, lock));
      });
    }
    if (this.parts.lance) {
      const lanceExtend = phase(this.progress, 0.42, 0.94);
      this.parts.lance.position.set(0, mix(22, -4, lanceExtend), mix(-9, 18, lanceExtend));
      this.parts.lance.scale.set(mix(0.08, 1, lanceExtend), mix(0.1, 1, lanceExtend), mix(0.08, 1, lanceExtend));
      this.parts.lanceGuard.position.set(0, mix(5, 2, lock), mix(-5, 18, lock));
      this.parts.lanceGuard.rotation.z = mix(Math.PI / 2, 0, lock);
      this.parts.lanceGuard.scale.setScalar(mix(0.05, 1, lock));
      [-1, 1].forEach((side) => {
        const shield = this.parts[side < 0 ? "leftShield" : "rightShield"];
        const shieldPhase = phase(this.progress, side < 0 ? 0.08 : 0.18, side < 0 ? 0.68 : 0.78);
        shield.position.set(side * mix(10, 27, shieldPhase), mix(-8, 6, shieldPhase), mix(-3, 10, shieldPhase));
        shield.rotation.y = side * mix(0, 0.48, shieldPhase);
        shield.rotation.z = side * mix(Math.PI / 2, 0.1, shieldPhase);
        shield.scale.setScalar(mix(0.06, 1, shieldPhase));
      });
    }
    if (this.parts.leftRing) {
      [-1, 1].forEach((side) => {
        const ring = this.parts[side < 0 ? "leftRing" : "rightRing"];
        ring.position.set(side * mix(20, 34, arms), mix(-10, -28, arms), mix(0, 8, arms));
        ring.rotation.y = side * mix(0, 0.42, arms);
        ring.rotation.z = side * mix(-0.9, 0, arms) + bodyArc * side * 0.7;
        ring.scale.setScalar(mix(0.2, 1, arms));
      });
      const haloPhase = phase(this.progress, 0.58, 1);
      this.parts.phaseHalo.position.set(0, mix(-18, 11, haloPhase), mix(-4, 24, haloPhase));
      this.parts.phaseHalo.rotation.x = mix(Math.PI / 2, 0.12, haloPhase);
      this.parts.phaseHalo.rotation.z = this.time * 0.22 * haloPhase;
      this.parts.phaseHalo.scale.setScalar(mix(0.04, 1, haloPhase));
    }
    if (this.parts.leftRail) {
      [-1, 1].forEach((side) => {
        const rail = this.parts[side < 0 ? "leftRail" : "rightRail"];
        const railPhase = phase(this.progress, side < 0 ? 0.05 : 0.14, side < 0 ? 0.48 : 0.57);
        rail.position.set(side * mix(7, 18, railPhase), mix(-16, -35, railPhase), mix(-2, 4, railPhase));
        rail.rotation.x = mix(Math.PI / 2, -0.16, railPhase);
        rail.rotation.z = side * mix(0.42, 0.08, railPhase);
        rail.scale.setScalar(mix(0.05, 1, railPhase));
      });
      const rotorPhase = phase(this.progress, 0.34, 0.72);
      this.parts.overclockRotor.position.set(0, mix(-19, -31, rotorPhase), mix(-2, 6, rotorPhase));
      this.parts.overclockRotor.rotation.z = this.time * 1.8 * rotorPhase;
      this.parts.overclockRotor.scale.setScalar(mix(0.04, 1, rotorPhase));
    }
    if (this.parts.leftCannon) {
      [-1, 1].forEach((side) => {
        const cannon = this.parts[side < 0 ? "leftCannon" : "rightCannon"];
        cannon.position.set(side * mix(15, 35, armor), mix(-2, 24, armor), mix(-4, 12, armor));
        cannon.rotation.z = side * mix(Math.PI / 2, 0.08, armor);
        cannon.scale.setScalar(mix(0.35, 1, armor));

        const anchor = this.parts[side < 0 ? "leftAnchor" : "rightAnchor"];
        const anchorPhase = phase(this.progress, side < 0 ? 0.28 : 0.4, side < 0 ? 0.72 : 0.84);
        anchor.position.set(side * mix(14, 39, anchorPhase), mix(-12, -27, anchorPhase), mix(-8, -4, anchorPhase));
        anchor.rotation.x = mix(Math.PI / 2, -0.24, anchorPhase);
        anchor.rotation.z = side * mix(0.7, 0.16, anchorPhase);
        anchor.scale.setScalar(mix(0.05, 1, anchorPhase));
      });
      const deckPhase = phase(this.progress, 0.18, 0.62);
      this.parts.siegeDeck.position.set(0, mix(-6, 3, deckPhase), mix(-8, 14, deckPhase));
      this.parts.siegeDeck.rotation.x = mix(Math.PI / 2, -0.12, deckPhase);
      this.parts.siegeDeck.scale.set(mix(0.08, 1, deckPhase), mix(0.08, 1, deckPhase), mix(0.08, 1, deckPhase));
    }
    if (this.parts.commandFin) {
      this.parts.commandFin.position.set(0, mix(-20, 22, lock), mix(0, 11, lock));
      this.parts.commandFin.rotation.x = mix(Math.PI / 2, 0, lock);
      this.parts.commandFin.scale.setScalar(mix(0.2, 1, lock));

      const crownPhase = phase(this.progress, 0.5, 0.94);
      this.parts.commandCrown.position.set(0, mix(-20, 31, crownPhase), mix(-5, 19, crownPhase));
      this.parts.commandCrown.rotation.x = mix(Math.PI / 2, 0.08, crownPhase);
      this.parts.commandCrown.scale.setScalar(mix(0.04, 1, crownPhase));
      [-1, 1].forEach((side) => {
        const horn = this.parts[side < 0 ? "leftCommandHorn" : "rightCommandHorn"];
        const hornPhase = phase(this.progress, side < 0 ? 0.04 : 0.12, side < 0 ? 0.42 : 0.5);
        horn.position.set(side * mix(4, 17, hornPhase), mix(20, 24, hornPhase), mix(1, 17, hornPhase));
        horn.rotation.y = side * mix(0, 0.3, hornPhase);
        horn.rotation.z = side * mix(0.2, 0.64, hornPhase);
        horn.scale.setScalar(mix(0.05, 1, hornPhase));
      });
    }

    const baseScale = this.rig.cameraScale || 1;
    this.root.scale.set(
      baseScale * mix(1, pose.rootScale[0], lock),
      baseScale * mix(1, pose.rootScale[1], lock),
      baseScale * mix(1, pose.rootScale[2], lock),
    );
  }

  applyAction(action, time) {
    if (action?.startsWith("tool-")) {
      const toolIndex = Number(action.slice(5)) || 0;
      this.setToolMode(toolIndex);
      const pulse = (Math.sin(time * 7) + 1) * 0.5;
      this.toolMounts?.[toolIndex]?.forEach((mount, index) => {
        mount.rotation.y = (index === 0 ? -1 : 1) * pulse * 0.08 * this.progress;
      });
      return;
    }
    if (action !== "tactical") return;
    const recoil = (Math.sin(time * 8) + 1) * 0.5;
    if (this.profile === "falcon") {
      this.parts.leftFeather.rotation.x -= recoil * 0.28;
      this.parts.rightFeather.rotation.x -= recoil * 0.28;
    } else if (this.profile === "specter") {
      this.parts.twinRail.position.y += recoil * 7;
      this.droneNames.forEach((name) => {
        this.parts[name].position.y += recoil * 9;
      });
    } else if (this.profile === "hunter") {
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
    const pulse = 1 + Math.sin(time * 7) * 0.045 + overdrive * 0.025;
    this.coreMesh.rotation.y = time * 1.9;
    this.coreMesh.rotation.z = time * 1.25;
    this.coreMesh.scale.setScalar(pulse);
    this.energyMaterial.uniforms.time.value = time;
    this.energyMaterial.uniforms.intensity.value = 0.42 + transform * 0.16 + Math.min(1, overdrive) * 0.12;
    this.applyAction(action, time);
    this.engineNames.forEach((name) => {
      const exhaust = this.parts[name]?.userData.exhaust;
      if (exhaust) exhaust.scale.y = 0.85 + Math.random() * 0.34 + overdrive * 0.16;
    });
  }

  getSignature() {
    return Object.entries(this.parts)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, part]) => {
        const geometries = [];
        part.traverse((child) => {
          if (child.isMesh) geometries.push(`${child.geometry.type}:${child.geometry.getAttribute("position")?.count || 0}`);
        });
        const values = [
          ...part.position.toArray(),
          part.rotation.x,
          part.rotation.y,
          part.rotation.z,
          ...part.scale.toArray(),
        ].map((value) => Number(value.toFixed(2)));
        return `${name}:${values.join(",")}:${geometries.sort().join("+")}`;
      })
      .join("|");
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
    this.coreMaterial.uniforms.intensity.value = 0.62 + phaseAmount * 0.36;
  }
}

function setupRenderer(canvas, alpha = true, preserveDrawingBuffer = false) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.82;
  return renderer;
}

function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xc9ded8, 0x1c1814, 0.96));
  const key = new THREE.DirectionalLight(0xffffff, 1.72);
  key.position.set(-70, 90, 130);
  scene.add(key);
  const rim = new THREE.PointLight(0xd8ff45, 3.2, 240, 2);
  rim.position.set(80, -30, 65);
  scene.add(rim);
  const danger = new THREE.PointLight(0xff4d3d, 2.2, 210, 2);
  danger.position.set(-90, 20, 35);
  scene.add(danger);
}

export function createVisualSystem({ hangarCanvas, battleCanvas, fighter, reducedMotion = false }) {
  try {
    const hangarRenderer = setupRenderer(hangarCanvas, true, true);
    const battleRenderer = setupRenderer(battleCanvas, true);
    hangarRenderer.toneMappingExposure = 1.04;
    const hangarScene = new THREE.Scene();
    const battleScene = new THREE.Scene();
    hangarScene.background = new THREE.Color(0x1d3033);
    addLights(hangarScene);
    addLights(battleScene);
    hangarScene.add(new THREE.AmbientLight(0xffffff, 0.56));

    const hangarGrid = new THREE.GridHelper(420, 28, 0x6b8f8b, 0x355451);
    hangarGrid.rotation.x = Math.PI / 2;
    hangarGrid.position.set(0, 54, -58);
    hangarGrid.material.transparent = true;
    hangarGrid.material.opacity = 0.18;
    hangarGrid.material.depthWrite = false;
    hangarScene.add(hangarGrid);

    const hangarAccentMaterial = new THREE.MeshBasicMaterial({
      color: colorNumber(fighter?.accent, 0xd8ff45),
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const hangarPlatform = new THREE.Mesh(new THREE.RingGeometry(64, 67, 96), hangarAccentMaterial);
    hangarPlatform.position.set(0, 12, -56);
    hangarScene.add(hangarPlatform);

    const hangarCamera = new THREE.PerspectiveCamera(30, 2.4, 0.1, 1000);
    hangarCamera.position.set(0, -188, 140);
    hangarCamera.lookAt(0, 5, 2);

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
      hangarComposer.addPass(new UnrealBloomPass(new THREE.Vector2(800, 320), 0.07, 0.16, 0.86));
    }

    let selectedFighter = fighter;
    let selectedToolMode = 0;
    let previewStart = performance.now();
    let previewMode = "transform";
    let hangarFrame = 0;
    const hangarStage = hangarCanvas.closest(".hangar-stage");
    const interaction = {
      dragging: false,
      interacted: false,
      pointerX: 0,
      pointerY: 0,
      startX: 0,
      startY: 0,
      startYaw: 0,
      startPitch: 0,
      targetYaw: 0,
      targetPitch: 0,
      yaw: 0,
      pitch: 0,
    };

    function readPointer(event) {
      const rect = hangarCanvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      interaction.pointerX = clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1);
      interaction.pointerY = clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1);
    }

    function setInspecting(active) {
      hangarStage?.classList.toggle("is-inspecting", active);
    }

    function onHangarPointerDown(event) {
      if (event.button !== 0) return;
      event.preventDefault();
      readPointer(event);
      interaction.dragging = true;
      interaction.interacted = true;
      interaction.startX = event.clientX;
      interaction.startY = event.clientY;
      interaction.startYaw = interaction.targetYaw;
      interaction.startPitch = interaction.targetPitch;
      setInspecting(true);
      try {
        hangarCanvas.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is a progressive enhancement for desktop inspection.
      }
    }

    function onHangarPointerMove(event) {
      readPointer(event);
      if (!interaction.dragging) return;
      const deltaX = event.clientX - interaction.startX;
      const deltaY = event.clientY - interaction.startY;
      interaction.targetYaw = clamp(interaction.startYaw + deltaX * 0.008, -1.35, 1.35);
      interaction.targetPitch = clamp(interaction.startPitch + deltaY * 0.005, -0.34, 0.32);
    }

    function onHangarPointerUp(event) {
      if (!interaction.dragging) return;
      interaction.dragging = false;
      setInspecting(false);
      try {
        hangarCanvas.releasePointerCapture(event.pointerId);
      } catch {
        // The pointer may already have been released by the browser.
      }
    }

    function onHangarPointerLeave() {
      if (!interaction.dragging) {
        interaction.pointerX = 0;
        interaction.pointerY = 0;
      }
    }

    function onHangarDoubleClick(event) {
      event.preventDefault();
      interaction.interacted = true;
      interaction.targetYaw = 0;
      interaction.targetPitch = 0;
    }

    hangarCanvas.addEventListener("pointerdown", onHangarPointerDown);
    hangarCanvas.addEventListener("pointermove", onHangarPointerMove);
    hangarCanvas.addEventListener("pointerup", onHangarPointerUp);
    hangarCanvas.addEventListener("pointercancel", onHangarPointerUp);
    hangarCanvas.addEventListener("pointerleave", onHangarPointerLeave);
    hangarCanvas.addEventListener("dblclick", onHangarDoubleClick);

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
      const compactCamera = Math.min(1, Math.max(0, (1.5 - hangarCamera.aspect) / 0.5));
      hangarCamera.position.set(
        0,
        mix(-196, -232, compactCamera),
        mix(144, 170, compactCamera),
      );
      hangarCamera.lookAt(interaction.pointerX * 4, 5, 2 - interaction.pointerY * 3);
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
      interaction.yaw += (interaction.targetYaw - interaction.yaw) * 0.12;
      interaction.pitch += (interaction.targetPitch - interaction.pitch) * 0.12;
      const profileYaw = selectedFighter?.rig?.profile === "lancer" ? 0.08 : selectedFighter?.rig?.profile === "siege" ? -0.06 : 0;
      const automaticYaw = reducedMotion ? 0 : Math.sin(seconds * 0.45) * 0.08;
      const parallaxYaw = interaction.dragging ? 0 : interaction.pointerX * 0.045;
      const parallaxPitch = interaction.dragging ? 0 : -interaction.pointerY * 0.035;
      hangarRig.root.rotation.y = profileYaw + automaticYaw + interaction.yaw + parallaxYaw;
      hangarRig.root.rotation.x = (previewMode === "flight" ? 0.2 : previewMode === "tactical" ? -0.08 : 0.12) + interaction.pitch + parallaxPitch;
      hangarRig.root.rotation.z = interaction.dragging ? -interaction.pointerX * 0.018 : 0;
      hangarRig.root.position.y = reducedMotion ? 0 : Math.sin(seconds * 1.2) * 2;
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
        hangarAccentMaterial.color.set(colorNumber(nextFighter.accent, 0xd8ff45));
        hangarRig.setFighter(nextFighter);
        battleRig.setFighter(nextFighter);
        selectedToolMode = 0;
        previewStart = performance.now();
      },
      setToolMode(index) {
        selectedToolMode = Number(index) || 0;
        hangarRig.setToolMode(selectedToolMode);
        battleRig.setToolMode(selectedToolMode);
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
        battleRig.update(seconds, state.transformProgress || 0, state.overdrive || 0, `tool-${state.toolModeIndex ?? selectedToolMode}`);
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
      getRigSignature() {
        hangarRig.setTransform(1);
        hangarRig.setToolMode(selectedToolMode);
        return hangarRig.getSignature();
      },
      getHangarInteraction() {
        return {
          dragging: interaction.dragging,
          interacted: interaction.interacted,
          yaw: Number(interaction.yaw.toFixed(3)),
          pitch: Number(interaction.pitch.toFixed(3)),
          targetYaw: Number(interaction.targetYaw.toFixed(3)),
          targetPitch: Number(interaction.targetPitch.toFixed(3)),
        };
      },
      dispose() {
        cancelAnimationFrame(hangarFrame);
        hangarCanvas.removeEventListener("pointerdown", onHangarPointerDown);
        hangarCanvas.removeEventListener("pointermove", onHangarPointerMove);
        hangarCanvas.removeEventListener("pointerup", onHangarPointerUp);
        hangarCanvas.removeEventListener("pointercancel", onHangarPointerUp);
        hangarCanvas.removeEventListener("pointerleave", onHangarPointerLeave);
        hangarCanvas.removeEventListener("dblclick", onHangarDoubleClick);
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
      setToolMode() {},
      resizeBattle() {},
      renderBattle() {},
      getRigSignature() { return ""; },
      getHangarInteraction() { return null; },
      dispose() {},
    };
  }
}
