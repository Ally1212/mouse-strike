import { createVisualSystem } from "./fighter-rig.js";
import "./audio.js";
import {
  MODULES,
  canEnterAssault,
  formationPattern,
  nextTransformProgress,
  tacticalSpec,
  updateTransformEnergy,
} from "./gameplay-rules.js";

(() => {
  "use strict";

  const canvas = document.querySelector("#game-canvas");
  const context = canvas.getContext("2d", { alpha: false });
  const battleThreeCanvas = document.querySelector("#game-three-canvas");
  const menuScreen = document.querySelector("#menu-screen");
  const gameScreen = document.querySelector("#game-screen");
  const startButton = document.querySelector("#start-button");
  const restartButton = document.querySelector("#restart-button");
  const menuButton = document.querySelector("#menu-button");
  const soundToggle = document.querySelector("#sound-toggle");
  const volumeSlider = document.querySelector("#volume-slider");
  const audio = window.gameAudio;
  const fighterPreview = document.querySelector("#fighter-preview");
  const fighterOptions = [...document.querySelectorAll(".fighter-option")];
  const selectedCountry = document.querySelector("#selected-country");
  const selectedRole = document.querySelector("#selected-role");
  const selectedName = document.querySelector("#selected-name");
  const selectedSpecial = document.querySelector("#selected-special");
  const agilityStat = document.querySelector("#agility-stat");
  const firepowerStat = document.querySelector("#firepower-stat");
  const armorStat = document.querySelector("#armor-stat");
  const startButtonLabel = document.querySelector("#start-button-label");
  const gameOverPanel = document.querySelector("#game-over");
  const scoreValue = document.querySelector("#score-value");
  const comboValue = document.querySelector("#combo-value");
  const livesValue = document.querySelector("#lives-value");
  const weaponHud = document.querySelector(".weapon-hud");
  const weaponValue = document.querySelector("#weapon-value");
  const weaponProgress = document.querySelector("#weapon-progress");
  const weaponProgressLabel = document.querySelector("#weapon-progress-label");
  const bossHud = document.querySelector("#boss-hud");
  const bossName = document.querySelector("#boss-name");
  const bossProgress = document.querySelector("#boss-progress");
  const finalScore = document.querySelector("#final-score");
  const finalWave = document.querySelector("#final-wave");
  const finalWeapon = document.querySelector("#final-weapon");
  const finalFighter = document.querySelector("#final-fighter");
  const fighterCallSign = document.querySelector("#fighter-call-sign");
  const waveMessage = document.querySelector("#wave-message");
  const upgradeMessage = document.querySelector("#upgrade-message");
  const formValue = document.querySelector("#form-value");
  const formEnergy = document.querySelector("#form-energy");
  const formEnergyLabel = document.querySelector("#form-energy-label");
  const tacticalValue = document.querySelector("#tactical-value");
  const tacticalCooldown = document.querySelector("#tactical-cooldown");
  const tacticalAbility = document.querySelector(".ability--tactical");
  const transformButton = document.querySelector("#transform-button");
  const tacticalButton = document.querySelector("#tactical-button");
  const moduleChoice = document.querySelector("#module-choice");
  const moduleButtons = [...document.querySelectorAll("[data-module]")];
  let visuals = null;

  const COLORS = {
    canvas: "#090b0a",
    grid: "rgba(216, 255, 69, 0.055)",
    player: "#d8ff45",
    playerCore: "#eef2e8",
    pulse: "#eef2e8",
    wave: "#73d59d",
    seeker: "#d8ff45",
    overdrive: "#ff9a3d",
    enemy: "#ff5c35",
    enemyCore: "#ffd2c7",
    enemyBullet: "#ff8d6e",
    elite: "#ffb13d",
    boss: "#ef4565",
    repair: "#73d59d",
  };

  const WEAPONS = [
    { level: 1, name: "双脉冲", threshold: 2, rate: 0.145 },
    { level: 2, name: "三叉脉冲", threshold: 3, rate: 0.135 },
    { level: 3, name: "五向扩散", threshold: 4, rate: 0.16 },
    { level: 4, name: "波动翼炮", threshold: 5, rate: 0.145 },
    { level: 5, name: "终极矩阵", threshold: 0, rate: 0.13 },
  ];

  const FIGHTERS = {
    f22: {
      id: "f22",
      country: "USA",
      name: "F-22 Raptor",
      shortName: "F-22",
      role: "制空 / 隐身突击",
      special: "幽灵矢量：战术形态追加追踪导弹，终极形态缩短锁定间隔。",
      accent: "#d8ff45",
      secondary: "#eef2e8",
      agility: 5,
      firepower: 4,
      armor: 3,
      fireRate: 0.94,
      damage: 1.06,
      shape: { nose: 32, body: 27, wing: 28, wingY: 1, rearWingY: 15, tail: 14, canard: 4, twinTail: true },
    },
    typhoon: {
      id: "typhoon",
      country: "GBR",
      name: "Eurofighter Typhoon",
      shortName: "Typhoon",
      role: "截击 / 高速穿透",
      special: "风暴长矛：变形后从翼尖发射高速汇聚弹，适合贯穿纵向目标。",
      accent: "#6fa8ff",
      secondary: "#d9e7ff",
      agility: 4,
      firepower: 4,
      armor: 4,
      fireRate: 0.9,
      damage: 1.02,
      shape: { nose: 34, body: 28, wing: 34, wingY: 7, rearWingY: 17, tail: 11, canard: 10, twinTail: false },
    },
    rafale: {
      id: "rafale",
      country: "FRA",
      name: "Dassault Rafale",
      shortName: "Rafale",
      role: "多用途 / 全域攻击",
      special: "阵风回旋：变形后增加相位相反的波动炮，覆盖更宽的战场。",
      accent: "#ff8294",
      secondary: "#ffe0e5",
      agility: 4,
      firepower: 5,
      armor: 3,
      fireRate: 1,
      damage: 1.13,
      shape: { nose: 31, body: 27, wing: 33, wingY: 6, rearWingY: 18, tail: 12, canard: 11, twinTail: false },
    },
    gripen: {
      id: "gripen",
      country: "SWE",
      name: "JAS 39 Gripen",
      shortName: "Gripen",
      role: "轻型 / 灵活游击",
      special: "北境轨道炮：变形后周期发射超高速中心弹，机动响应最快。",
      accent: "#ffd34f",
      secondary: "#fff2b8",
      agility: 5,
      firepower: 3,
      armor: 3,
      fireRate: 0.82,
      damage: 0.96,
      shape: { nose: 30, body: 24, wing: 25, wingY: 4, rearWingY: 16, tail: 10, canard: 9, twinTail: false },
    },
    su57: {
      id: "su57",
      country: "RUS",
      name: "Sukhoi Su-57",
      shortName: "Su-57",
      role: "重型 / 正面破阵",
      special: "新星破城炮：变形后发射慢速高伤重弹，拥有额外一格护盾。",
      accent: "#ff744f",
      secondary: "#ffd5c9",
      agility: 3,
      firepower: 5,
      armor: 5,
      fireRate: 1.06,
      damage: 1.16,
      shape: { nose: 33, body: 32, wing: 36, wingY: 2, rearWingY: 17, tail: 18, canard: 5, twinTail: true },
    },
    j20: {
      id: "j20",
      country: "CHN",
      name: "Chengdu J-20",
      shortName: "J-20",
      role: "远程 / 阵列压制",
      special: "威龙僚机阵：变形后展开双侧无人翼，终极形态可协同发射追踪弹。",
      accent: "#e85d75",
      secondary: "#ffd8df",
      agility: 4,
      firepower: 4,
      armor: 4,
      fireRate: 0.98,
      damage: 1.08,
      shape: { nose: 36, body: 32, wing: 31, wingY: 0, rearWingY: 17, tail: 17, canard: 11, twinTail: true },
    },
  };

  function loadSelectedFighterId() {
    try {
      const saved = window.localStorage.getItem("mouse-strike-fighter");
      return FIGHTERS[saved] ? saved : "f22";
    } catch {
      return "f22";
    }
  }

  const state = {
    running: false,
    ended: false,
    animationFrame: 0,
    previousTime: 0,
    elapsed: 0,
    width: 0,
    height: 0,
    score: 0,
    lives: 3,
    combo: 1,
    comboTimer: 0,
    wave: 1,
    kills: 0,
    spawnCount: 0,
    bossWave: 0,
    fighterId: loadSelectedFighterId(),
    maxLives: 3,
    transformStage: 0,
    transformPulse: 0,
    transformProgress: 0,
    transformTarget: 0,
    transformEnergy: 100,
    tacticalCooldown: 0,
    formationTimer: 7,
    formationIndex: 0,
    awaitingModule: false,
    damageMultiplier: 1,
    fireRateMultiplier: 1,
    energyGainMultiplier: 1,
    modules: [],
    bossKills: 0,
    skillUses: 0,
    formChanges: 0,
    impactFlash: 0,
    weaponLevel: 1,
    weaponEnergy: 0,
    overdrive: 0,
    shotCount: 0,
    fireTimer: 0,
    spawnTimer: 0,
    shake: 0,
    pointer: { x: 0, y: 0, active: false },
    player: { x: 0, y: 0, radius: 16, invulnerable: 0 },
    bullets: [],
    enemyBullets: [],
    enemies: [],
    pickups: [],
    particles: [],
    floatingTexts: [],
    stars: [],
  };

  function getFighter() {
    return FIGHTERS[state.fighterId] || FIGHTERS.f22;
  }

  function getTransformStage(level = state.weaponLevel) {
    if (level >= 5) return 2;
    if (level >= 3) return 1;
    return 0;
  }

  function drawFighterSilhouette(target, fighter, stage = 0, scale = 1, opacity = 1) {
    const shape = fighter.shape;
    const wing = shape.wing * (1 + stage * 0.13);
    const nose = shape.nose + stage * 2;
    const bodyEnd = shape.body + stage * 2;
    const tail = shape.tail * (1 + stage * 0.08);
    const canard = shape.canard + stage * 3;

    target.save();
    target.scale(scale, scale);
    target.globalAlpha = opacity;
    target.fillStyle = fighter.accent;
    target.beginPath();
    target.moveTo(0, -nose);
    target.lineTo(shape.body * 0.28, -nose * 0.3);
    target.lineTo(canard, -5);
    target.lineTo(wing, shape.wingY - stage * 2);
    target.lineTo(wing * 0.57, shape.rearWingY + stage * 2);
    target.lineTo(tail, bodyEnd - 5);
    target.lineTo(shape.body * 0.24, bodyEnd - 8);
    target.lineTo(0, bodyEnd);
    target.lineTo(-shape.body * 0.24, bodyEnd - 8);
    target.lineTo(-tail, bodyEnd - 5);
    target.lineTo(-wing * 0.57, shape.rearWingY + stage * 2);
    target.lineTo(-wing, shape.wingY - stage * 2);
    target.lineTo(-canard, -5);
    target.lineTo(-shape.body * 0.28, -nose * 0.3);
    target.closePath();
    target.fill();

    target.fillStyle = fighter.secondary;
    target.beginPath();
    target.moveTo(0, -nose * 0.66);
    target.lineTo(5 + stage, 8);
    target.lineTo(0, 13);
    target.lineTo(-5 - stage, 8);
    target.closePath();
    target.fill();

    target.fillStyle = "#090b0a";
    if (shape.twinTail) {
      target.fillRect(-tail * 0.72, bodyEnd - 9, 4, 12);
      target.fillRect(tail * 0.72 - 4, bodyEnd - 9, 4, 12);
    } else {
      target.fillRect(-2.5, bodyEnd - 10, 5, 12);
    }

    if (stage >= 1) {
      target.fillStyle = fighter.secondary;
      target.fillRect(-wing + 2, shape.wingY - 4, 11, 4);
      target.fillRect(wing - 13, shape.wingY - 4, 11, 4);
      target.fillStyle = fighter.accent;
      target.fillRect(-wing - 3, shape.wingY - 7, 6, 15);
      target.fillRect(wing - 3, shape.wingY - 7, 6, 15);
    }

    if (stage >= 2) {
      target.fillStyle = fighter.secondary;
      target.save();
      target.translate(-wing - 4, shape.wingY);
      target.rotate(Math.PI / 4);
      target.fillRect(-4, -4, 8, 8);
      target.restore();
      target.save();
      target.translate(wing + 4, shape.wingY);
      target.rotate(Math.PI / 4);
      target.fillRect(-4, -4, 8, 8);
      target.restore();
    }

    target.restore();
  }

  function drawFighterThumbnail(option, fighter) {
    const thumb = option.querySelector("canvas");
    const thumbContext = thumb.getContext("2d");
    thumbContext.clearRect(0, 0, thumb.width, thumb.height);
    thumbContext.strokeStyle = "rgba(238, 242, 232, 0.08)";
    thumbContext.beginPath();
    thumbContext.moveTo(4, thumb.height / 2);
    thumbContext.lineTo(thumb.width - 4, thumb.height / 2);
    thumbContext.stroke();
    thumbContext.save();
    thumbContext.translate(thumb.width / 2, thumb.height / 2 + 1);
    drawFighterSilhouette(thumbContext, fighter, 0, 0.72);
    thumbContext.restore();
  }

  function drawHangarPreview() {
    visuals?.setFighter(getFighter());
  }

  function selectFighter(fighterId, persist = true) {
    if (!FIGHTERS[fighterId]) return;
    state.fighterId = fighterId;
    const fighter = getFighter();
    document.documentElement.style.setProperty("--fighter-accent", fighter.accent);
    document.documentElement.style.setProperty("--fighter-secondary", fighter.secondary);
    selectedCountry.textContent = fighter.country;
    selectedRole.textContent = fighter.role;
    selectedName.textContent = fighter.name;
    selectedSpecial.textContent = fighter.special;
    agilityStat.style.width = `${fighter.agility * 20}%`;
    firepowerStat.style.width = `${fighter.firepower * 20}%`;
    armorStat.style.width = `${fighter.armor * 20}%`;
    startButtonLabel.textContent = `驾驶 ${fighter.shortName} 出击`;
    fighterOptions.forEach((option) => {
      const selected = option.dataset.fighter === fighterId;
      option.classList.toggle("is-selected", selected);
      option.setAttribute("aria-pressed", String(selected));
    });
    drawHangarPreview();
    updateAbilityHud();

    if (persist) {
      try {
        window.localStorage.setItem("mouse-strike-fighter", fighterId);
      } catch {
        // Selection still applies for the current page when storage is unavailable.
      }
    }
  }

  function initializeHangar() {
    fighterOptions.forEach((option) => {
      const fighter = FIGHTERS[option.dataset.fighter];
      drawFighterThumbnail(option, fighter);
      option.addEventListener("click", async () => {
        await audio?.unlock();
        selectFighter(option.dataset.fighter);
        audio?.fighterSelect(option.dataset.fighter);
      });
    });
    selectFighter(state.fighterId, false);
  }

  function syncAudioControls() {
    if (!audio) {
      document.querySelector(".audio-controls").hidden = true;
      return;
    }
    const silent = audio.muted || audio.volume <= 0;
    soundToggle.classList.toggle("is-muted", silent);
    soundToggle.setAttribute("aria-label", silent ? "开启音效" : "关闭音效");
    soundToggle.title = silent ? "开启音效" : "关闭音效";
    volumeSlider.value = String(Math.round(audio.volume * 100));
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.width = rect.width;
    state.height = rect.height;
    visuals?.resizeBattle(state.width, state.height);

    if (!state.pointer.active) {
      state.pointer.x = state.width / 2;
      state.pointer.y = state.height * 0.78;
      state.player.x = state.pointer.x;
      state.player.y = state.pointer.y;
    } else {
      state.pointer.x = Math.min(state.width - 24, state.pointer.x);
      state.pointer.y = Math.min(state.height - 24, state.pointer.y);
    }

    createStars();
  }

  function createStars() {
    const count = Math.max(38, Math.floor((state.width * state.height) / 14500));
    state.stars = Array.from({ length: count }, () => ({
      x: Math.random() * state.width,
      y: Math.random() * state.height,
      size: Math.random() > 0.88 ? 2 : 1,
      speed: 18 + Math.random() * 48,
      alpha: 0.18 + Math.random() * 0.5,
    }));
  }

  function renderLifeSlots() {
    if (livesValue.children.length === state.maxLives) return;
    livesValue.replaceChildren(...Array.from({ length: state.maxLives }, () => document.createElement("span")));
  }

  function resetGame() {
    const fighter = getFighter();
    state.ended = false;
    state.elapsed = 0;
    state.score = 0;
    state.maxLives = fighter.armor >= 5 ? 4 : 3;
    state.lives = state.maxLives;
    state.combo = 1;
    state.comboTimer = 0;
    state.wave = 1;
    state.kills = 0;
    state.spawnCount = 0;
    state.bossWave = 0;
    state.weaponLevel = 3;
    state.weaponEnergy = 0;
    state.transformStage = 1;
    state.transformPulse = 1;
    state.transformProgress = 0;
    state.transformTarget = 0;
    state.transformEnergy = 100;
    state.tacticalCooldown = 0;
    state.formationTimer = 7;
    state.formationIndex = 0;
    state.awaitingModule = false;
    state.damageMultiplier = 1;
    state.fireRateMultiplier = 1;
    state.energyGainMultiplier = 1;
    state.modules = [];
    state.bossKills = 0;
    state.skillUses = 0;
    state.formChanges = 0;
    state.overdrive = 4;
    state.shotCount = 0;
    state.fireTimer = 0;
    state.spawnTimer = 0.22;
    state.shake = 0;
    state.impactFlash = 0;
    state.bullets = [];
    state.enemyBullets = [];
    state.enemies = [];
    state.pickups = [];
    state.particles = [];
    state.floatingTexts = [];
    state.player.x = state.width / 2;
    state.player.y = state.height * 0.78;
    state.player.invulnerable = 0;
    state.pointer.x = state.player.x;
    state.pointer.y = state.player.y;
    state.pointer.active = false;
    gameOverPanel.hidden = true;
    moduleChoice.hidden = true;
    bossHud.hidden = true;
    renderLifeSlots();
    updateHud();
    showWave("TACTICAL DEPLOY");
  }

  async function startGame() {
    audio?.stopAll();
    const audioUnlock = audio?.unlock();
    audioUnlock?.then((ready) => {
      if (ready) audio.launch(state.fighterId);
    });
    menuScreen.hidden = true;
    gameScreen.hidden = false;
    document.body.style.overflow = "hidden";
    document.body.classList.add("game-active");
    resizeCanvas();
    resetGame();

    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Fullscreen is optional. The game remains fully usable inline.
      }
    }

    state.running = true;
    state.previousTime = performance.now();
    cancelAnimationFrame(state.animationFrame);
    state.animationFrame = requestAnimationFrame(gameLoop);
  }

  function restartGame() {
    audio?.stopAll();
    const audioUnlock = audio?.unlock();
    audioUnlock?.then((ready) => {
      if (ready) audio.launch(state.fighterId);
    });
    resizeCanvas();
    resetGame();
    state.running = true;
    state.previousTime = performance.now();
    cancelAnimationFrame(state.animationFrame);
    state.animationFrame = requestAnimationFrame(gameLoop);
  }

  async function exitGame() {
    state.running = false;
    cancelAnimationFrame(state.animationFrame);
    gameScreen.hidden = true;
    menuScreen.hidden = false;
    document.body.style.overflow = "";
    document.body.classList.remove("game-active");
    state.awaitingModule = false;
    moduleChoice.hidden = true;
    audio?.stopAll();
    audio?.back();

    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        // Returning to the menu is the primary exit behavior.
      }
    }

    startButton.focus();
  }

  function setPointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    state.pointer.x = Math.max(24, Math.min(state.width - 24, clientX - rect.left));
    state.pointer.y = Math.max(58, Math.min(state.height - 24, clientY - rect.top));
    state.pointer.active = true;
  }

  function clearEnemyBulletsAround(x, y, radius) {
    let cleared = 0;
    const radiusSquared = radius * radius;
    state.enemyBullets = state.enemyBullets.filter((bullet) => {
      const dx = bullet.x - x;
      const dy = bullet.y - y;
      if (dx * dx + dy * dy <= radiusSquared) {
        cleared += 1;
        burst(bullet.x, bullet.y, getFighter().accent, 3, 80, 0.28);
        return false;
      }
      return true;
    });
    return cleared;
  }

  function toggleTransform() {
    if (!state.running || state.ended || state.awaitingModule) return;
    const entering = state.transformTarget < 0.5;
    if (entering && !canEnterAssault(state.transformEnergy)) {
      showUpgrade("变形能量不足 // 需要 28%", "ENERGY LOW");
      return;
    }

    state.transformTarget = entering ? 1 : 0;
    state.formChanges += 1;
    state.transformPulse = 1.45;
    state.player.invulnerable = Math.max(state.player.invulnerable, entering ? 0.68 : 0.34);
    state.shake = entering ? 14 : 8;
    if (entering) {
      const cleared = clearEnemyBulletsAround(state.player.x, state.player.y, 150);
      state.transformEnergy = Math.min(100, state.transformEnergy + cleared * 0.45);
      showUpgrade(`${getFighter().shortName} // 强袭机甲`, "MECHANICAL SHIFT");
      burst(state.player.x, state.player.y, getFighter().accent, 54, 330, 1.1);
    } else {
      showUpgrade(`${getFighter().shortName} // 飞行形态`, "FLIGHT RESTORE");
      burst(state.player.x, state.player.y, getFighter().secondary, 30, 230, 0.72);
    }
    audio?.transform(entering);
    updateAbilityHud();
  }

  function fireTactical() {
    if (!state.running || state.ended || state.awaitingModule) return;
    if (state.tacticalCooldown > 0) {
      showUpgrade(`冷却 ${state.tacticalCooldown.toFixed(1)} SEC`, "TACTICAL SYSTEM");
      return;
    }

    const fighter = getFighter();
    const spec = tacticalSpec(fighter.id);
    const assault = state.transformProgress > 0.72;
    const x = state.player.x;
    const y = state.player.y - 24;
    const cleared = clearEnemyBulletsAround(x, y, assault ? 250 : 205);
    const blastRadius = assault ? 245 : 190;
    const blastDamage = (assault ? 11 : 7) * fighter.damage * state.damageMultiplier;

    for (let enemyIndex = state.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
      const enemy = state.enemies[enemyIndex];
      const distance = Math.hypot(enemy.x - x, enemy.y - y);
      if (distance > blastRadius + enemy.radius) continue;
      enemy.hp -= enemy.type === "boss" ? blastDamage * 0.42 : blastDamage;
      if (enemy.hp <= 0) killEnemy(enemyIndex);
    }

    if (spec.projectile === "rail") {
      const center = (spec.count - 1) / 2;
      for (let shot = 0; shot < spec.count; shot += 1) {
        addPlayerBullet(x + (shot - center) * 13, y, (shot - center) * 0.018, 1180, "rail", assault ? 3.8 : 2.8, {
          color: fighter.accent,
          radius: 5,
        });
      }
    } else if (spec.projectile === "wave") {
      const center = (spec.count - 1) / 2;
      for (let shot = 0; shot < spec.count; shot += 1) {
        addPlayerBullet(x, y, (shot - center) * 0.055, 760, "wave", assault ? 3.2 : 2.3, {
          phase: shot * 0.7,
          waveAmp: 28 + (shot % 3) * 6,
          color: fighter.accent,
          radius: 6,
        });
      }
    } else if (spec.projectile === "heavy") {
      const center = (spec.count - 1) / 2;
      for (let shot = 0; shot < spec.count; shot += 1) {
        addPlayerBullet(x, y, (shot - center) * 0.085, 610, "heavy", assault ? 6.8 : 5.1, {
          color: shot % 2 ? fighter.secondary : fighter.accent,
          radius: assault ? 11 : 9,
        });
      }
    } else {
      const center = (spec.count - 1) / 2;
      for (let shot = 0; shot < spec.count; shot += 1) {
        addPlayerBullet(x, y, (shot - center) * 0.045, 680 + (shot % 3) * 45, "seeker", assault ? 3.5 : 2.6, {
          color: shot % 2 ? fighter.secondary : fighter.accent,
          radius: 6,
        });
      }
    }

    state.tacticalCooldown = spec.cooldown * (assault ? 0.84 : 1);
    state.transformEnergy = Math.min(100, state.transformEnergy + cleared * 0.6);
    state.skillUses += 1;
    state.shake = assault ? 17 : 11;
    state.impactFlash = 0.18;
    audio?.tactical?.(fighter.id, assault);
    showUpgrade(`${spec.name} // ${cleared} BULLETS PURGED`, "TACTICAL RELEASE");
    burst(x, y, fighter.accent, assault ? 72 : 48, assault ? 390 : 310, 1.15);
    updateAbilityHud();
  }

  function applyModule(moduleId) {
    if (!state.awaitingModule || !MODULES[moduleId]) return;
    const module = MODULES[moduleId];
    state.modules.push(moduleId);
    if (moduleId === "power") {
      state.damageMultiplier *= 1.22;
    } else if (moduleId === "velocity") {
      state.fireRateMultiplier *= 0.86;
      state.energyGainMultiplier += 0.3;
    } else if (moduleId === "bulwark") {
      state.maxLives += 1;
      state.lives = Math.min(state.maxLives, state.lives + 1);
      renderLifeSlots();
    }
    state.awaitingModule = false;
    moduleChoice.hidden = true;
    audio?.moduleEquipped?.();
    showUpgrade(module.detail, module.name);
    updateHud();
  }

  function spawnFormation() {
    const formation = formationPattern(state.formationIndex, state.width);
    state.formationIndex += 1;
    formation.units.forEach((unit) => {
      const enemy = makeEnemy(unit.type, unit.x);
      enemy.y = unit.y;
      enemy.drift = unit.drift;
      state.enemies.push(enemy);
    });
    showWave(formation.name);
  }

  function addPlayerBullet(x, y, angle, speed, type = "pulse", damage = 1, options = {}) {
    const fighter = getFighter();
    state.bullets.push({
      x,
      y,
      baseX: x,
      vx: Math.sin(angle) * speed,
      vy: -Math.cos(angle) * speed,
      speed,
      radius: options.radius || 4,
      damage: damage * fighter.damage * state.damageMultiplier,
      type,
      age: 0,
      phase: options.phase || 0,
      waveAmp: options.waveAmp || 0,
      color: options.color || fighter.secondary,
    });
  }

  function fireSignatureWeapon(x, y, level) {
    if (level < 3) return;
    const fighter = getFighter();
    const apex = level >= 5;

    if (fighter.id === "f22" && state.shotCount % (apex ? 2 : 3) === 0) {
      addPlayerBullet(x - 20, y + 7, -0.04, 610, "seeker", apex ? 2.5 : 1.8, {
        color: fighter.accent,
        radius: 6,
      });
      addPlayerBullet(x + 20, y + 7, 0.04, 610, "seeker", apex ? 2.5 : 1.8, {
        color: fighter.accent,
        radius: 6,
      });
    } else if (fighter.id === "typhoon" && state.shotCount % 2 === 0) {
      addPlayerBullet(x - 25, y + 5, 0.08, 980, "rail", apex ? 2.2 : 1.5, {
        color: fighter.accent,
        radius: 4,
      });
      addPlayerBullet(x + 25, y + 5, -0.08, 980, "rail", apex ? 2.2 : 1.5, {
        color: fighter.accent,
        radius: 4,
      });
    } else if (fighter.id === "rafale") {
      addPlayerBullet(x - 22, y + 6, -0.05, 700, "wave", apex ? 1.8 : 1.25, {
        phase: state.shotCount * 0.4,
        waveAmp: apex ? 30 : 22,
        color: fighter.accent,
        radius: 5,
      });
      addPlayerBullet(x + 22, y + 6, 0.05, 700, "wave", apex ? 1.8 : 1.25, {
        phase: Math.PI + state.shotCount * 0.4,
        waveAmp: apex ? 30 : 22,
        color: fighter.accent,
        radius: 5,
      });
    } else if (fighter.id === "gripen" && state.shotCount % (apex ? 2 : 3) === 0) {
      addPlayerBullet(x, y - 5, 0, 1180, "rail", apex ? 3.1 : 2.25, {
        color: fighter.accent,
        radius: 5,
      });
    } else if (fighter.id === "su57" && state.shotCount % (apex ? 2 : 3) === 0) {
      addPlayerBullet(x, y - 2, 0, 540, "heavy", apex ? 4.2 : 3.1, {
        color: fighter.accent,
        radius: apex ? 10 : 8,
      });
      if (apex) {
        addPlayerBullet(x - 16, y + 4, -0.04, 520, "heavy", 2.6, {
          color: fighter.secondary,
          radius: 7,
        });
        addPlayerBullet(x + 16, y + 4, 0.04, 520, "heavy", 2.6, {
          color: fighter.secondary,
          radius: 7,
        });
      }
    } else if (fighter.id === "j20") {
      const type = apex ? "seeker" : "drone";
      addPlayerBullet(x - 29, y + 10, -0.03, apex ? 620 : 760, type, apex ? 1.9 : 1.2, {
        color: fighter.accent,
        radius: apex ? 5.5 : 4,
      });
      addPlayerBullet(x + 29, y + 10, 0.03, apex ? 620 : 760, type, apex ? 1.9 : 1.2, {
        color: fighter.accent,
        radius: apex ? 5.5 : 4,
      });
    }
  }

  function shoot() {
    const x = state.player.x;
    const y = state.player.y - 21;
    const level = state.weaponLevel;
    state.shotCount += 1;

    if (level === 1) {
      addPlayerBullet(x - 7, y, 0, 800);
      addPlayerBullet(x + 7, y, 0, 800);
    } else if (level === 2) {
      [-0.12, 0, 0.12].forEach((angle) => addPlayerBullet(x, y, angle, 810));
    } else if (level === 3) {
      [-0.24, -0.12, 0, 0.12, 0.24].forEach((angle) => addPlayerBullet(x, y, angle, 790));
    } else if (level === 4) {
      [-0.11, 0, 0.11].forEach((angle) => addPlayerBullet(x, y, angle, 820));
      addPlayerBullet(x - 13, y + 2, -0.07, 690, "wave", 1.35, {
        phase: 0,
        waveAmp: 22,
        color: COLORS.wave,
        radius: 5,
      });
      addPlayerBullet(x + 13, y + 2, 0.07, 690, "wave", 1.35, {
        phase: Math.PI,
        waveAmp: 22,
        color: COLORS.wave,
        radius: 5,
      });
    } else {
      [-0.2, -0.1, 0, 0.1, 0.2].forEach((angle) => addPlayerBullet(x, y, angle, 830));
    }

    fireSignatureWeapon(x, y, level);

    if (state.transformProgress > 0.72) {
      const assaultDamage = 1.5 + state.transformProgress * 0.65;
      [-0.38, -0.28, 0.28, 0.38].forEach((angle, index) => {
        addPlayerBullet(x + (index < 2 ? -18 : 18), y + 8, angle, 760, index % 2 ? "wave" : "heavy", assaultDamage, {
          color: index % 2 ? getFighter().secondary : getFighter().accent,
          radius: index % 2 ? 5 : 7,
          phase: state.shotCount * 0.25 + index,
          waveAmp: 18,
        });
      });
      fireSignatureWeapon(x, y + 5, 5);
    }

    if (state.overdrive > 0) {
      [-0.32, -0.21, -0.1, 0, 0.1, 0.21, 0.32].forEach((angle) => {
        addPlayerBullet(x, y + 5, angle, 880, "overdrive", 1.25, {
          color: COLORS.overdrive,
          radius: 4.5,
        });
      });
    }

    burst(x, y, state.overdrive > 0 ? COLORS.overdrive : getFighter().secondary, 3, 45, 0.14);
    audio?.fire(state.fighterId, state.overdrive > 0, x, state.width);
  }

  function makeEnemy(type, x) {
    const waveScale = 1 + Math.min(1.7, state.wave * 0.075);
    const configs = {
      scout: { radius: 13, hp: 1 + Math.floor(state.wave / 7), speed: 145, drift: 76, score: 100 },
      gunner: { radius: 22, hp: 5 + state.wave, speed: 74, drift: 42, score: 260 },
      spinner: { radius: 19, hp: 4 + state.wave, speed: 88, drift: 32, score: 340 },
      elite: { radius: 30, hp: 13 + state.wave * 2, speed: 55, drift: 30, score: 720 },
    };
    const config = configs[type];
    return {
      type,
      x,
      y: -config.radius * 2,
      radius: config.radius,
      hp: config.hp,
      maxHp: config.hp,
      speed: config.speed * waveScale,
      drift: (Math.random() - 0.5) * config.drift,
      score: config.score,
      phase: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI,
      rotationSpeed: type === "spinner" ? 3.4 : (Math.random() - 0.5) * 1.4,
      fireTimer: 0.7 + Math.random() * 1.1,
      pattern: 0,
    };
  }

  function spawnEnemy() {
    state.spawnCount += 1;
    const margin = 36;
    const x = margin + Math.random() * Math.max(1, state.width - margin * 2);
    let type = "scout";

    if (state.spawnCount % 12 === 0 || (state.wave >= 5 && Math.random() < 0.08)) {
      type = "elite";
    } else if (state.spawnCount % 7 === 0) {
      type = "spinner";
    } else if (state.spawnCount % 4 === 0 || Math.random() < Math.min(0.3, state.wave * 0.035)) {
      type = "gunner";
    }

    state.enemies.push(makeEnemy(type, x));
  }

  function spawnBoss() {
    const hp = 220 + state.wave * 30;
    const partHp = Math.round(hp * 0.18);
    state.enemyBullets = [];
    state.enemies.push({
      type: "boss",
      x: state.width / 2,
      y: -100,
      targetY: Math.min(145, state.height * 0.2),
      radius: 66,
      hp,
      maxHp: hp,
      speed: 70,
      drift: 0,
      score: 5000,
      phase: 0,
      rotation: 0,
      rotationSpeed: 0,
      fireTimer: 1.1,
      pattern: 0,
      bossPhase: 1,
      parts: {
        left: { hp: partHp, maxHp: partHp, destroyed: false },
        right: { hp: partHp, maxHp: partHp, destroyed: false },
      },
    });
    bossName.textContent = `重装母舰 / PHASE 1`;
    bossProgress.style.width = "100%";
    bossHud.hidden = false;
    showWave("WARNING // BOSS");
    audio?.bossWarning();
  }

  function addEnemyBullet(x, y, angle, speed, options = {}) {
    state.enemyBullets.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: options.radius || 5,
      color: options.color || COLORS.enemyBullet,
      age: 0,
      curve: options.curve || 0,
    });
  }

  function fireAtPlayer(enemy, spread = 0, count = 1, speed = 265) {
    const base = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
    const center = (count - 1) / 2;
    for (let i = 0; i < count; i += 1) {
      addEnemyBullet(enemy.x, enemy.y + enemy.radius * 0.45, base + (i - center) * spread, speed);
    }
  }

  function fireBossPattern(enemy) {
    const phase = enemy.bossPhase || 1;
    const activePods = [enemy.parts?.left, enemy.parts?.right].filter((part) => part && !part.destroyed).length;
    const speedBoost = 1 + (phase - 1) * 0.16;
    enemy.pattern = (enemy.pattern + 1) % 3;
    if (enemy.pattern === 0) {
      fireAtPlayer(enemy, 0.12, Math.max(3, 2 + phase * 2 + activePods), 275 * speedBoost);
    } else if (enemy.pattern === 1) {
      const count = 5 + phase * 2 + activePods;
      const center = (count - 1) / 2;
      for (let i = 0; i < count; i += 1) {
        const offset = (i - center) * 0.2;
        addEnemyBullet(enemy.x, enemy.y + 32, Math.PI / 2 + offset, 225 * speedBoost, {
          color: COLORS.boss,
          radius: 6,
        });
      }
    } else {
      const count = 8 + phase * 2 + activePods;
      for (let i = 0; i < count; i += 1) {
        addEnemyBullet(enemy.x, enemy.y, (Math.PI * 2 * i) / count + state.elapsed * 0.25, 180 * speedBoost, {
          color: COLORS.elite,
          radius: 5.5,
          curve: i % 2 === 0 ? 0.38 : -0.38,
        });
      }
    }

    if (phase === 3) fireAtPlayer(enemy, 0.08, 3, 340);
    audio?.enemyFire(enemy.x, state.width, true);
  }

  function updateBossPhase(enemy) {
    const ratio = enemy.hp / enemy.maxHp;
    const nextPhase = ratio <= 0.33 ? 3 : ratio <= 0.66 ? 2 : 1;
    if (nextPhase <= enemy.bossPhase) return;

    enemy.bossPhase = nextPhase;
    enemy.fireTimer = 0.3;
    state.enemyBullets = [];
    state.shake = nextPhase === 3 ? 18 : 12;
    state.impactFlash = 0.22;
    bossName.textContent = `重装母舰 / PHASE ${nextPhase}`;
    audio?.bossPhase(nextPhase);
    showUpgrade(
      nextPhase === 3 ? "核心暴走 // FINAL FORM" : "装甲展开 // PHASE 2",
      "BOSS TRANSFORM",
    );
    burst(enemy.x, enemy.y, nextPhase === 3 ? COLORS.boss : COLORS.elite, 56, 300, 1.1);
  }

  function burst(x, y, color, count = 10, speed = 150, life = 0.5) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.35 + Math.random() * 0.65);
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life,
        maxLife: life,
        size: 1.5 + Math.random() * 3.5,
        color,
      });
    }
  }

  function addFloatingText(x, y, text, color) {
    state.floatingTexts.push({ x, y, text, color, life: 0.8, maxLife: 0.8 });
  }

  function spawnPickup(x, y, type = "core") {
    state.pickups.push({
      x,
      y,
      type,
      radius: type === "core" ? 11 : 10,
      vy: 82,
      age: Math.random() * Math.PI * 2,
    });
  }

  function circlesOverlap(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const radius = a.radius + b.radius;
    return dx * dx + dy * dy < radius * radius;
  }

  function collectPowerCore() {
    audio?.pickup("core");
    state.transformEnergy = Math.min(100, state.transformEnergy + 16 * state.energyGainMultiplier);
    if (state.weaponLevel < WEAPONS.length) {
      const current = WEAPONS[state.weaponLevel - 1];
      state.weaponEnergy += 1;
      if (state.weaponEnergy >= current.threshold) {
        const previousStage = state.transformStage;
        state.weaponLevel += 1;
        state.weaponEnergy = 0;
        state.transformStage = getTransformStage();
        const weapon = WEAPONS[state.weaponLevel - 1];
        const fighter = getFighter();
        if (state.transformStage > previousStage) {
          const apex = state.transformStage === 2;
          showUpgrade(
            `${fighter.shortName} // ${apex ? "终极形态" : "战术翼展开"}`,
            apex ? "APEX TRANSFORM" : "TACTICAL TRANSFORM",
          );
          state.transformPulse = 1.35;
          state.shake = apex ? 13 : 9;
          audio?.transform(apex);
          burst(state.player.x, state.player.y, fighter.accent, apex ? 52 : 38, apex ? 310 : 255, 1.05);
        } else {
          showUpgrade(`LV.${weapon.level} ${weapon.name}`, "WEAPON UPGRADE");
          audio?.weaponUpgrade();
          burst(state.player.x, state.player.y, fighter.accent, 34, 245, 0.9);
          state.shake = 7;
        }
      }
    } else {
      state.overdrive = 6;
      audio?.overdrive();
      showUpgrade("极限超载 // 6 SEC", "MAXIMUM OUTPUT");
      burst(state.player.x, state.player.y, COLORS.overdrive, 40, 280, 0.95);
    }
    updateHud();
  }

  function collectRepair() {
    audio?.pickup("repair");
    state.lives = Math.min(state.maxLives, state.lives + 1);
    showUpgrade("护盾恢复 +1", "SYSTEM RECOVERY");
    burst(state.player.x, state.player.y, COLORS.repair, 22, 190, 0.75);
    updateHud();
  }

  function damagePlayer(x, y) {
    if (state.player.invulnerable > 0 || state.ended) return;

    if (state.transformProgress > 0.78 && state.transformEnergy >= 22) {
      state.transformEnergy -= 22;
      state.player.invulnerable = 0.72;
      state.shake = 10;
      state.impactFlash = 0.12;
      clearEnemyBulletsAround(state.player.x, state.player.y, 96);
      burst(x, y, getFighter().accent, 28, 240, 0.68);
      addFloatingText(x, y, "ARMOR ABSORB", getFighter().accent);
      audio?.armorAbsorb?.();
      updateHud();
      return;
    }

    burst(x, y, COLORS.enemy, 22, 220, 0.75);
    audio?.playerHit();
    state.lives -= 1;
    state.combo = 1;
    state.comboTimer = 0;
    state.weaponEnergy = Math.max(0, state.weaponEnergy - 1);
    state.player.invulnerable = 1.15 + getFighter().armor * 0.08;
    state.shake = 14;
    state.enemyBullets = state.enemyBullets.filter((bullet) => {
      const dx = bullet.x - state.player.x;
      const dy = bullet.y - state.player.y;
      return dx * dx + dy * dy > 150 * 150;
    });
    updateHud();

    if (state.lives <= 0) endGame();
  }

  function killEnemy(index) {
    const enemy = state.enemies[index];
    if (!enemy) return;

    const previousCombo = state.combo;
    const gainedScore = enemy.score * state.combo;
    state.enemies.splice(index, 1);
    state.kills += 1;
    state.score += gainedScore;
    const energyGain = enemy.type === "boss" ? 34 : enemy.type === "elite" ? 12 : 3.4;
    state.transformEnergy = Math.min(100, state.transformEnergy + energyGain * state.energyGainMultiplier);
    state.combo = Math.min(12, state.combo + 1);
    state.comboTimer = 2.5;
    state.shake = enemy.type === "boss" ? 18 : Math.min(6, enemy.radius * 0.12);
    state.impactFlash = enemy.type === "boss" ? 0.24 : 0.08;
    audio?.enemyKilled(enemy.type, enemy.x, state.width);
    addFloatingText(enemy.x, enemy.y, `+${gainedScore}`, enemy.type === "boss" ? COLORS.boss : COLORS.elite);
    burst(
      enemy.x,
      enemy.y,
      enemy.type === "boss" ? COLORS.boss : enemy.type === "elite" ? COLORS.elite : COLORS.enemy,
      enemy.type === "boss" ? 90 : 20 + Math.floor(enemy.radius * 0.65),
      enemy.type === "boss" ? 320 : 185,
      enemy.type === "boss" ? 1.25 : 0.68,
    );

    if (previousCombo < 8 && state.combo >= 8) {
      state.overdrive = Math.max(state.overdrive, 3.5);
      audio?.rush();
      showUpgrade("RUSH MODE // 火力狂热", "CHAIN REACTION");
      addFloatingText(state.width / 2, state.height * 0.42, "RUSH ×8", COLORS.overdrive);
      state.shake = 10;
    }

    if (enemy.type === "boss") {
      state.bossKills += 1;
      bossHud.hidden = true;
      state.enemyBullets = [];
      [-38, 0, 38].forEach((offset) => spawnPickup(enemy.x + offset, enemy.y, "core"));
      if (state.lives < state.maxLives) spawnPickup(enemy.x, enemy.y - 22, "repair");
      showUpgrade("母舰已摧毁", "THREAT CLEARED");
      state.awaitingModule = true;
      moduleChoice.hidden = false;
      moduleButtons[0]?.focus();
    } else {
      const guaranteedCore = enemy.type === "elite" || state.kills % 4 === 0;
      if (guaranteedCore || Math.random() < 0.08) spawnPickup(enemy.x, enemy.y, "core");
      if (state.lives < state.maxLives && Math.random() < 0.045) spawnPickup(enemy.x, enemy.y, "repair");
    }

    updateHud();
  }

  function endGame() {
    state.running = false;
    state.ended = true;
    finalScore.textContent = state.score.toLocaleString("zh-CN");
    finalWave.textContent = String(state.wave).padStart(2, "0");
    finalWeapon.textContent = `LV.${state.weaponLevel}`;
    finalFighter.textContent = getFighter().shortName;
    try {
      const previousBest = Number(window.localStorage.getItem("mouse-strike-best") || 0);
      if (state.score > previousBest) window.localStorage.setItem("mouse-strike-best", String(state.score));
    } catch {
      // Results remain visible when storage is unavailable.
    }
    audio?.stopAll();
    audio?.gameOver();
    gameOverPanel.hidden = false;
    restartButton.focus();
  }

  function findNearestEnemy(bullet) {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const enemy of state.enemies) {
      if (enemy.y > bullet.y + 36) continue;
      const dx = enemy.x - bullet.x;
      const dy = enemy.y - bullet.y;
      const distance = dx * dx + dy * dy;
      if (distance < nearestDistance) {
        nearest = enemy;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  function updatePlayerBullets(dt) {
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = state.bullets[i];
      bullet.age += dt;

      if (bullet.type === "wave") {
        bullet.baseX += bullet.vx * dt;
        bullet.x = bullet.baseX + Math.sin(bullet.age * 10 + bullet.phase) * bullet.waveAmp;
        bullet.y += bullet.vy * dt;
      } else if (bullet.type === "seeker") {
        const target = findNearestEnemy(bullet);
        if (target) {
          const dx = target.x - bullet.x;
          const dy = target.y - bullet.y;
          const length = Math.hypot(dx, dy) || 1;
          const desiredX = (dx / length) * bullet.speed;
          const desiredY = (dy / length) * bullet.speed;
          const turn = 1 - Math.pow(0.02, dt);
          bullet.vx += (desiredX - bullet.vx) * turn;
          bullet.vy += (desiredY - bullet.vy) * turn;
        }
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
      } else {
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
      }

      if (bullet.y < -50 || bullet.x < -70 || bullet.x > state.width + 70) {
        state.bullets.splice(i, 1);
      }
    }
  }

  function updateEnemies(dt) {
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];

      if (enemy.type === "boss") {
        updateBossPhase(enemy);
        if (enemy.y < enemy.targetY) {
          enemy.y = Math.min(enemy.targetY, enemy.y + enemy.speed * dt);
        } else {
          enemy.phase += dt;
          const phase = enemy.bossPhase || 1;
          enemy.x = state.width / 2 + Math.sin(enemy.phase * (0.68 + phase * 0.1)) * Math.max(30, state.width * (0.24 + phase * 0.025));
          enemy.fireTimer -= dt;
          if (enemy.fireTimer <= 0) {
            fireBossPattern(enemy);
            enemy.fireTimer = phase === 3 ? 0.38 : phase === 2 ? 0.52 : 0.72;
          }
        }
      } else {
        enemy.y += enemy.speed * dt;
        enemy.x += (enemy.drift + Math.sin(state.elapsed * 2.1 + enemy.phase) * 30) * dt;
        enemy.x = Math.max(enemy.radius, Math.min(state.width - enemy.radius, enemy.x));
        enemy.rotation += enemy.rotationSpeed * dt;
        enemy.fireTimer -= dt;

        if (enemy.type === "gunner" && enemy.y > 40 && enemy.fireTimer <= 0) {
          fireAtPlayer(enemy, 0, 1, 275 + state.wave * 4);
          audio?.enemyFire(enemy.x, state.width);
          enemy.fireTimer = 1.55 + Math.random() * 0.55;
        } else if (enemy.type === "spinner" && enemy.y > 55 && enemy.fireTimer <= 0) {
          for (let shot = 0; shot < 6; shot += 1) {
            addEnemyBullet(enemy.x, enemy.y, Math.PI / 2 - 0.65 + shot * 0.26, 220, {
              color: COLORS.elite,
              radius: 5,
              curve: shot % 2 === 0 ? 0.2 : -0.2,
            });
          }
          audio?.enemyFire(enemy.x, state.width);
          enemy.fireTimer = 1.55;
        } else if (enemy.type === "elite" && enemy.y > 50 && enemy.fireTimer <= 0) {
          fireAtPlayer(enemy, 0.16, 3, 255 + state.wave * 4);
          audio?.enemyFire(enemy.x, state.width);
          enemy.fireTimer = 1.15 + Math.random() * 0.4;
        }
      }

      if (enemy.type !== "boss" && enemy.y - enemy.radius > state.height) {
        state.enemies.splice(i, 1);
        state.combo = 1;
        state.comboTimer = 0;
        updateHud();
        continue;
      }

      if (circlesOverlap(enemy, state.player)) {
        if (enemy.type !== "boss") state.enemies.splice(i, 1);
        damagePlayer(enemy.x, enemy.y);
      }
    }
  }

  function updateEnemyBullets(dt) {
    for (let i = state.enemyBullets.length - 1; i >= 0; i -= 1) {
      const bullet = state.enemyBullets[i];
      bullet.age += dt;
      if (bullet.curve) {
        const angle = bullet.curve * dt;
        const vx = bullet.vx * Math.cos(angle) - bullet.vy * Math.sin(angle);
        const vy = bullet.vx * Math.sin(angle) + bullet.vy * Math.cos(angle);
        bullet.vx = vx;
        bullet.vy = vy;
      }
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;

      if (bullet.y > state.height + 30 || bullet.y < -30 || bullet.x < -30 || bullet.x > state.width + 30) {
        state.enemyBullets.splice(i, 1);
        continue;
      }

      if (circlesOverlap(bullet, state.player)) {
        state.enemyBullets.splice(i, 1);
        damagePlayer(bullet.x, bullet.y);
      }
    }
  }

  function resolveBulletHits() {
    for (let bulletIndex = state.bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
      const bullet = state.bullets[bulletIndex];
      let hit = false;

      for (let enemyIndex = state.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
        const enemy = state.enemies[enemyIndex];
        if (!circlesOverlap(bullet, enemy)) continue;

        state.bullets.splice(bulletIndex, 1);
        let appliedDamage = bullet.damage;
        if (enemy.type === "boss" && enemy.parts) {
          const relativeX = bullet.x - enemy.x;
          const partKey = relativeX < -34 ? "left" : relativeX > 34 ? "right" : null;
          const part = partKey ? enemy.parts[partKey] : null;
          if (part && !part.destroyed) {
            part.hp -= bullet.damage;
            appliedDamage *= 0.46;
            if (part.hp <= 0) {
              part.destroyed = true;
              state.score += 1400 * state.combo;
              state.enemyBullets = [];
              state.transformEnergy = Math.min(100, state.transformEnergy + 18);
              state.shake = 15;
              audio?.bossPart?.();
              addFloatingText(bullet.x, bullet.y, `${partKey.toUpperCase()} POD DESTROYED`, COLORS.elite);
              showUpgrade("武器舱摧毁 // 弹幕削弱", "BOSS PART BREAK");
              burst(bullet.x, bullet.y, COLORS.elite, 46, 290, 1.05);
            }
          }
        }
        enemy.hp -= appliedDamage;
        burst(bullet.x, bullet.y, bullet.color, 4, 90, 0.24);
        hit = true;

        if (enemy.type === "boss") {
          bossProgress.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
        }

        if (enemy.hp <= 0) killEnemy(enemyIndex);
        break;
      }

      if (hit) continue;
    }
  }

  function updatePickups(dt) {
    const fighter = getFighter();
    const magnetRadius = 58 + fighter.agility * 12 + (fighter.id === "j20" ? 18 : 0);
    for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
      const pickup = state.pickups[i];
      pickup.age += dt;
      const dx = state.player.x - pickup.x;
      const dy = state.player.y - pickup.y;
      const distance = Math.hypot(dx, dy);
      if (distance < magnetRadius) {
        const attraction = 1 - Math.pow(0.012, dt);
        pickup.x += dx * attraction;
        pickup.y += dy * attraction;
      } else {
        pickup.y += pickup.vy * dt;
        pickup.x += Math.sin(pickup.age * 3.4) * 18 * dt;
      }

      if (pickup.y - pickup.radius > state.height) {
        state.pickups.splice(i, 1);
        continue;
      }

      if (circlesOverlap(pickup, { ...state.player, radius: state.player.radius + 7 })) {
        state.pickups.splice(i, 1);
        if (pickup.type === "repair") collectRepair();
        else collectPowerCore();
      }
    }
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const particle = state.particles[i];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.pow(0.06, dt);
      particle.vy *= Math.pow(0.06, dt);
      particle.life -= dt;
      if (particle.life <= 0) state.particles.splice(i, 1);
    }
  }

  function updateFloatingTexts(dt) {
    for (let i = state.floatingTexts.length - 1; i >= 0; i -= 1) {
      const item = state.floatingTexts[i];
      item.y -= 34 * dt;
      item.life -= dt;
      if (item.life <= 0) state.floatingTexts.splice(i, 1);
    }
  }

  function update(dt) {
    if (state.awaitingModule) {
      updateAbilityHud();
      return;
    }

    state.elapsed += dt;
    state.player.invulnerable = Math.max(0, state.player.invulnerable - dt);
    state.transformPulse = Math.max(0, state.transformPulse - dt);
    state.comboTimer = Math.max(0, state.comboTimer - dt);
    state.shake = Math.max(0, state.shake - dt * 30);
    state.impactFlash = Math.max(0, state.impactFlash - dt * 0.9);
    state.tacticalCooldown = Math.max(0, state.tacticalCooldown - dt);
    state.transformProgress = nextTransformProgress(state.transformProgress, state.transformTarget, dt);
    state.transformEnergy = updateTransformEnergy(
      state.transformEnergy,
      state.transformProgress,
      state.transformTarget,
      dt,
      state.energyGainMultiplier,
    );
    if (state.transformEnergy <= 0 && state.transformTarget > 0) {
      state.transformTarget = 0;
      showUpgrade("能量耗尽 // 自动恢复飞行形态", "ENERGY DEPLETED");
      audio?.transform(false);
    }
    state.player.radius = 16 + state.transformProgress * 5;

    if (state.overdrive > 0) {
      state.overdrive = Math.max(0, state.overdrive - dt);
      updateWeaponHud();
    }

    if (state.comboTimer === 0 && state.combo > 1) {
      state.combo = 1;
      updateHud();
    }

    const fighter = getFighter();
    const assaultMobility = 1 + state.transformProgress * 0.42;
    const followBase = Math.max(0.00025, (0.0022 - fighter.agility * 0.00035) * assaultMobility);
    const follow = 1 - Math.pow(followBase, dt);
    state.player.x += (state.pointer.x - state.player.x) * follow;
    state.player.y += (state.pointer.y - state.player.y) * follow;

    state.fireTimer -= dt;
    if (state.fireTimer <= 0) {
      shoot();
      const weapon = WEAPONS[state.weaponLevel - 1];
      const rushRate = state.combo >= 8 ? 0.82 : 1;
      const assaultRate = state.transformProgress > 0.72 ? 0.76 : 1;
      state.fireTimer = weapon.rate * fighter.fireRate * state.fireRateMultiplier * assaultRate * rushRate
        * (state.overdrive > 0 ? 0.58 : 1);
    }

    const bossAlive = state.enemies.some((enemy) => enemy.type === "boss");
    state.spawnTimer -= dt;
    if (!bossAlive && state.spawnTimer <= 0) {
      spawnEnemy();
      const difficulty = Math.min(0.44, state.elapsed / 190);
      const rushDensity = state.combo >= 8 ? 0.82 : 1;
      state.spawnTimer = Math.max(0.18, (0.52 - difficulty + Math.random() * 0.22) * rushDensity);
    }

    state.formationTimer -= dt;
    if (!bossAlive && state.formationTimer <= 0) {
      spawnFormation();
      state.formationTimer = Math.max(8, 13 - state.wave * 0.22) + Math.random() * 4;
    }

    const nextWave = Math.floor(state.elapsed / 15) + 1;
    if (nextWave !== state.wave) {
      state.wave = nextWave;
      showWave(`WAVE ${String(state.wave).padStart(2, "0")}`);
      if (state.wave % 4 === 0 && state.bossWave !== state.wave) {
        state.bossWave = state.wave;
        spawnBoss();
      }
    }

    for (const star of state.stars) {
      star.y += star.speed * dt * (state.overdrive > 0 ? 1.75 : 1);
      if (star.y > state.height + 4) {
        star.y = -4;
        star.x = Math.random() * state.width;
      }
    }

    updatePlayerBullets(dt);
    updateEnemies(dt);
    updateEnemyBullets(dt);
    resolveBulletHits();
    updatePickups(dt);
    updateParticles(dt);
    updateFloatingTexts(dt);
    updateAbilityHud();
  }

  function updateWeaponHud() {
    const weapon = WEAPONS[state.weaponLevel - 1];
    const overdriveActive = state.overdrive > 0;
    const form = state.transformStage === 2 ? "APEX" : state.transformStage === 1 ? "TACTICAL" : "BASE";
    weaponValue.textContent = overdriveActive
      ? `OVERDRIVE ${state.overdrive.toFixed(1)}s`
      : `LV.${weapon.level} ${weapon.name} / ${form}`;
    weaponHud.classList.toggle("is-overdrive", overdriveActive);

    if (overdriveActive) {
      weaponProgress.style.width = `${(state.overdrive / 6) * 100}%`;
      weaponProgressLabel.textContent = "MAXIMUM OUTPUT";
    } else if (state.weaponLevel === WEAPONS.length) {
      weaponProgress.style.width = "100%";
      weaponProgressLabel.textContent = "CORE → OVERDRIVE";
    } else {
      const progress = (state.weaponEnergy / weapon.threshold) * 100;
      weaponProgress.style.width = `${progress}%`;
      weaponProgressLabel.textContent = `${state.weaponEnergy} / ${weapon.threshold} CORE`;
    }
  }

  function updateAbilityHud() {
    const assault = state.transformProgress > 0.72;
    const transforming = Math.abs(state.transformProgress - state.transformTarget) > 0.02;
    const tactical = tacticalSpec(state.fighterId);
    formValue.textContent = transforming
      ? state.transformTarget > 0.5 ? "机械重组中" : "飞行复原中"
      : assault ? "强袭机甲" : "飞行形态";
    formEnergy.style.width = `${Math.max(0, state.transformEnergy)}%`;
    formEnergyLabel.textContent = `${Math.round(state.transformEnergy)}%`;
    tacticalValue.textContent = tactical.name;
    tacticalCooldown.textContent = state.tacticalCooldown > 0 ? `${state.tacticalCooldown.toFixed(1)}s` : "READY";
    tacticalAbility.classList.toggle("is-cooling", state.tacticalCooldown > 0);
    transformButton.disabled = state.transformTarget < 0.5 && !canEnterAssault(state.transformEnergy);
    tacticalButton.disabled = state.tacticalCooldown > 0;
  }

  function updateHud() {
    const fighter = getFighter();
    scoreValue.textContent = String(state.score).padStart(6, "0");
    comboValue.textContent = state.combo >= 8 ? `RUSH ×${state.combo}` : `×${state.combo}`;
    [...livesValue.children].forEach((life, index) => {
      life.classList.toggle("is-empty", index >= state.lives);
    });
    livesValue.setAttribute("aria-label", `剩余 ${state.lives} / ${state.maxLives} 格护盾`);
    fighterCallSign.textContent = `${fighter.country} / ${fighter.shortName}`;
    updateWeaponHud();
    updateAbilityHud();
  }

  function showWave(text) {
    waveMessage.textContent = text;
    waveMessage.classList.remove("is-visible");
    void waveMessage.offsetWidth;
    waveMessage.classList.add("is-visible");
  }

  function showUpgrade(text, eyebrow) {
    upgradeMessage.querySelector("span").textContent = eyebrow;
    upgradeMessage.querySelector("strong").textContent = text;
    upgradeMessage.classList.remove("is-visible");
    void upgradeMessage.offsetWidth;
    upgradeMessage.classList.add("is-visible");
  }

  function drawBackground() {
    context.fillStyle = COLORS.canvas;
    context.fillRect(0, 0, state.width, state.height);

    context.strokeStyle = COLORS.grid;
    context.lineWidth = 1;
    const grid = 64;
    const offset = (state.elapsed * (state.overdrive > 0 ? 60 : 25)) % grid;

    for (let x = 0; x <= state.width; x += grid) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, state.height);
      context.stroke();
    }

    for (let y = -grid + offset; y <= state.height; y += grid) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(state.width, y);
      context.stroke();
    }

    for (const star of state.stars) {
      context.globalAlpha = star.alpha;
      context.fillStyle = state.overdrive > 0 ? COLORS.overdrive : getFighter().secondary;
      context.fillRect(star.x, star.y, star.size, star.size * (state.overdrive > 0 ? 5 : 2.6));
    }
    context.globalAlpha = 1;
  }

  function drawPlayer() {
    const player = state.player;
    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 14) % 2 === 0) return;

    if (visuals?.available) {
      drawReticle(state.pointer.x, state.pointer.y);
      return;
    }

    const fighter = getFighter();
    const stage = state.transformStage;
    const shipScale = 0.86 + stage * 0.04;

    context.save();
    context.translate(player.x, player.y);

    context.globalAlpha = state.overdrive > 0 ? 0.18 : 0.12;
    context.fillStyle = state.overdrive > 0 ? COLORS.overdrive : fighter.accent;
    context.beginPath();
    context.arc(0, 0, state.overdrive > 0 ? 48 : 36 + stage * 6, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;

    if (state.transformPulse > 0) {
      context.globalAlpha = Math.min(0.75, state.transformPulse * 0.65);
      context.strokeStyle = fighter.accent;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, 0, 42 + (1.35 - state.transformPulse) * 42, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
    }

    if (fighter.id === "j20" && stage >= 1) {
      const droneOffset = stage === 2 ? 39 : 34;
      context.fillStyle = fighter.accent;
      [-droneOffset, droneOffset].forEach((offset) => {
        context.save();
        context.translate(offset, 8);
        context.rotate(Math.PI / 4);
        context.fillRect(-5, -5, 10, 10);
        context.restore();
      });
    }

    context.fillStyle = state.overdrive > 0 ? COLORS.overdrive : fighter.accent;
    const engineCount = fighter.shape.twinTail ? 2 : 1;
    for (let i = 0; i < engineCount; i += 1) {
      const offset = engineCount === 2 ? (i === 0 ? -7 : 7) : 0;
      context.fillRect(offset - 2, 21, 4, 13 + Math.random() * (state.overdrive > 0 ? 18 : 9));
    }

    drawFighterSilhouette(context, fighter, stage, shipScale);
    context.restore();

    drawReticle(state.pointer.x, state.pointer.y);
  }

  function drawReticle(x, y) {
    const fighter = getFighter();
    context.save();
    context.translate(x, y);
    context.strokeStyle = state.overdrive > 0 ? COLORS.overdrive : fighter.accent;
    context.globalAlpha = state.overdrive > 0 ? 0.72 : 0.55;
    context.lineWidth = 1;
    context.beginPath();
    context.arc(0, 0, 23, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(-31, 0);
    context.lineTo(-17, 0);
    context.moveTo(31, 0);
    context.lineTo(17, 0);
    context.moveTo(0, -31);
    context.lineTo(0, -17);
    context.moveTo(0, 31);
    context.lineTo(0, 17);
    context.stroke();
    context.globalAlpha = 1;
    context.restore();
  }

  function drawPlayerBullets() {
    for (const bullet of state.bullets) {
      context.save();
      context.translate(bullet.x, bullet.y);
      context.fillStyle = bullet.color;

      if (bullet.type === "seeker") {
        context.rotate(Math.atan2(bullet.vy, bullet.vx) + Math.PI / 2);
        context.beginPath();
        context.moveTo(0, -9);
        context.lineTo(6, 6);
        context.lineTo(0, 3);
        context.lineTo(-6, 6);
        context.closePath();
        context.fill();
      } else if (bullet.type === "wave") {
        context.beginPath();
        context.arc(0, 0, 5, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 0.25;
        context.fillRect(-2, 2, 4, 18);
      } else if (bullet.type === "heavy") {
        context.beginPath();
        context.arc(0, 0, bullet.radius, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = getFighter().secondary;
        context.beginPath();
        context.arc(0, 0, bullet.radius * 0.38, 0, Math.PI * 2);
        context.fill();
      } else if (bullet.type === "rail") {
        context.fillRect(-2, -15, 4, 30);
        context.globalAlpha = 0.22;
        context.fillRect(-6, 2, 12, 28);
      } else if (bullet.type === "drone") {
        context.rotate(Math.PI / 4);
        context.fillRect(-4, -4, 8, 8);
        context.globalAlpha = 0.25;
        context.fillRect(-2, 4, 4, 16);
      } else {
        context.fillRect(-2, -8, 4, 16);
        context.globalAlpha = 0.28;
        context.fillRect(-4, 3, 8, 17);
      }
      context.restore();
    }
  }

  function drawEnemy(enemy) {
    context.save();
    context.translate(enemy.x, enemy.y);

    if (enemy.type === "boss") {
      if (visuals?.available) {
        context.restore();
        return;
      }
      const phase = enemy.bossPhase || 1;
      const wing = 72 + (phase - 1) * 15;
      context.globalAlpha = 0.12 + phase * 0.04;
      context.fillStyle = phase === 3 ? COLORS.boss : COLORS.elite;
      context.beginPath();
      context.arc(0, 0, enemy.radius + 12 + phase * 7, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
      context.fillStyle = phase === 1 ? COLORS.boss : phase === 2 ? COLORS.elite : "#ff365f";
      context.beginPath();
      context.moveTo(0, 58);
      context.lineTo(wing, 12 - phase * 3);
      context.lineTo(wing * 0.72, -45 - phase * 4);
      context.lineTo(18, -30);
      context.lineTo(0, -59 - phase * 4);
      context.lineTo(-18, -30);
      context.lineTo(-wing * 0.72, -45 - phase * 4);
      context.lineTo(-wing, 12 - phase * 3);
      context.closePath();
      context.fill();

      if (phase >= 2) {
        context.fillStyle = COLORS.enemyCore;
        context.fillRect(-wing - 8, -8, 18, 22);
        context.fillRect(wing - 10, -8, 18, 22);
      }

      context.fillStyle = COLORS.enemyCore;
      if (phase === 3) {
        context.beginPath();
        context.arc(0, -4, 21, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = COLORS.boss;
        context.beginPath();
        context.arc(0, -4, 9, 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillRect(-11 - phase * 2, -20, 22 + phase * 4, 37);
      }
      context.fillStyle = phase === 1 ? COLORS.elite : COLORS.boss;
      context.fillRect(-wing * 0.62, 2, 18, 8);
      context.fillRect(wing * 0.62 - 18, 2, 18, 8);
      context.restore();
      return;
    }

    context.rotate(enemy.rotation);
    if (enemy.type === "scout") {
      context.fillStyle = COLORS.enemy;
      context.beginPath();
      context.moveTo(0, enemy.radius + 5);
      context.lineTo(enemy.radius, -enemy.radius);
      context.lineTo(3, -enemy.radius * 0.45);
      context.lineTo(0, -enemy.radius - 5);
      context.lineTo(-3, -enemy.radius * 0.45);
      context.lineTo(-enemy.radius, -enemy.radius);
      context.closePath();
      context.fill();
    } else if (enemy.type === "gunner") {
      context.fillStyle = "#ff805c";
      context.beginPath();
      context.moveTo(0, enemy.radius);
      context.lineTo(enemy.radius + 8, 7);
      context.lineTo(enemy.radius, -13);
      context.lineTo(8, -8);
      context.lineTo(0, -enemy.radius);
      context.lineTo(-8, -8);
      context.lineTo(-enemy.radius, -13);
      context.lineTo(-enemy.radius - 8, 7);
      context.closePath();
      context.fill();
      context.fillStyle = COLORS.canvas;
      context.fillRect(-enemy.radius - 2, -8, 7, 18);
      context.fillRect(enemy.radius - 5, -8, 7, 18);
    } else if (enemy.type === "spinner") {
      context.strokeStyle = COLORS.elite;
      context.lineWidth = 7;
      for (let arm = 0; arm < 4; arm += 1) {
        context.rotate(Math.PI / 2);
        context.beginPath();
        context.moveTo(5, 0);
        context.lineTo(enemy.radius + 7, 0);
        context.stroke();
      }
      context.fillStyle = COLORS.enemyCore;
      context.beginPath();
      context.arc(0, 0, 9, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = COLORS.boss;
      context.beginPath();
      context.arc(0, 0, 4, 0, Math.PI * 2);
      context.fill();
    } else {
      context.fillStyle = COLORS.elite;
      context.beginPath();
      context.moveTo(0, enemy.radius + 5);
      context.lineTo(enemy.radius + 12, 8);
      context.lineTo(enemy.radius * 0.72, -enemy.radius);
      context.lineTo(11, -18);
      context.lineTo(0, -enemy.radius - 7);
      context.lineTo(-11, -18);
      context.lineTo(-enemy.radius * 0.72, -enemy.radius);
      context.lineTo(-enemy.radius - 12, 8);
      context.closePath();
      context.fill();
      context.fillStyle = COLORS.enemyCore;
      context.fillRect(-8, -12, 16, 25);
    }
    context.restore();
  }

  function drawEnemyBullets() {
    for (const bullet of state.enemyBullets) {
      context.save();
      context.translate(bullet.x, bullet.y);
      context.rotate(Math.atan2(bullet.vy, bullet.vx));
      context.fillStyle = bullet.color;
      context.beginPath();
      context.arc(0, 0, bullet.radius, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 0.24;
      context.fillRect(-18, -2, 18, 4);
      context.restore();
    }
  }

  function drawPickups() {
    for (const pickup of state.pickups) {
      const pulse = 1 + Math.sin(pickup.age * 6) * 0.12;
      context.save();
      context.translate(pickup.x, pickup.y);
      context.scale(pulse, pulse);
      context.strokeStyle = pickup.type === "repair" ? COLORS.repair : COLORS.player;
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(0, 0, pickup.radius + 6, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = pickup.type === "repair" ? COLORS.repair : COLORS.player;

      if (pickup.type === "repair") {
        context.fillRect(-3, -9, 6, 18);
        context.fillRect(-9, -3, 18, 6);
      } else {
        context.rotate(Math.PI / 4);
        context.fillRect(-7, -7, 14, 14);
        context.fillStyle = COLORS.canvas;
        context.fillRect(-3, -3, 6, 6);
      }
      context.restore();
    }
  }

  function drawParticles() {
    for (const particle of state.particles) {
      context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      context.fillStyle = particle.color;
      context.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    context.globalAlpha = 1;
  }

  function drawFloatingTexts() {
    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "900 16px Arial Narrow, sans-serif";
    for (const item of state.floatingTexts) {
      context.globalAlpha = Math.max(0, item.life / item.maxLife);
      context.fillStyle = item.color;
      context.fillText(item.text, item.x, item.y);
    }
    context.restore();
  }

  function draw() {
    context.save();
    if (state.shake > 0) {
      context.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    drawBackground();
    drawPlayerBullets();
    state.enemies.forEach(drawEnemy);
    drawEnemyBullets();
    drawPickups();
    drawParticles();
    drawPlayer();
    context.restore();
    visuals?.renderBattle(state, getFighter());
    drawFloatingTexts();

    if (state.impactFlash > 0) {
      context.globalAlpha = Math.min(0.16, state.impactFlash);
      context.fillStyle = getFighter().accent;
      context.fillRect(0, 0, state.width, state.height);
      context.globalAlpha = 1;
    }
  }

  function gameLoop(time) {
    if (!state.running) return;
    const dt = Math.min(0.034, Math.max(0, (time - state.previousTime) / 1000));
    state.previousTime = time;
    update(dt);
    draw();

    if (state.running) state.animationFrame = requestAnimationFrame(gameLoop);
  }

  function installQaControls() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("qa")) return;

    window.__mouseStrikeQa = {
      snapshot: () => ({
        running: state.running,
        wave: state.wave,
        weaponLevel: state.weaponLevel,
        weaponEnergy: state.weaponEnergy,
        fighterId: state.fighterId,
        transformStage: state.transformStage,
        transformProgress: state.transformProgress,
        transformTarget: state.transformTarget,
        transformEnergy: state.transformEnergy,
        tacticalCooldown: state.tacticalCooldown,
        modules: [...state.modules],
        bossKills: state.bossKills,
        visual3d: Boolean(visuals?.available),
        maxLives: state.maxLives,
        overdrive: state.overdrive,
        bullets: state.bullets.length,
        bulletTypes: state.bullets.reduce((counts, bullet) => {
          counts[bullet.type] = (counts[bullet.type] || 0) + 1;
          return counts;
        }, {}),
        enemyBullets: state.enemyBullets.length,
        enemies: state.enemies.map((enemy) => enemy.type),
        bossPhases: state.enemies.filter((enemy) => enemy.type === "boss").map((enemy) => enemy.bossPhase),
      }),
      addCore: () => collectPowerCore(),
      selectFighter: (fighterId) => selectFighter(fighterId),
      spawnBoss: () => {
        if (!state.enemies.some((enemy) => enemy.type === "boss")) spawnBoss();
      },
      spawnEnemyType: (type) => {
        if (["scout", "gunner", "spinner", "elite"].includes(type)) {
          const enemy = makeEnemy(type, state.width / 2);
          enemy.y = Math.min(180, state.height * 0.24);
          state.enemies.push(enemy);
        }
      },
      setBossHealth: (ratio) => {
        const boss = state.enemies.find((enemy) => enemy.type === "boss");
        if (boss) {
          boss.y = boss.targetY;
          boss.hp = Math.max(1, boss.maxHp * ratio);
        }
      },
      setCombo: (value) => {
        state.combo = Math.max(1, Math.min(12, Number(value) || 1));
        state.comboTimer = 3;
        updateHud();
      },
      setOverdrive: (seconds) => {
        state.overdrive = Math.max(0, Number(seconds) || 0);
        updateWeaponHud();
      },
      toggleTransform: () => toggleTransform(),
      fireTactical: () => fireTactical(),
      chooseModule: (moduleId) => applyModule(moduleId),
      setTransformEnergy: (value) => {
        state.transformEnergy = Math.max(0, Math.min(100, Number(value) || 0));
        updateAbilityHud();
      },
      destroyBoss: () => {
        const index = state.enemies.findIndex((enemy) => enemy.type === "boss");
        if (index >= 0) killEnemy(index);
      },
    };
  }

  startButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", restartGame);
  menuButton.addEventListener("click", exitGame);
  soundToggle.addEventListener("click", async () => {
    await audio?.unlock();
    const muted = audio?.toggleMuted();
    syncAudioControls();
    if (muted === false) audio?.fighterSelect(state.fighterId);
  });
  volumeSlider.addEventListener("input", async (event) => {
    await audio?.unlock();
    audio?.setVolume(Number(event.target.value) / 100);
    syncAudioControls();
  });
  window.addEventListener("resize", () => {
    if (!gameScreen.hidden) resizeCanvas();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "q" && !gameScreen.hidden) {
      event.preventDefault();
      exitGame();
    } else if (event.code === "Space" && !gameScreen.hidden) {
      event.preventDefault();
      toggleTransform();
    } else if (event.key.toLowerCase() === "e" && !gameScreen.hidden) {
      event.preventDefault();
      fireTactical();
    }
  });
  canvas.addEventListener("pointermove", (event) => setPointer(event.clientX, event.clientY));
  canvas.addEventListener("pointerdown", (event) => {
    setPointer(event.clientX, event.clientY);
    if (event.pointerType === "mouse" && event.button === 0) toggleTransform();
    if (event.pointerType === "mouse" && event.button === 2) fireTactical();
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  transformButton.addEventListener("click", toggleTransform);
  tacticalButton.addEventListener("click", fireTactical);
  moduleButtons.forEach((button) => button.addEventListener("click", () => applyModule(button.dataset.module)));

  const forceCanvas = new URLSearchParams(window.location.search).get("renderer") === "canvas";
  visuals = forceCanvas
    ? { available: false, setFighter() {}, resizeBattle() {}, renderBattle() {}, dispose() {} }
    : createVisualSystem({
      hangarCanvas: fighterPreview,
      battleCanvas: battleThreeCanvas,
      fighter: getFighter(),
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
  initializeHangar();
  syncAudioControls();
  installQaControls();
})();
