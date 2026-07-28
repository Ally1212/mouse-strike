import { createVisualSystem } from "./fighter-rig.js";
import {
  BookOpen,
  Bot,
  ChevronDown,
  createIcons,
  Crosshair,
  KeyRound,
  Lock,
  LogOut,
  Map,
  MousePointer2,
  Plane,
  Play,
  RefreshCw,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide";
import "./audio.js";
import {
  BATTLE_MAPS,
  circleIntersectsStructure,
  createMapStructures,
  getBattleMap,
  pointInsideHazard,
  pointInsideStructure,
  resolveCircleFromStructure,
} from "./battle-maps.js";
import {
  FIGHTERS,
  getFighterProfile,
} from "./fighter-profiles.js";
import {
  AIRDROP_ESCORT_DURATION,
  airdropRewardSpec,
  assaultFireSpec,
  canEnterCoreTransform,
  combatPhase,
  formationPattern,
  laserModeSpec,
  nextTransformProgress,
  PARTICLE_LIMIT,
  projectileBudget,
  tacticalSpec,
  toolModeSpec,
  TRANSFORM_CORE_COST,
  TRANSFORM_DURATION,
  transformSecondsRemaining,
  wingmanSpec,
} from "./gameplay-rules.js";
import {
  coasterMotion,
  connectedChain,
  isInsideCarrierDeck,
  MINI_MISSIONS,
  nextMiniMission,
  ringContainsPlayer,
} from "./mini-missions.js";

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
  const rulesButton = document.querySelector("#rules-button");
  const rulesDialog = document.querySelector("#rules-dialog");
  const rulesClose = document.querySelector("#rules-close");
  const unlockDialog = document.querySelector("#unlock-dialog");
  const unlockForm = document.querySelector("#unlock-form");
  const unlockClose = document.querySelector("#unlock-close");
  const unlockPassword = document.querySelector("#unlock-password");
  const unlockError = document.querySelector("#unlock-error");
  const mapSelect = document.querySelector("#map-select");
  const mapSelectShell = mapSelect.closest(".map-select");
  const mapSelectTrigger = document.querySelector("#map-select-trigger");
  const mapSelectValue = document.querySelector("#map-select-value");
  const mapSelectMenu = document.querySelector("#map-select-menu");
  const mapSelectOptions = [...document.querySelectorAll("[data-map-option]")];
  const mapFeature = document.querySelector("#map-feature");
  const audio = window.gameAudio;
  const fighterPreview = document.querySelector("#fighter-preview");
  const fighterReferenceImage = document.querySelector("#fighter-reference-image");
  const referenceCredit = document.querySelector("#reference-credit");
  const fighterOptions = [...document.querySelectorAll(".fighter-option")];
  const selectedCountry = document.querySelector("#selected-country");
  const selectedCallsign = document.querySelector("#selected-callsign");
  const selectedRole = document.querySelector("#selected-role");
  const selectedName = document.querySelector("#selected-name");
  const selectedTransformName = document.querySelector("#selected-transform-name");
  const selectedTransformDuration = document.querySelector("#selected-transform-duration");
  const selectedTransformSummary = document.querySelector("#selected-transform-summary");
  const selectedTacticalName = document.querySelector("#selected-tactical-name");
  const selectedSpecial = document.querySelector("#selected-special");
  const selectedPassiveName = document.querySelector("#selected-passive-name");
  const selectedPassive = document.querySelector("#selected-passive");
  const selectedStrength = document.querySelector("#selected-strength");
  const selectedTradeoff = document.querySelector("#selected-tradeoff");
  const agilityStat = document.querySelector("#agility-stat");
  const firepowerStat = document.querySelector("#firepower-stat");
  const armorStat = document.querySelector("#armor-stat");
  const transformStat = document.querySelector("#transform-stat");
  const tacticalStat = document.querySelector("#tactical-stat");
  const agilityValue = document.querySelector("#agility-value");
  const firepowerValue = document.querySelector("#firepower-value");
  const armorValue = document.querySelector("#armor-value");
  const transformValue = document.querySelector("#transform-value");
  const tacticalValueStat = document.querySelector("#tactical-value-stat");
  const previewStatus = document.querySelector("#preview-status");
  const previewButtons = [...document.querySelectorAll("[data-preview]")];
  const startButtonLabel = document.querySelector("#start-button-label");
  const assetBasePath = import.meta.env.BASE_URL || "/";
  const gameOverPanel = document.querySelector("#game-over");
  const scoreValue = document.querySelector("#score-value");
  const comboValue = document.querySelector("#combo-value");
  const healthValue = document.querySelector("#health-value");
  const healthProgress = document.querySelector("#health-progress");
  const shieldValue = document.querySelector("#shield-value");
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
  const transformReady = document.querySelector("#transform-ready");
  const upgradeMessage = document.querySelector("#upgrade-message");
  const missionBriefing = document.querySelector("#mission-briefing");
  const missionEventTag = document.querySelector("#mission-event-tag");
  const missionEventTitle = document.querySelector("#mission-event-title");
  const missionEventRule = document.querySelector("#mission-event-rule");
  const missionEventObjective = document.querySelector("#mission-event-objective");
  const missionEventReward = document.querySelector("#mission-event-reward");
  const missionEnter = document.querySelector("#mission-enter");
  const missionSkip = document.querySelector("#mission-skip");
  const missionProgress = document.querySelector("#mission-progress");
  const missionProgressTag = document.querySelector("#mission-progress-tag");
  const missionProgressTitle = document.querySelector("#mission-progress-title");
  const missionProgressRule = document.querySelector("#mission-progress-rule");
  const missionProgressBar = document.querySelector("#mission-progress-bar");
  const missionProgressValue = document.querySelector("#mission-progress-value");
  const airdropChoice = document.querySelector("#airdrop-choice");
  const airdropChoiceTag = document.querySelector("#airdrop-choice-tag");
  const airdropChoiceTitle = document.querySelector("#airdrop-choice-title");
  const airdropChoiceRule = document.querySelector("#airdrop-choice-rule");
  const airdropDefense = document.querySelector("#airdrop-defense");
  const airdropDefenseTitle = document.querySelector("#airdrop-defense-title");
  const airdropDefenseDetail = document.querySelector("#airdrop-defense-detail");
  const airdropFirepower = document.querySelector("#airdrop-firepower");
  const airdropFirepowerTitle = document.querySelector("#airdrop-firepower-title");
  const airdropFirepowerDetail = document.querySelector("#airdrop-firepower-detail");
  const airdropEscort = document.querySelector("#airdrop-escort");
  const airdropProgress = document.querySelector("#airdrop-progress");
  const airdropProgressStatus = document.querySelector("#airdrop-progress-status");
  const airdropProgressBar = document.querySelector("#airdrop-progress-bar");
  const airdropProgressValue = document.querySelector("#airdrop-progress-value");
  const airdropIntegrityBar = document.querySelector("#airdrop-integrity-bar");
  const airdropIntegrityValue = document.querySelector("#airdrop-integrity-value");
  const formValue = document.querySelector("#form-value");
  const formEnergy = document.querySelector("#form-energy");
  const formEnergyLabel = document.querySelector("#form-energy-label");
  const skillValue = document.querySelector("#skill-value");
  const skillCooldown = document.querySelector("#skill-cooldown");
  const wingmanValue = document.querySelector("#wingman-value");
  const wingmanCooldown = document.querySelector("#wingman-cooldown");
  const passiveStatus = document.querySelector("#passive-status");
  const skillAbility = document.querySelector(".ability--skill");
  const wingmanAbility = document.querySelector(".ability--wingman");
  const skillButton = document.querySelector("#skill-button");
  const transformButton = document.querySelector("#transform-button");
  const wingmanButton = document.querySelector("#wingman-button");
  let visuals = null;
  let pendingHypersonicLaunch = false;
  const pageParams = new URLSearchParams(window.location.search);
  const autoMiniMissions = !pageParams.has("qa") || pageParams.get("missions") === "auto";

  const HYPERSONIC_CONCEPT_CODE = "0000";

  function assetUrl(path) {
    if (/^(?:https?:|data:|blob:)/.test(path)) return path;
    return `${assetBasePath.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  }

  const COLORS = {
    canvas: "#f8f1df",
    grid: "rgba(21, 18, 15, 0.075)",
    player: "#b72f24",
    playerCore: "#15120f",
    pulse: "#762019",
    wave: "#55744e",
    seeker: "#b72f24",
    overdrive: "#d76b2c",
    enemy: "#762019",
    enemyCore: "#fffaf0",
    enemyBullet: "#b72f24",
    elite: "#c47b22",
    sniper: "#2f6275",
    bomber: "#934d70",
    mine: "#6c5388",
    splitter: "#a9821f",
    fighter: "#276f96",
    helicopter: "#477b4f",
    boss: "#951f1a",
    repair: "#55744e",
    evolution: "#8b5cf6",
    trajectory: "#168aad",
    shield: "#2f8f6b",
    barrier: "#e6a91a",
    ally: "#16a6a1",
  };

  const BARRIER_DURATION = 8;
  const ALLY_MAX_COUNT = 4;
  const ALLY_MAX_HEALTH = 48;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const WEAPONS = [
    { level: 1, name: "基础火控", threshold: 2, rate: 0.155 },
    { level: 2, name: "双联增幅", threshold: 3, rate: 0.145 },
    { level: 3, name: "战术火控", threshold: 4, rate: 0.16 },
    { level: 4, name: "协同增幅", threshold: 5, rate: 0.15 },
    { level: 5, name: "终极矩阵", threshold: 0, rate: 0.13 },
  ];

  const ENEMY_CONFIGS = {
    scout: { radius: 13, hp: (wave) => 1 + Math.floor(wave / 7), speed: 156, drift: 86, score: 110, fire: "none" },
    gunner: { radius: 22, hp: (wave) => 5 + wave, speed: 82, drift: 44, score: 280, fire: "aim" },
    spinner: { radius: 19, hp: (wave) => 4 + wave, speed: 96, drift: 34, score: 360, fire: "fan" },
    sniper: { radius: 17, hp: (wave) => 3 + Math.ceil(wave * 0.85), speed: 104, drift: 64, score: 330, fire: "snipe" },
    bomber: { radius: 24, hp: (wave) => 7 + Math.ceil(wave * 1.25), speed: 64, drift: 26, score: 430, fire: "burst" },
    mineLayer: { radius: 21, hp: (wave) => 6 + wave, speed: 72, drift: 52, score: 390, fire: "mine" },
    splitter: { radius: 26, hp: (wave) => 9 + Math.ceil(wave * 1.45), speed: 70, drift: 58, score: 560, fire: "split" },
    fighter: { radius: 18, hp: (wave) => 4 + Math.ceil(wave * 0.8), speed: 142, drift: 118, score: 410, fire: "strafe" },
    helicopter: { radius: 25, hp: (wave) => 8 + Math.ceil(wave * 1.15), speed: 58, drift: 28, score: 520, fire: "rocket" },
    elite: { radius: 31, hp: (wave) => 14 + wave * 2.2, speed: 62, drift: 30, score: 780, fire: "elite" },
    carrier: { radius: 38, hp: (wave) => 55 + wave * 6, speed: 0, drift: 0, score: 1500, fire: "none" },
  };

  const ENEMY_POOL = ["scout", "gunner", "spinner", "sniper", "bomber", "mineLayer", "splitter", "fighter", "helicopter", "elite"];

  function loadSelectedFighterId() {
    try {
      const saved = window.localStorage.getItem("mouse-strike-fighter");
      return FIGHTERS[saved] ? saved : "j20";
    } catch {
      return "j20";
    }
  }

  function loadSelectedMapId() {
    try {
      const saved = window.localStorage.getItem("mouse-strike-map");
      return BATTLE_MAPS[saved] ? saved : "usa";
    } catch {
      return "usa";
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
    health: 130,
    combo: 1,
    comboTimer: 0,
    wave: 1,
    kills: 0,
    spawnCount: 0,
    bossWave: 0,
    fighterId: loadSelectedFighterId(),
    maxHealth: 130,
    shieldCharges: 0,
    barrierTimer: 0,
    barrierHits: 0,
    allies: [],
    nextAllyId: 1,
    transformStage: 0,
    transformPulse: 0,
    transformProgress: 0,
    transformTarget: 0,
    transformEnergy: 0,
    transformCores: 0,
    coreDropCooldown: 3.5,
    transformElapsed: 0,
    assaultFormIndex: 0,
    toolModeIndex: 0,
    tacticalCooldown: 0,
    wingmanTimer: 0,
    wingmanCooldown: 0,
    wingmanFireTimer: 0,
    wingmanUses: 0,
    wingmanPositions: [],
    formationTimer: 18,
    formationIndex: 0,
    mapId: loadSelectedMapId(),
    hazardTimer: 9,
    mapStructures: [],
    structureCollisionCooldown: 0,
    mapEventTimer: 12,
    meteorTimer: 16,
    meteorWarnings: [],
    meteors: [],
    meteorImpacts: 0,
    airdropTimer: 22,
    activeAirdropId: null,
    airdropDecision: null,
    airdropEscortsCompleted: 0,
    airdropEscortsFailed: 0,
    supplyCrates: [],
    laserBeams: [],
    laserHeat: 0,
    laserWarmup: 0,
    laserCooldown: 0,
    pendingLaser: null,
    screenLaser: null,
    screenLaserCooldown: 0,
    nuclearStrike: null,
    nuclearDetonations: 0,
    firepowerTimer: 0,
    meteorPierceTimer: 0,
    damageMultiplier: 1,
    fireRateMultiplier: 1,
    tacticalCooldownMultiplier: 1,
    transformGuardBonus: 0,
    passivePower: 0,
    pierceBonus: 0,
    waveRangeMultiplier: 1,
    tacticalProjectileBonus: 0,
    droneBonus: 0,
    assaultDamageMultiplier: 1,
    grazeCount: 0,
    overclockStacks: 0,
    revengeCharge: 0,
    resonanceBursts: 0,
    railChain: 0,
    railChainTimer: 0,
    overclockTimer: 0,
    heavyRangeMultiplier: 1,
    nextEnemyId: 1,
    bossKills: 0,
    skillUses: 0,
    formChanges: 0,
    impactFlash: 0,
    screenEffect: null,
    hitStop: 0,
    speedLines: 0,
    missionPendingId: null,
    miniMission: null,
    completedMiniMissions: [],
    skippedMiniMissions: [],
    miniMissionResults: [],
    weaponLevel: 1,
    weaponEnergy: 0,
    trajectoryLevel: 0,
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
    hazards: [],
  };

  function getFighter() {
    return getFighterProfile(state.fighterId);
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
    if (!thumb) return;
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

  function updateHypersonicLockState() {
    const option = fighterOptions.find((item) => item.dataset.fighter === "hypersonic");
    if (!option) return;
    option.classList.remove("is-unlocked");
    option.setAttribute("aria-label", "超音速 X-10，可自由预览，每次驾驶出击均需输入概念暗号");
    const lockText = option.querySelector(".fighter-lock span");
    if (lockText) lockText.textContent = "概念暗号";
  }

  function openUnlockDialog() {
    unlockError.hidden = true;
    unlockPassword.value = "";
    unlockDialog.showModal();
    requestAnimationFrame(() => unlockPassword.focus());
  }

  function setMapMenuOpen(open, focusSelected = false) {
    const expanded = Boolean(open);
    mapSelectMenu.hidden = !expanded;
    mapSelectTrigger.setAttribute("aria-expanded", String(expanded));
    if (expanded && focusSelected) {
      const selected = mapSelectOptions.find((option) => option.dataset.mapOption === state.mapId);
      requestAnimationFrame(() => selected?.focus());
    }
  }

  function syncMapPicker(map) {
    mapSelectValue.textContent = map.name;
    mapSelectOptions.forEach((option) => {
      const selected = option.dataset.mapOption === map.id;
      option.setAttribute("aria-selected", String(selected));
    });
  }

  function selectMap(mapId, persist = true) {
    const map = getBattleMap(mapId);
    state.mapId = map.id;
    mapSelect.value = map.id;
    mapSelect.title = map.description;
    mapSelectShell.dataset.map = map.id;
    syncMapPicker(map);
    if (mapFeature) mapFeature.textContent = map.feature;
    if (persist) {
      try {
        window.localStorage.setItem("mouse-strike-map", map.id);
      } catch {
        // Map selection still applies for the current session.
      }
    }
  }

  function selectFighter(fighterId, persist = true) {
    if (!FIGHTERS[fighterId]) return;
    state.fighterId = fighterId;
    const fighter = getFighter();
    document.documentElement.style.setProperty("--fighter-accent", fighter.accent);
    document.documentElement.style.setProperty("--fighter-secondary", fighter.secondary);
    document.documentElement.style.setProperty("--hangar-ambient", fighter.ambient);
    selectedCountry.textContent = fighter.country;
    selectedCallsign.textContent = fighter.callsign;
    selectedRole.textContent = fighter.role;
    selectedName.textContent = fighter.displayName || fighter.name;
    selectedTransformName.textContent = fighter.transformation.label;
    selectedTransformDuration.textContent = `${TRANSFORM_CORE_COST} 核心启动 / ${TRANSFORM_DURATION} 秒${fighter.id === "hypersonic" ? " · 四阶段" : ""}`;
    selectedTransformSummary.textContent = fighter.transformation.summary;
    selectedTacticalName.textContent = fighter.tactical.name;
    selectedSpecial.textContent = fighter.special;
    selectedPassiveName.textContent = fighter.passiveName;
    selectedPassive.textContent = fighter.passive;
    selectedStrength.textContent = fighter.strength;
    selectedTradeoff.textContent = fighter.tradeoff;
    fighterReferenceImage.src = assetUrl(fighter.reference.src);
    fighterReferenceImage.alt = fighter.reference.alt;
    if (fighter.reference.url) {
      referenceCredit.href = fighter.reference.url;
      referenceCredit.target = "_blank";
    } else {
      referenceCredit.removeAttribute("href");
      referenceCredit.removeAttribute("target");
    }
    referenceCredit.textContent = fighter.reference.credit;
    agilityStat.style.width = `${fighter.stats.mobility}%`;
    firepowerStat.style.width = `${fighter.stats.firepower}%`;
    armorStat.style.width = `${fighter.stats.armor}%`;
    transformStat.style.width = `${fighter.stats.transform}%`;
    tacticalStat.style.width = `${fighter.stats.tactical}%`;
    agilityValue.textContent = fighter.stats.mobility;
    firepowerValue.textContent = fighter.stats.firepower;
    armorValue.textContent = fighter.stats.armor;
    transformValue.textContent = fighter.stats.transform;
    tacticalValueStat.textContent = fighter.stats.tactical;
    state.toolModeIndex = 0;
    visuals?.setToolMode?.(0);
    startButtonLabel.textContent = "驾驶出击";
    const selectedIndex = fighterOptions.findIndex((option) => option.dataset.fighter === fighterId);
    fighterOptions.forEach((option, index) => {
      const selected = option.dataset.fighter === fighterId;
      const delta = selectedIndex < 0 ? 0 : index - selectedIndex;
      option.classList.toggle("is-selected", selected);
      option.classList.toggle("is-before", delta < 0);
      option.classList.toggle("is-after", delta > 0);
      option.setAttribute("aria-pressed", String(selected));
      option.style.setProperty("--switch-delta", String(delta));
    });
    const selectedOption = fighterOptions.find((option) => option.dataset.fighter === fighterId);
    if (selectedOption && window.matchMedia("(max-width: 900px)").matches) {
      selectedOption.scrollIntoView({ block: "nearest", inline: "center", behavior: persist ? "smooth" : "auto" });
    }
    drawHangarPreview();
    setPreviewMode("flight");
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
    updateHypersonicLockState();
    selectMap(state.mapId, false);
    fighterOptions.forEach((option) => {
      const fighter = FIGHTERS[option.dataset.fighter];
      drawFighterThumbnail(option, fighter);
      option.addEventListener("click", async () => {
        await audio?.unlock();
        selectFighter(option.dataset.fighter);
        audio?.fighterSelect(option.dataset.fighter);
      });
    });
    previewButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        await audio?.unlock();
        setPreviewMode(button.dataset.preview);
        audio?.previewMode?.(button.dataset.preview, state.fighterId);
      });
    });
    mapSelect.addEventListener("change", () => {
      selectMap(mapSelect.value);
      audio?.fighterSelect?.(state.fighterId);
    });
    mapSelectTrigger.addEventListener("click", async () => {
      await audio?.unlock();
      setMapMenuOpen(mapSelectMenu.hidden, true);
    });
    mapSelectTrigger.addEventListener("keydown", (event) => {
      if (!["ArrowDown", "Enter", " "].includes(event.key)) return;
      event.preventDefault();
      setMapMenuOpen(true, true);
    });
    mapSelectOptions.forEach((option, index) => {
      option.addEventListener("click", () => {
        selectMap(option.dataset.mapOption);
        setMapMenuOpen(false);
        audio?.fighterSelect?.(state.fighterId);
        mapSelectTrigger.focus();
      });
      option.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setMapMenuOpen(false);
          mapSelectTrigger.focus();
          return;
        }
        if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        mapSelectOptions[(index + direction + mapSelectOptions.length) % mapSelectOptions.length].focus();
      });
    });
    document.addEventListener("pointerdown", (event) => {
      if (!mapSelectShell.contains(event.target)) setMapMenuOpen(false);
    });
    selectFighter(state.fighterId, false);
  }

  function setPreviewMode(mode) {
    const validMode = ["flight", "transform", "assault", "tactical"].includes(mode) ? mode : "flight";
    previewButtons.forEach((button) => {
      const selected = button.dataset.preview === validMode;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    const fighter = getFighter();
    const labels = {
      flight: `${fighter.shortName} / 飞行形态`,
      transform: `${fighter.shortName} / 变形演示`,
      assault: fighter.transformation.label,
      tactical: fighter.tactical.name,
    };
    previewStatus.textContent = labels[validMode];
    visuals?.setPreviewMode?.(validMode);
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
    if (state.running) state.mapStructures = createMapStructures(state.mapId, state.width, state.height);
    visuals?.resizeBattle(state.width, state.height);

    if (!state.pointer.active) {
      state.pointer.x = state.width / 2;
      state.pointer.y = state.height * (window.matchMedia("(max-width: 760px)").matches ? 0.58 : 0.78);
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

  function resetGame() {
    const fighter = getFighter();
    state.ended = false;
    state.elapsed = 0;
    state.score = 0;
    state.maxHealth = fighter.health;
    state.health = state.maxHealth;
    state.shieldCharges = 0;
    state.barrierTimer = 0;
    state.barrierHits = 0;
    state.allies = [];
    state.nextAllyId = 1;
    state.combo = 1;
    state.comboTimer = 0;
    state.wave = 1;
    state.kills = 0;
    state.spawnCount = 0;
    state.bossWave = 0;
    state.weaponLevel = 3;
    state.weaponEnergy = 0;
    state.trajectoryLevel = 0;
    state.transformStage = 1;
    state.transformPulse = 1;
    state.transformProgress = 0;
    state.transformTarget = 0;
    state.transformEnergy = 0;
    state.transformCores = 0;
    state.coreDropCooldown = 3.5;
    state.transformElapsed = 0;
    state.assaultFormIndex = 0;
    state.toolModeIndex = 0;
    state.tacticalCooldown = 0;
    state.wingmanTimer = 0;
    state.wingmanCooldown = 0;
    state.wingmanFireTimer = 0;
    state.wingmanUses = 0;
    state.wingmanPositions = [];
    state.formationTimer = 18;
    state.formationIndex = 0;
    state.hazardTimer = 9;
    state.mapStructures = createMapStructures(state.mapId, state.width, state.height);
    state.structureCollisionCooldown = 0;
    state.mapEventTimer = 12;
    state.meteorTimer = state.mapId === "meteor-rift" ? 5.5 : 16;
    state.meteorWarnings = [];
    state.meteors = [];
    state.meteorImpacts = 0;
    state.airdropTimer = 22 + Math.random() * 6;
    state.activeAirdropId = null;
    state.airdropDecision = null;
    state.airdropEscortsCompleted = 0;
    state.airdropEscortsFailed = 0;
    state.supplyCrates = [];
    state.laserBeams = [];
    state.laserHeat = 0;
    state.laserWarmup = 0;
    state.laserCooldown = 0;
    state.pendingLaser = null;
    state.screenLaser = null;
    state.screenLaserCooldown = 0;
    state.nuclearStrike = null;
    state.nuclearDetonations = 0;
    state.firepowerTimer = 0;
    state.meteorPierceTimer = 0;
    state.damageMultiplier = 1;
    state.fireRateMultiplier = 1;
    state.tacticalCooldownMultiplier = 1;
    state.transformGuardBonus = 0;
    state.passivePower = 0;
    state.pierceBonus = 0;
    state.waveRangeMultiplier = 1;
    state.tacticalProjectileBonus = 0;
    state.droneBonus = 0;
    state.assaultDamageMultiplier = 1;
    state.grazeCount = 0;
    state.overclockStacks = 0;
    state.revengeCharge = 0;
    state.resonanceBursts = 0;
    state.railChain = 0;
    state.railChainTimer = 0;
    state.overclockTimer = 0;
    state.heavyRangeMultiplier = 1;
    state.nextEnemyId = 1;
    state.bossKills = 0;
    state.skillUses = 0;
    state.formChanges = 0;
    state.overdrive = 0;
    state.shotCount = 0;
    state.fireTimer = 0;
    state.spawnTimer = 0.8;
    state.shake = 0;
    state.impactFlash = 0;
    state.screenEffect = null;
    state.hitStop = 0;
    state.speedLines = 0;
    state.missionPendingId = null;
    state.miniMission = null;
    state.completedMiniMissions = [];
    state.skippedMiniMissions = [];
    state.miniMissionResults = [];
    state.bullets = [];
    state.enemyBullets = [];
    state.enemies = [];
    state.pickups = [];
    state.particles = [];
    state.floatingTexts = [];
    state.hazards = [];
    state.player.x = state.width / 2;
    state.player.y = state.height * (window.matchMedia("(max-width: 760px)").matches ? 0.58 : 0.78);
    state.player.invulnerable = 0;
    state.pointer.x = state.player.x;
    state.pointer.y = state.player.y;
    state.pointer.active = false;
    gameOverPanel.hidden = true;
    bossHud.hidden = true;
    missionBriefing.hidden = true;
    missionProgress.hidden = true;
    airdropChoice.hidden = true;
    airdropProgress.hidden = true;
    gameScreen.classList.remove("is-mission-paused");
    gameScreen.classList.remove("is-airdrop-paused");
    updateHud();
    showWave(`${getBattleMap(state.mapId).name} // 作战开始`);
  }

  async function startGame(options = {}) {
    if (state.fighterId === "hypersonic" && options.conceptVerified !== true) {
      pendingHypersonicLaunch = true;
      openUnlockDialog();
      return;
    }
    pendingHypersonicLaunch = false;
    if (rulesDialog.open) rulesDialog.close();
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
    state.missionPendingId = null;
    state.miniMission = null;
    state.airdropDecision = null;
    cancelAnimationFrame(state.animationFrame);
    missionBriefing.hidden = true;
    missionProgress.hidden = true;
    airdropChoice.hidden = true;
    airdropProgress.hidden = true;
    gameScreen.classList.remove("is-mission-paused");
    gameScreen.classList.remove("is-airdrop-paused");
    gameScreen.hidden = true;
    menuScreen.hidden = false;
    document.body.style.overflow = "";
    document.body.classList.remove("game-active");
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
    const bottomInset = window.matchMedia("(max-width: 760px)").matches ? 252 : 24;
    state.pointer.x = Math.max(24, Math.min(state.width - 24, clientX - rect.left));
    state.pointer.y = Math.max(58, Math.min(state.height - bottomInset, clientY - rect.top));
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

  function triggerScreenEffect(type, color, intensity = 1, duration = 0.55, hitStop = 0) {
    state.screenEffect = { type, color, intensity, life: duration, maxLife: duration };
    state.speedLines = Math.max(state.speedLines, reducedMotion ? 0 : intensity);
    if (!reducedMotion) state.hitStop = Math.max(state.hitStop, hitStop);
    else state.shake = Math.min(state.shake, 4);
  }

  function startScreenLaser() {
    if (state.screenLaser || state.screenLaserCooldown > 0) return false;
    const fighter = getFighter();
    const hypersonic = fighter.id === "hypersonic";
    state.screenLaser = {
      life: hypersonic ? 2 : 1.55,
      maxLife: hypersonic ? 2 : 1.55,
      warning: 0.35,
      beamCount: hypersonic ? 6 : 1,
      vertical: hypersonic,
      damageTimer: 0,
      color: fighter.accent,
      lethal: hypersonic,
    };
    state.screenLaserCooldown = hypersonic ? 12 : 15;
    state.shake = hypersonic ? 22 : 17;
    triggerScreenEffect("screen-laser", fighter.accent, hypersonic ? 1.25 : 1, 0.9, 0.055);
    audio?.fullScreenLaser?.(hypersonic);
    showUpgrade(hypersonic ? "六束光阵 // 全域贯穿" : "战区横扫 // 清除敌弹", "全屏激光启动");
    return true;
  }

  function cycleToolMode() {
    if (!state.running || state.ended) return;
    const modes = getFighter().toolModes;
    state.toolModeIndex = (state.toolModeIndex + 1) % modes.length;
    state.laserWarmup = 0;
    state.pendingLaser = null;
    const mode = toolModeSpec(state.fighterId, state.toolModeIndex);
    visuals?.setToolMode?.(state.toolModeIndex);
    state.fireTimer = Math.min(state.fireTimer, 0.04);
    state.shake = 4;
    audio?.toolSwitch?.(mode.pattern, state.fighterId);
    showUpgrade(`${mode.name} // ${state.toolModeIndex + 1} / ${modes.length}`, "攻击形态切换");
    updateWeaponHud();
    updateAbilityHud();
  }

  function launchNuclearStrike(spec, assault) {
    if (state.nuclearStrike) return false;
    const priorityTarget = state.enemies.find((enemy) => enemy.type === "boss")
      || state.enemies.reduce((closest, enemy) => {
        if (!closest) return enemy;
        const center = state.width / 2;
        return Math.abs(enemy.x - center) < Math.abs(closest.x - center) ? enemy : closest;
      }, null);
    const targetX = Math.max(70, Math.min(state.width - 70, priorityTarget?.x ?? state.width / 2));
    const targetY = Math.max(105, Math.min(state.height * 0.48, priorityTarget?.y ?? state.height * 0.3));
    state.nuclearStrike = {
      startX: state.player.x,
      startY: state.player.y - 28,
      x: state.player.x,
      y: state.player.y - 28,
      targetX,
      targetY,
      life: assault ? 0.7 : 0.9,
      maxLife: assault ? 0.7 : 0.9,
      blastLife: 0,
      maxBlastLife: assault ? 1.45 : 1.2,
      detonated: false,
      assault,
    };
    state.tacticalCooldown = spec.cooldown * state.tacticalCooldownMultiplier * (assault ? 0.82 : 1);
    state.skillUses += 1;
    state.player.invulnerable = Math.max(state.player.invulnerable, 0.8);
    state.shake = 10;
    audio?.nuclearLaunch?.();
    showUpgrade("核弹升空 // 锁定战区中心", "天穹核裁决");
    triggerScreenEffect("nuclear-launch", getFighter().secondary, 0.72, 0.5, 0.025);
    updateAbilityHud();
    return true;
  }

  function detonateNuclearStrike() {
    const strike = state.nuclearStrike;
    if (!strike || strike.detonated) return;
    strike.detonated = true;
    strike.blastLife = strike.maxBlastLife;
    state.nuclearDetonations += 1;
    const clearedBullets = state.enemyBullets.length;
    state.enemyBullets = [];
    let destroyed = 0;
    for (let index = state.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = state.enemies[index];
      if (enemy.type === "boss") {
        enemy.hp -= Math.max(120, enemy.maxHp * (strike.assault ? 0.42 : 0.3));
        bossProgress.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
      } else {
        enemy.hp = 0;
      }
      if (enemy.hp <= 0) {
        destroyed += 1;
        killEnemy(index);
      }
    }
    state.meteors.slice().forEach((meteor) => damageMeteor(meteor, 999, getFighter().secondary));
    state.mapStructures.forEach((structure) => {
      if (!structure.breakable || structure.destroyed) return;
      structure.destroyed = true;
      state.score += 900;
    });
    state.player.invulnerable = Math.max(state.player.invulnerable, 1.4);
    state.shake = reducedMotion ? 4 : 30;
    state.impactFlash = 0.9;
    burst(strike.x, strike.y, getFighter().secondary, 110, 520, 1.45);
    addFloatingText(strike.x, strike.y, `核裁决 ×${destroyed}`, getFighter().secondary);
    showUpgrade(`秒杀 ${destroyed} 架敌机 // 清除 ${clearedBullets} 枚敌弹`, "核爆冲击");
    triggerScreenEffect("nuclear-blast", getFighter().secondary, 1.75, 1.25, 0.095);
    audio?.nuclearBlast?.();
    updateHud();
  }

  function updateNuclearStrike(dt) {
    const strike = state.nuclearStrike;
    if (!strike) return;
    if (!strike.detonated) {
      strike.life = Math.max(0, strike.life - dt);
      const progress = 1 - strike.life / strike.maxLife;
      const eased = 1 - (1 - progress) ** 3;
      strike.x = strike.startX + (strike.targetX - strike.startX) * eased;
      strike.y = strike.startY + (strike.targetY - strike.startY) * eased - Math.sin(progress * Math.PI) * 150;
      if (strike.life <= 0) detonateNuclearStrike();
      return;
    }
    strike.blastLife = Math.max(0, strike.blastLife - dt);
    if (strike.blastLife <= 0) state.nuclearStrike = null;
  }

  function toggleTransform() {
    if (!state.running || state.ended) return;
    const entering = state.transformTarget < 0.5;
    const fighter = getFighter();
    if (entering && !canEnterCoreTransform(state.transformCores)) {
      showUpgrade(`还差 ${TRANSFORM_CORE_COST - state.transformCores} 个能量球`, "无法变身");
      audio?.transformDenied?.();
      return;
    }

    state.transformTarget = entering ? 1 : 0;
    state.formChanges += 1;
    state.transformPulse = 1.45;
    state.player.invulnerable = Math.max(
      state.player.invulnerable,
      entering ? 0.68 + state.transformGuardBonus : 0.34,
    );
    state.shake = entering ? 14 : 8;
    if (entering) {
      state.transformCores -= TRANSFORM_CORE_COST;
      state.transformElapsed = 0;
      state.transformEnergy = 100;
      state.assaultFormIndex = 0;
      const fireBoost = assaultFireSpec(1, fighter.id);
      const rateIncrease = Math.round((1 / fireBoost.rateMultiplier - 1) * 100);
      const cleared = clearEnemyBulletsAround(state.player.x, state.player.y, 150);
      showUpgrade(
        `${fighter.transformation.label} // 射速 +${rateIncrease}% · 弹量 +${fireBoost.projectileBonus}`,
        `机械重组 // ${TRANSFORM_DURATION} 秒`,
      );
      triggerScreenEffect("transform", fighter.accent, fighter.id === "hypersonic" ? 1.25 : 1, 0.9, 0.06);
      burst(state.player.x, state.player.y, getFighter().accent, 54, 330, 1.1);
    } else {
      state.transformEnergy = 0;
      showUpgrade(`${getFighter().shortName} // 飞行形态`, "飞行复原");
      burst(state.player.x, state.player.y, getFighter().secondary, 30, 230, 0.72);
    }
    audio?.transform(entering);
    updateAbilityHud();
  }

  function fireTactical() {
    if (!state.running || state.ended) return;
    if (state.tacticalCooldown > 0) {
      showUpgrade(`冷却 ${state.tacticalCooldown.toFixed(1)} 秒`, "专属技能");
      return;
    }

    const fighter = getFighter();
    const spec = tacticalSpec(fighter.id);
    const assault = state.transformProgress > 0.72;
    const mode = toolModeSpec(state.fighterId, state.toolModeIndex);
    if (assault && mode.pattern === "laser" && startScreenLaser()) {
      state.tacticalCooldown = Math.max(spec.cooldown * 0.9, state.screenLaserCooldown);
      state.skillUses += 1;
      updateAbilityHud();
      return;
    }
    if (spec.projectile === "nuclear" && launchNuclearStrike(spec, assault)) return;
    const fireBoost = assaultFireSpec(state.transformProgress, fighter.id);
    const revenge = fighter.id === "su57" ? state.revengeCharge : 0;
    const projectileCount = spec.count + state.tacticalProjectileBonus + Math.floor(revenge / 30)
      + fireBoost.projectileBonus * 2;
    const x = state.player.x;
    const y = state.player.y - 24;
    const cleared = clearEnemyBulletsAround(x, y, assault ? 250 : 205);
    const blastRadius = assault ? 245 : 190;
    const blastDamage = (assault ? 11 : 7) * fighter.damage * state.damageMultiplier
      * (1 + revenge / 180);

    if (fighter.id === "f22" || fighter.id === "j35") {
      const marked = state.enemies.filter((enemy) => enemy.marked);
      marked.forEach((enemy) => {
        enemy.hp -= blastDamage * (1.35 + state.passivePower);
        enemy.marked = false;
        burst(enemy.x, enemy.y, fighter.accent, 18, 220, 0.55);
        addFloatingText(enemy.x, enemy.y, "幽灵处决", fighter.accent);
      });
    }

    for (let enemyIndex = state.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
      const enemy = state.enemies[enemyIndex];
      const distance = Math.hypot(enemy.x - x, enemy.y - y);
      if (distance > blastRadius + enemy.radius) continue;
      enemy.hp -= enemy.type === "boss" ? blastDamage * 0.42 : blastDamage;
      if (enemy.hp <= 0) killEnemy(enemyIndex);
    }

    for (let enemyIndex = state.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
      if (state.enemies[enemyIndex].hp <= 0) killEnemy(enemyIndex);
    }

    if (spec.projectile === "laser") {
      const center = (projectileCount - 1) / 2;
      for (let shot = 0; shot < projectileCount; shot += 1) {
        addPlayerBullet(x, y, (shot - center) * 0.028, 1900, "laser", assault ? 5.4 : 3.8, {
          color: shot % 3 === 0 ? fighter.secondary : fighter.accent,
          radius: shot % 5 === 0 ? 6 : 3.8,
          pierce: 18,
          tactical: true,
        });
      }
    } else if (spec.projectile === "rail") {
      const center = (projectileCount - 1) / 2;
      for (let shot = 0; shot < projectileCount; shot += 1) {
        addPlayerBullet(x + (shot - center) * 13, y, (shot - center) * 0.018, 1180, "rail", assault ? 3.8 : 2.8, {
          color: fighter.accent,
          radius: 5,
          pierce: fighter.id === "typhoon" ? 4 + state.pierceBonus : 1 + state.pierceBonus,
          tactical: true,
        });
      }
    } else if (spec.projectile === "wave") {
      const center = (projectileCount - 1) / 2;
      for (let shot = 0; shot < projectileCount; shot += 1) {
        addPlayerBullet(x, y, (shot - center) * 0.055, 760, "wave", assault ? 3.2 : 2.3, {
          phase: shot * 0.7,
          waveAmp: (28 + (shot % 3) * 6) * state.waveRangeMultiplier,
          color: fighter.accent,
          radius: 6,
          tactical: true,
        });
      }
    } else if (spec.projectile === "heavy") {
      const center = (projectileCount - 1) / 2;
      for (let shot = 0; shot < projectileCount; shot += 1) {
        addPlayerBullet(x, y, (shot - center) * 0.085, 610, "heavy", (assault ? 6.8 : 5.1) * (1 + revenge / 120), {
          color: shot % 2 ? fighter.secondary : fighter.accent,
          radius: (assault ? 11 : 9) * Math.min(1.35, state.heavyRangeMultiplier),
          tactical: true,
        });
      }
    } else {
      const projectileType = spec.projectile === "drone" ? "drone" : "seeker";
      const center = (projectileCount - 1) / 2;
      for (let shot = 0; shot < projectileCount; shot += 1) {
        addPlayerBullet(x, y, (shot - center) * 0.045, 680 + (shot % 3) * 45, projectileType, assault ? 3.5 : 2.6, {
          color: shot % 2 ? fighter.secondary : fighter.accent,
          radius: 6,
          tactical: true,
        });
      }
    }

    state.tacticalCooldown = spec.cooldown * state.tacticalCooldownMultiplier * (assault ? 0.84 : 1);
    if (fighter.id === "su57") state.revengeCharge = 0;
    if (fighter.id === "gripen") {
      state.overclockStacks = Math.min(10, state.overclockStacks + 2 + state.droneBonus);
      state.overclockTimer = 3.2;
    }
    state.skillUses += 1;
    state.shake = assault ? 17 : 11;
    state.impactFlash = 0.18;
    audio?.tactical?.(fighter.id, assault);
    showUpgrade(`${spec.name} // 清除 ${cleared} 枚敌弹`, "技能释放");
    burst(x, y, fighter.accent, assault ? 72 : 48, assault ? 390 : 310, 1.15);
    updateAbilityHud();
  }

  function wingmanOffsets(spec) {
    const formations = {
      crown: [[-62, 26], [0, 54], [62, 26]],
      pincer: [[-66, 8], [66, 8]],
      echelon: [[-66, 18], [6, 48], [76, 72]],
      hunter: [[-48, -4], [48, -4]],
      lance: [[-34, 38], [34, 38]],
      arrow: [[-58, 34], [0, 58], [58, 34]],
      bulwark: [[-76, 22], [76, 22]],
      halo: [[-72, 12], [0, 66], [72, 12]],
    };
    if (spec.formation === "orbit") {
      return Array.from({ length: spec.count }, (_, index) => {
        const angle = state.elapsed * 1.35 + (Math.PI * 2 * index) / spec.count;
        return [Math.cos(angle) * 62, 30 + Math.sin(angle) * 28];
      });
    }
    return (formations[spec.formation] || formations.pincer).slice(0, spec.count);
  }

  function updateWingmanPositions() {
    const spec = wingmanSpec(state.fighterId);
    state.wingmanPositions = wingmanOffsets(spec).map(([offsetX, offsetY], index) => ({
      x: Math.max(22, Math.min(state.width - 22, state.player.x + offsetX)),
      y: Math.max(52, Math.min(state.height - 88, state.player.y + offsetY + Math.sin(state.elapsed * 4 + index) * 4)),
    }));
  }

  function summonWingmen() {
    if (!state.running || state.ended) return;
    if (state.elapsed < 15) {
      showUpgrade(`${Math.ceil(15 - state.elapsed)} 秒后开放`, "僚机正在进入战区");
      return;
    }
    const spec = wingmanSpec(state.fighterId);
    if (state.wingmanTimer > 0) {
      showUpgrade(`仍在作战 // ${state.wingmanTimer.toFixed(1)} 秒`, spec.name);
      return;
    }
    if (state.wingmanCooldown > 0) {
      showUpgrade(`整备中 // ${state.wingmanCooldown.toFixed(1)} 秒`, "僚机支援");
      audio?.transformDenied?.();
      return;
    }

    state.wingmanTimer = spec.duration;
    state.wingmanCooldown = spec.cooldown;
    state.wingmanFireTimer = 0.05;
    state.wingmanUses += 1;
    state.player.invulnerable = Math.max(state.player.invulnerable, 0.45);
    updateWingmanPositions();
    const cleared = clearEnemyBulletsAround(state.player.x, state.player.y, 125);
    state.shake = 9;
    audio?.wingmanSummon?.(state.fighterId);
    showUpgrade(`${spec.count} 架编队 // ${spec.duration.toFixed(1)} 秒`, spec.name);
    burst(state.player.x, state.player.y, getFighter().secondary, 40, 260, 0.85);
    updateAbilityHud();
  }

  function fireWingmen() {
    const spec = wingmanSpec(state.fighterId);
    const center = (state.wingmanPositions.length - 1) / 2;
    state.wingmanPositions.forEach((wingman, index) => {
      const angle = (index - center) * 0.055;
      addPlayerBullet(wingman.x, wingman.y - 18, angle, spec.speed, spec.projectile, spec.damage, {
        source: "wingman",
        color: index % 2 ? getFighter().secondary : getFighter().accent,
        radius: spec.projectile === "heavy" ? 8 : spec.projectile === "wave" ? 5.5 : 4.6,
        phase: state.elapsed * 5 + index,
        waveAmp: spec.projectile === "wave" ? 28 : 0,
        pierce: spec.projectile === "rail" ? 2 : undefined,
      });
      burst(wingman.x, wingman.y - 16, getFighter().secondary, 2, 34, 0.12);
    });
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
    const source = options.source || "player";
    const budget = projectileBudget(state.elapsed, {
      transformed: state.transformProgress > 0.72,
      boss: state.enemies.some((enemy) => enemy.type === "boss"),
    });
    const playerCount = state.bullets.filter((bullet) => bullet.source === "player").length;
    if (state.bullets.length >= budget.allied || (source === "player" && playerCount >= budget.player)) {
      if (!options.tactical) return false;
      const removable = state.bullets.findIndex((bullet) => !bullet.tactical && bullet.source !== "player");
      if (removable >= 0) state.bullets.splice(removable, 1);
      else return false;
    }
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
      source,
      tactical: Boolean(options.tactical),
      pierceLeft: options.pierce ?? (type === "laser" ? 10 : type === "rail" ? (fighter.id === "typhoon" ? 2 : 1) + state.pierceBonus : 0),
      hitTargets: new Set(),
    });
    return true;
  }

  function fireSignatureWeapon(x, y, level) {
    if (level < 3 || state.elapsed < 15) return;
    const fighter = getFighter();
    const apex = level >= 5;

    if ((fighter.id === "f22" || fighter.id === "j35") && state.shotCount % (apex ? 2 : 3) === 0) {
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
        waveAmp: (apex ? 30 : 22) * state.waveRangeMultiplier,
        color: fighter.accent,
        radius: 5,
      });
      addPlayerBullet(x + 22, y + 6, 0.05, 700, "wave", apex ? 1.8 : 1.25, {
        phase: Math.PI + state.shotCount * 0.4,
        waveAmp: (apex ? 30 : 22) * state.waveRangeMultiplier,
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
    } else if (fighter.id === "j20" || fighter.id === "faxx") {
      const type = apex ? "seeker" : "drone";
      const droneCount = 2 + state.droneBonus;
      for (let drone = 0; drone < droneCount; drone += 1) {
        const side = drone % 2 === 0 ? -1 : 1;
        const rank = Math.floor(drone / 2);
        addPlayerBullet(x + side * (29 + rank * 11), y + 10 + rank * 5, side * (0.03 + rank * 0.018), apex ? 620 : 760, type, apex ? 1.9 : 1.2, {
          color: fighter.accent,
          radius: apex ? 5.5 : 4,
        });
      }
    } else if (fighter.id === "gripen" && state.droneBonus > 0 && state.shotCount % 2 === 0) {
      for (let drone = 0; drone < state.droneBonus; drone += 1) {
        const side = drone % 2 === 0 ? -1 : 1;
        addPlayerBullet(x + side * (27 + drone * 4), y + 8, side * 0.08, 920, "drone", 1.45, {
          color: fighter.secondary,
          radius: 4,
        });
      }
    }
  }

  function startLaserCharge(mode) {
    if (state.laserCooldown > 0 || state.laserWarmup > 0 || state.laserBeams.length > 0) return false;
    const spec = laserModeSpec(mode);
    const fireBoost = assaultFireSpec(state.transformProgress, state.fighterId);
    const shotHeat = spec.heat * fireBoost.heatMultiplier;
    if (state.laserHeat + shotHeat > 112) {
      state.laserCooldown = spec.overheatCooldown;
      state.laserHeat = 100;
      audio?.laserOverheat?.();
      showUpgrade(`${mode.name} // 冷却 ${spec.overheatCooldown.toFixed(1)} 秒`, "激光过热");
      return false;
    }
    state.pendingLaser = { fighterId: state.fighterId, modeId: mode.id, mode: { ...mode, ...spec } };
    state.laserWarmup = spec.warmup;
    audio?.laserCharge?.(state.fighterId, spec.warmup);
    return true;
  }

  function emitLaserBeams(pending) {
    if (!pending || pending.fighterId !== state.fighterId) return;
    const mode = pending.mode;
    const fireBoost = assaultFireSpec(state.transformProgress, state.fighterId);
    const count = Math.max(1, Math.min(5, (mode.count || 1) + fireBoost.laserBeamBonus));
    const center = (count - 1) / 2;
    const levelPower = 1 + (state.weaponLevel - 1) * 0.1 + state.trajectoryLevel * 0.06;
    for (let index = 0; index < count; index += 1) {
      state.laserBeams.push({
        id: `${pending.modeId}-${state.shotCount}-${index}`,
        angle: (index - center) * (mode.spread || 0),
        offsetX: (index - center) * 16,
        life: mode.duration,
        duration: mode.duration,
        width: mode.width,
        damagePerSecond: mode.damage * getFighter().damage * state.damageMultiplier * levelPower * 1.25,
        color: index % 2 ? getFighter().secondary : getFighter().accent,
        reflect: Boolean(mode.reflect),
        style: mode.laserStyle || "pierce",
        lethal: state.fighterId === "hypersonic",
        damageTimer: 0,
      });
    }
    state.laserHeat = Math.min(100, state.laserHeat + mode.heat * fireBoost.heatMultiplier);
    if (state.laserHeat >= 98) state.laserCooldown = mode.overheatCooldown;
    state.shake = Math.max(state.shake, mode.width > 7 ? 7 : 3);
    state.impactFlash = Math.max(state.impactFlash, 0.05);
    audio?.laserBeam?.(state.fighterId, mode.laserStyle);
  }

  function traceLaserBeam(beam) {
    const origin = { x: state.player.x + beam.offsetX, y: state.player.y - 24 };
    const maxLength = state.height + 180;
    const trace = (start, angle, distance) => {
      const dx = Math.sin(angle);
      const dy = -Math.cos(angle);
      const step = 8;
      for (let travelled = step; travelled <= distance; travelled += step) {
        const x = start.x + dx * travelled;
        const y = start.y + dy * travelled;
        const structure = state.mapStructures.find((item) => pointInsideStructure(x, y, item, beam.width * 0.35));
        if (structure) return { x, y, travelled, structure, dx, dy };
      }
      return { x: start.x + dx * distance, y: start.y + dy * distance, travelled: distance, structure: null, dx, dy };
    };

    const first = trace(origin, beam.angle, maxLength);
    const segments = [{ x1: origin.x, y1: origin.y, x2: first.x, y2: first.y, structure: first.structure }];
    if (beam.reflect && first.structure?.reflective) {
      const structure = first.structure;
      const distances = [
        { side: "left", value: Math.abs(first.x - structure.x) },
        { side: "right", value: Math.abs(first.x - (structure.x + structure.width)) },
        { side: "top", value: Math.abs(first.y - structure.y) },
        { side: "bottom", value: Math.abs(first.y - (structure.y + structure.height)) },
      ].sort((a, b) => a.value - b.value);
      const side = distances[0].side;
      const reflectedAngle = side === "left" || side === "right" ? -beam.angle : Math.PI - beam.angle;
      const secondStart = {
        x: first.x - first.dx * 5,
        y: first.y - first.dy * 5,
      };
      const second = trace(secondStart, reflectedAngle, Math.max(120, maxLength - first.travelled));
      segments.push({ x1: secondStart.x, y1: secondStart.y, x2: second.x, y2: second.y, structure: second.structure });
    }
    return segments;
  }

  function distanceToSegment(x, y, segment) {
    const vx = segment.x2 - segment.x1;
    const vy = segment.y2 - segment.y1;
    const lengthSquared = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((x - segment.x1) * vx + (y - segment.y1) * vy) / lengthSquared));
    return Math.hypot(x - (segment.x1 + vx * t), y - (segment.y1 + vy * t));
  }

  function destroyBossPart(enemy, partKey, x, y) {
    const part = enemy.parts?.[partKey];
    if (!part || part.destroyed || part.hp > 0) return false;
    part.destroyed = true;
    state.score += 1400 * state.combo;
    state.enemyBullets = [];
    spawnPickup(x, y, "core");
    state.shake = 15;
    audio?.bossPart?.();
    addFloatingText(x, y, `${partKey === "left" ? "左侧" : "右侧"}武器舱熔毁`, COLORS.elite);
    showUpgrade("武器舱摧毁 // 弹幕削弱", "首领部件破坏");
    burst(x, y, COLORS.elite, 46, 290, 1.05);
    triggerScreenEffect("boss-part", COLORS.elite, 0.8, 0.58, 0.04);
    return true;
  }

  function damageEnemiesWithBeam(beam) {
    const segments = traceLaserBeam(beam);
    const tickDamage = beam.damagePerSecond * 0.08;
    state.enemies.forEach((enemy) => {
      if (!segments.some((segment) => distanceToSegment(enemy.x, enemy.y, segment) <= enemy.radius + beam.width * 0.5)) return;
      const weakPointBonus = beam.style === "precision" && (enemy.type === "elite" || enemy.type === "boss") ? 1.42 : 1;
      const burnBonus = 1 + Math.min(5, enemy.laserBurn || 0) * 0.04;
      const heroLaserMultiplier = beam.lethal && enemy.type === "boss" ? 2.35 : 1;
      const beamDamage = tickDamage * weakPointBonus * burnBonus * heroLaserMultiplier;
      enemy.hp -= beam.lethal && enemy.type !== "boss" ? Math.max(enemy.hp, beamDamage) : beamDamage;
      enemy.laserBurn = Math.min(5, (enemy.laserBurn || 0) + 1);
      enemy.laserBurnTimer = 0.46;
      if (enemy.type === "boss" && enemy.parts) {
        const relativeX = state.player.x - enemy.x;
        const partKey = relativeX < -22 ? "left" : relativeX > 22 ? "right" : null;
        const part = partKey ? enemy.parts[partKey] : null;
        if (part && !part.destroyed) {
          part.hp -= tickDamage * 0.22;
          destroyBossPart(enemy, partKey, enemy.x + (partKey === "left" ? -48 : 48), enemy.y);
        }
      }
      if (enemy.type === "boss") bossProgress.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
      if (Math.random() < 0.28) burst(enemy.x, enemy.y, beam.color, 2, 70, 0.18);
    });
    segments.forEach((segment) => {
      if (segment.structure?.breakable) damageStructure(segment.structure, tickDamage * 0.82, segment.x2, segment.y2, "激光切割");
    });
    state.meteors.forEach((meteor) => {
      if (!segments.some((segment) => distanceToSegment(meteor.x, meteor.y, segment) <= meteor.radius + beam.width)) return;
      damageMeteor(meteor, tickDamage * 1.35, beam.color);
    });
    const mission = state.miniMission;
    if (mission?.id === "mothership") {
      mission.parts.slice().forEach((part) => {
        if (part.destroyed) return;
        if (!segments.some((segment) => distanceToSegment(part.x, part.y, segment) <= part.radius + beam.width)) return;
        damageMissionPart(part, tickDamage * 1.45);
      });
    } else if (mission?.id === "chain") {
      const node = mission.nodes.find((item) => !item.destroyed
        && segments.some((segment) => distanceToSegment(item.x, item.y, segment) <= item.radius + beam.width));
      if (node) detonateChainNode(node.id);
    }
  }

  function updateLasers(dt) {
    state.laserCooldown = Math.max(0, state.laserCooldown - dt);
    const active = state.laserWarmup > 0 || state.laserBeams.length > 0;
    const currentMode = toolModeSpec(state.fighterId, state.toolModeIndex);
    const cooling = laserModeSpec(currentMode).coolRate;
    if (!active) state.laserHeat = Math.max(0, state.laserHeat - cooling * dt);

    if (state.laserWarmup > 0) {
      state.laserWarmup = Math.max(0, state.laserWarmup - dt);
      if (state.laserWarmup === 0) {
        const pending = state.pendingLaser;
        state.pendingLaser = null;
        if (pending?.modeId === currentMode.id) emitLaserBeams(pending);
      }
    }

    for (let index = state.laserBeams.length - 1; index >= 0; index -= 1) {
      const beam = state.laserBeams[index];
      beam.life -= dt;
      beam.damageTimer -= dt;
      if (beam.damageTimer <= 0) {
        beam.damageTimer = 0.08;
        damageEnemiesWithBeam(beam);
      }
      if (beam.life <= 0) state.laserBeams.splice(index, 1);
    }
    if (currentMode.pattern === "laser") updateWeaponHud();
  }

  function screenLaserGeometry(laser) {
    const activeLife = Math.max(0.01, laser.maxLife - laser.warning);
    const progress = Math.max(0, Math.min(1, (laser.maxLife - laser.life - laser.warning) / activeLife));
    if (laser.vertical) {
      return Array.from({ length: laser.beamCount }, (_, index) => ({
        vertical: true,
        x: ((index + 0.5) / laser.beamCount) * state.width + Math.sin(progress * Math.PI * 2 + index) * 18,
      }));
    }
    return [{ vertical: false, y: 70 + progress * Math.max(80, state.height - 140) }];
  }

  function updateScreenLaser(dt) {
    state.screenLaserCooldown = Math.max(0, state.screenLaserCooldown - dt);
    const laser = state.screenLaser;
    if (!laser) return;
    laser.life -= dt;
    if (laser.life <= laser.maxLife - laser.warning) {
      laser.damageTimer -= dt;
      if (laser.damageTimer <= 0) {
        laser.damageTimer = 0.08;
        const geometry = screenLaserGeometry(laser);
        state.enemyBullets = state.enemyBullets.filter((bullet) => !geometry.some((beam) => (
          beam.vertical ? Math.abs(bullet.x - beam.x) < 34 : Math.abs(bullet.y - beam.y) < 42
        )));
        for (let index = state.enemies.length - 1; index >= 0; index -= 1) {
          const enemy = state.enemies[index];
          const hit = geometry.some((beam) => beam.vertical
            ? Math.abs(enemy.x - beam.x) < enemy.radius + 30
            : Math.abs(enemy.y - beam.y) < enemy.radius + 38);
          if (!hit) continue;
          enemy.hp -= enemy.type === "boss" ? (laser.lethal ? 18 : 8) : laser.lethal ? Math.max(enemy.hp, 80) : 28;
          enemy.laserBurn = Math.min(5, (enemy.laserBurn || 0) + 1);
          enemy.laserBurnTimer = 0.5;
          if (enemy.hp <= 0) killEnemy(index);
        }
        state.meteors.slice().forEach((meteor) => {
          const hit = geometry.some((beam) => beam.vertical
            ? Math.abs(meteor.x - beam.x) < meteor.radius + 30
            : Math.abs(meteor.y - beam.y) < meteor.radius + 38);
          if (hit) damageMeteor(meteor, meteor.large ? 9 : 16, laser.color);
        });
      }
    }
    if (laser.life <= 0) state.screenLaser = null;
  }

  function shoot() {
    const x = state.player.x;
    const y = state.player.y - 21;
    const level = state.weaponLevel;
    state.shotCount += 1;

    const mode = toolModeSpec(state.fighterId, state.toolModeIndex);
    if (mode.pattern === "laser") {
      startLaserCharge(mode);
      return;
    }
    const phase = combatPhase(state.elapsed);
    const fireBoost = assaultFireSpec(state.transformProgress, state.fighterId);
    const extraShots = (phase === "identify" ? 0 : phase === "learn" ? Math.min(1, state.trajectoryLevel) : Math.floor((level - 1) / 2) + state.trajectoryLevel)
      + (state.firepowerTimer > 0 ? 2 : 0);
    const phaseLimit = (phase === "identify" ? 3 : phase === "learn" ? 4 : phase === "expand" ? 6 : 8)
      + fireBoost.projectileBonus;
    const shotCount = Math.min(phaseLimit, mode.count + extraShots + fireBoost.projectileBonus);
    const center = (shotCount - 1) / 2;
    const damage = mode.damage * (1 + (level - 1) * 0.12 + state.trajectoryLevel * 0.08) * (state.firepowerTimer > 0 ? 1.35 : 1);
    for (let shot = 0; shot < shotCount; shot += 1) {
      const angle = (shot - center) * mode.spread;
      const options = {
        color: shot % 2 ? getFighter().secondary : getFighter().accent,
        radius: mode.pattern === "heavy" ? 8 : mode.pattern === "laser" ? 4.8 : mode.pattern === "wave" || mode.pattern === "seeker" ? 5.5 : 4.2,
        phase: state.shotCount * 0.35 + shot,
        waveAmp: mode.pattern === "wave" ? (22 + level * 2) * state.waveRangeMultiplier : 0,
        pierce: mode.pattern === "laser" ? 12 : mode.pattern === "rail" ? 1 + state.pierceBonus : undefined,
      };
      addPlayerBullet(x, y, angle, mode.speed, mode.pattern, damage, options);
    }

    fireSignatureWeapon(x, y, level);

    if (state.transformProgress > 0.72) {
      const assaultDamage = (1.5 + state.transformProgress * 0.65) * state.assaultDamageMultiplier;
      [-0.28, 0.28].forEach((angle, index) => {
        addPlayerBullet(x + (index < 2 ? -18 : 18), y + 8, angle, 760, index % 2 ? "wave" : "heavy", assaultDamage, {
          color: index % 2 ? getFighter().secondary : getFighter().accent,
          radius: index % 2 ? 5 : 7,
          phase: state.shotCount * 0.25 + index,
          waveAmp: 18 * state.waveRangeMultiplier,
        });
      });
      fireSignatureWeapon(x, y + 5, 5);
    }

    if (state.overdrive > 0) {
      [-0.18, 0, 0.18].forEach((angle) => {
        addPlayerBullet(x, y + 5, angle, 880, "overdrive", 1.25, {
          color: COLORS.overdrive,
          radius: 4.5,
        });
      });
    }

    burst(x, y, state.overdrive > 0 ? COLORS.overdrive : getFighter().secondary, 1, 36, 0.1);
    audio?.fire(state.fighterId, state.overdrive > 0, x, state.width);
  }

  function makeEnemy(type, x) {
    const waveScale = 1 + Math.min(2.1, state.wave * 0.085);
    const config = ENEMY_CONFIGS[type] || ENEMY_CONFIGS.scout;
    const hp = typeof config.hp === "function" ? config.hp(state.wave) : config.hp;
    return {
      id: state.nextEnemyId++,
      type: ENEMY_CONFIGS[type] ? type : "scout",
      x,
      y: -config.radius * 2,
      radius: config.radius,
      hp,
      maxHp: hp,
      speed: config.speed * waveScale,
      drift: (Math.random() - 0.5) * config.drift,
      score: config.score,
      fireMode: config.fire,
      phase: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI,
      rotationSpeed: type === "spinner" ? 4.2 : type === "helicopter" ? 0.18 : type === "splitter" ? 1.7 : (Math.random() - 0.5) * 1.6,
      fireTimer: 0.52 + Math.random() * 0.95,
      pattern: 0,
      laserBurn: 0,
      laserBurnTimer: 0,
    };
  }

  function spawnEnemy() {
    state.spawnCount += 1;
    const margin = 36;
    const x = margin + Math.random() * Math.max(1, state.width - margin * 2);
    const phase = combatPhase(state.elapsed);
    const pressure = Math.min(0.62, state.wave * 0.045 + state.elapsed / 420);
    let type = Math.random() < 0.45 - pressure * 0.2 ? "scout" : "gunner";

    if (phase === "identify") type = "scout";
    else if (phase === "learn") type = Math.random() < 0.68 ? "scout" : "gunner";
    else if (phase === "expand") {
      const earlyPool = ["scout", "gunner", "sniper", "fighter"];
      type = earlyPool[Math.floor(Math.random() * earlyPool.length)];
    }

    if (phase === "full" && (state.spawnCount % 17 === 0 || (state.wave >= 6 && Math.random() < 0.08 + pressure * 0.08))) {
      type = "elite";
    } else if (phase === "full" && (state.spawnCount % 15 === 0 || (state.wave >= 3 && Math.random() < pressure * 0.1))) {
      type = "helicopter";
    } else if (phase === "full" && (state.spawnCount % 10 === 0 || Math.random() < pressure * 0.14)) {
      type = "fighter";
    } else if (phase === "full" && (state.spawnCount % 13 === 0 || Math.random() < pressure * 0.12)) {
      type = "splitter";
    } else if (phase === "full" && (state.spawnCount % 11 === 0 || Math.random() < pressure * 0.12)) {
      type = "mineLayer";
    } else if (phase === "full" && (state.spawnCount % 9 === 0 || Math.random() < pressure * 0.13)) {
      type = "bomber";
    } else if (phase === "full" && (state.spawnCount % 7 === 0 || Math.random() < pressure * 0.16)) {
      type = "spinner";
    } else if (phase === "full" && (state.spawnCount % 5 === 0 || Math.random() < pressure * 0.18)) {
      type = "sniper";
    }

    state.enemies.push(makeEnemy(type, x));
    audio?.enemySpawn?.(type, x, state.width);
  }

  function spawnAirdropCarrier() {
    if (state.activeAirdropId || state.supplyCrates.length || state.enemies.some((enemy) => enemy.type === "boss")) return false;
    const fromLeft = Math.random() < 0.5;
    const carrier = makeEnemy("carrier", fromLeft ? -52 : state.width + 52);
    carrier.y = Math.max(86, Math.min(160, state.height * 0.18));
    carrier.vx = fromLeft ? 108 : -108;
    carrier.speed = 0;
    carrier.drift = 0;
    carrier.escapeSide = fromLeft ? "right" : "left";
    state.enemies.push(carrier);
    state.activeAirdropId = carrier.id;
    showWave("空投运输机进入战区");
    audio?.airdropWarning?.();
    triggerScreenEffect("airdrop", COLORS.ally, 0.5, 0.46);
    return true;
  }

  function spawnBoss() {
    const hp = 220 + state.wave * 30;
    const partHp = Math.round(hp * 0.18);
    state.enemyBullets = [];
    state.enemies.push({
      id: state.nextEnemyId++,
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
    bossName.textContent = "重装母舰 / 第一阶段";
    bossProgress.style.width = "100%";
    bossHud.hidden = false;
    showWave("警告 // 首领来袭");
    audio?.bossWarning();
  }

  function addEnemyBullet(x, y, angle, speed, options = {}) {
    const budget = projectileBudget(state.elapsed, {
      transformed: state.transformProgress > 0.72,
      boss: state.enemies.some((enemy) => enemy.type === "boss"),
    });
    if (state.enemyBullets.length >= budget.enemy) return false;
    state.enemyBullets.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: options.radius || 5,
      color: options.color || COLORS.enemyBullet,
      kind: options.kind || "orb",
      accel: options.accel || 0,
      pulse: options.pulse || 0,
      age: 0,
      curve: options.curve || 0,
    });
    return true;
  }

  function fireAtPlayer(enemy, spread = 0, count = 1, speed = 265, options = {}) {
    const escortCrate = getActiveEscortCrate();
    const target = escortCrate && Math.random() < 0.44 ? escortCrate : state.player;
    const base = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    const center = (count - 1) / 2;
    for (let i = 0; i < count; i += 1) {
      addEnemyBullet(enemy.x, enemy.y + enemy.radius * 0.45, base + (i - center) * spread, speed, options);
    }
  }

  function fireEnemyPattern(enemy) {
    const speedScale = 1 + Math.min(0.42, state.wave * 0.028);
    if (enemy.fireMode === "aim") {
      fireAtPlayer(enemy, 0.08, 2, 290 * speedScale, { kind: "bolt", color: COLORS.enemyBullet, radius: 4.8 });
      enemy.fireTimer = 1.1 + Math.random() * 0.3;
    } else if (enemy.fireMode === "fan") {
      const count = 7 + Math.min(4, Math.floor(state.wave / 4));
      for (let shot = 0; shot < count; shot += 1) {
        addEnemyBullet(enemy.x, enemy.y, Math.PI / 2 - 0.72 + shot * (1.44 / (count - 1)), 225 * speedScale, {
          color: COLORS.elite,
          radius: 5,
          kind: "crescent",
          curve: shot % 2 === 0 ? 0.24 : -0.24,
        });
      }
      enemy.fireTimer = 1.2;
    } else if (enemy.fireMode === "snipe") {
      fireAtPlayer(enemy, 0, 1, 420 * speedScale, { kind: "needle", color: COLORS.sniper, radius: 3.8, accel: 22 });
      enemy.fireTimer = 1.05 + Math.random() * 0.22;
    } else if (enemy.fireMode === "burst") {
      fireAtPlayer(enemy, 0.18, 5, 235 * speedScale, { kind: "shell", color: COLORS.bomber, radius: 7.2, pulse: 1 });
      enemy.fireTimer = 1.35 + Math.random() * 0.35;
    } else if (enemy.fireMode === "mine") {
      for (let shot = -1; shot <= 1; shot += 1) {
        addEnemyBullet(enemy.x + shot * 12, enemy.y + enemy.radius * 0.6, Math.PI / 2 + shot * 0.28, 150 * speedScale, {
          kind: "mine",
          color: COLORS.mine,
          radius: 8,
          curve: shot * 0.08,
          pulse: 1,
        });
      }
      enemy.fireTimer = 1.45 + Math.random() * 0.4;
    } else if (enemy.fireMode === "split") {
      fireAtPlayer(enemy, 0.1, 3, 265 * speedScale, { kind: "split", color: COLORS.splitter, radius: 5.6 });
      enemy.fireTimer = 1.2 + Math.random() * 0.28;
    } else if (enemy.fireMode === "strafe") {
      fireAtPlayer(enemy, 0.055, 3, 345 * speedScale, { kind: "needle", color: COLORS.fighter, radius: 3.5, accel: 12 });
      enemy.drift *= -1;
      enemy.fireTimer = 0.82 + Math.random() * 0.18;
    } else if (enemy.fireMode === "rocket") {
      fireAtPlayer(enemy, 0.22, 2, 205 * speedScale, { kind: "shell", color: COLORS.helicopter, radius: 6.8, pulse: 1 });
      addEnemyBullet(enemy.x, enemy.y, Math.PI / 2, 128 * speedScale, {
        kind: "mine",
        color: COLORS.helicopter,
        radius: 7,
        pulse: 1,
      });
      enemy.fireTimer = 1.42 + Math.random() * 0.28;
    } else if (enemy.fireMode === "elite") {
      fireAtPlayer(enemy, 0.16, 3, 280 * speedScale, { kind: "bolt", color: COLORS.elite, radius: 5.4 });
      const count = 8;
      for (let i = 0; i < count; i += 1) {
        addEnemyBullet(enemy.x, enemy.y, ((Math.PI * 2) * i) / count + enemy.phase, 165 * speedScale, {
          color: COLORS.boss,
          radius: 4.6,
          kind: "crescent",
          curve: i % 2 ? 0.18 : -0.18,
        });
      }
      enemy.fireTimer = 0.95 + Math.random() * 0.25;
    } else {
      return false;
    }
    audio?.enemyFire(enemy.type, enemy.x, state.width);
    return true;
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
    audio?.enemyFire("boss", enemy.x, state.width, true);
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
    bossName.textContent = `重装母舰 / 第 ${nextPhase} 阶段`;
    audio?.bossPhase(nextPhase);
    showUpgrade(
      nextPhase === 3 ? "核心暴走 // 最终形态" : "装甲展开 // 第二阶段",
      "首领变形",
    );
    burst(enemy.x, enemy.y, nextPhase === 3 ? COLORS.boss : COLORS.elite, 56, 300, 1.1);
  }

  function burst(x, y, color, count = 10, speed = 150, life = 0.5) {
    const available = Math.max(0, PARTICLE_LIMIT - state.particles.length);
    for (let i = 0; i < Math.min(count, available); i += 1) {
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
      radius: type === "barrier" || type === "ally" || type === "meteor-core" ? 13 : type === "evolution" ? 12 : type === "trajectory" ? 11 : 10,
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
    const previousCores = state.transformCores;
    state.transformCores = Math.min(TRANSFORM_CORE_COST, state.transformCores + 1);
    if (previousCores < TRANSFORM_CORE_COST && state.transformCores === TRANSFORM_CORE_COST) {
      upgradeMessage.classList.remove("is-visible");
      audio?.overdrive?.();
      showUpgrade("按鼠标右键启动 // 不会自动变身", "变身能量已满");
      triggerScreenEffect("transform-ready", COLORS.player, 0.82, 0.72, 0.035);
    } else {
      addFloatingText(state.player.x, state.player.y - 28, `变身能量 ${state.transformCores} / ${TRANSFORM_CORE_COST}`, COLORS.player);
    }
    updateHud();
  }

  function collectEvolutionCore() {
    audio?.pickup("evolution");
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
            apex ? "终极变形" : "战术变形",
          );
          state.transformPulse = 1.35;
          state.shake = apex ? 13 : 9;
          audio?.transform(apex);
          burst(state.player.x, state.player.y, fighter.accent, apex ? 52 : 38, apex ? 310 : 255, 1.05);
        } else {
          showUpgrade(`等级 ${weapon.level} ${weapon.name}`, "武器升级");
          audio?.weaponUpgrade();
          burst(state.player.x, state.player.y, fighter.accent, 34, 245, 0.9);
          state.shake = 7;
        }
      }
    } else {
      state.overdrive = 6;
      audio?.overdrive();
      showUpgrade("极限超载 // 6 秒", "最大火力");
      burst(state.player.x, state.player.y, COLORS.overdrive, 40, 280, 0.95);
    }
    updateHud();
  }

  function collectTrajectoryCore() {
    audio?.pickup("trajectory");
    if (state.trajectoryLevel < 3) {
      state.trajectoryLevel += 1;
      showUpgrade(`弹道增幅 ${state.trajectoryLevel} / 3 // 追加弹体`, "弹道升级");
      burst(state.player.x, state.player.y, COLORS.trajectory, 28, 220, 0.82);
    } else {
      state.overdrive = Math.max(state.overdrive, 3);
      showUpgrade("弹道已满 // 极限火力 3 秒", "弹道转化");
    }
    updateHud();
  }

  function collectShieldCore() {
    audio?.pickup("shield");
    const restored = Math.round(state.maxHealth * 0.18);
    state.health = Math.min(state.maxHealth, state.health + restored);
    state.shieldCharges = Math.min(3, state.shieldCharges + 1);
    showUpgrade(`耐久 +${restored} // 护盾 ${state.shieldCharges} 层`, "护盾球");
    burst(state.player.x, state.player.y, COLORS.shield, 24, 200, 0.78);
    updateHud();
  }

  function collectBarrierCore() {
    audio?.pickup("barrier");
    state.barrierTimer = Math.min(16, state.barrierTimer > 0 ? state.barrierTimer + 5 : BARRIER_DURATION);
    showUpgrade(`机头圆弧屏障 // ${state.barrierTimer.toFixed(0)} 秒全防御`, "大型屏障展开");
    addFloatingText(state.player.x, state.player.y - 92, "前方屏障展开", COLORS.barrier);
    burst(state.player.x, state.player.y - 54, COLORS.barrier, 42, 260, 0.92);
    state.shake = 8;
  }

  function deployAllies() {
    const available = ALLY_MAX_COUNT - state.allies.length;
    const count = Math.min(2, available);
    if (count > 0) {
      for (let index = 0; index < count; index += 1) {
        state.allies.push({
          id: state.nextAllyId++,
          x: state.player.x,
          y: state.player.y + 28,
          radius: 13,
          hp: ALLY_MAX_HEALTH,
          maxHp: ALLY_MAX_HEALTH,
          fireTimer: 0.08 + index * 0.08,
          phase: Math.random() * Math.PI * 2,
        });
      }
    } else {
      state.allies.forEach((ally) => {
        ally.hp = Math.min(ally.maxHp, ally.hp + 24);
      });
    }
    return count;
  }

  function collectAllyCore() {
    audio?.pickup("ally");
    const deployed = deployAllies();
    const message = deployed > 0
      ? `新增 ${deployed} 架 // 单机耐久 ${ALLY_MAX_HEALTH}`
      : "编队已满 // 全体修复 24 耐久";
    showUpgrade(message, "友军支援抵达");
    addFloatingText(state.player.x, state.player.y + 54, `友军 ${state.allies.length} / ${ALLY_MAX_COUNT}`, COLORS.ally);
    burst(state.player.x, state.player.y + 24, COLORS.ally, 36, 230, 0.82);
    state.player.invulnerable = Math.max(state.player.invulnerable, 0.35);
  }

  function collectMeteorCore() {
    audio?.pickup("meteor-core");
    if (state.transformCores < TRANSFORM_CORE_COST) {
      const previousCores = state.transformCores;
      state.transformCores = Math.min(TRANSFORM_CORE_COST, state.transformCores + 1);
      if (previousCores < TRANSFORM_CORE_COST && state.transformCores === TRANSFORM_CORE_COST) {
        triggerScreenEffect("transform-ready", COLORS.player, 0.82, 0.72, 0.035);
      }
      showUpgrade(`变身能量 ${state.transformCores} / ${TRANSFORM_CORE_COST}`, "陨星核心吸收");
      updateHud();
    } else {
      state.meteorPierceTimer = Math.max(state.meteorPierceTimer, 5);
      state.overdrive = Math.max(state.overdrive, 5);
      showUpgrade("弹道贯穿结构与重型目标 // 5 秒", "陨星穿透火力");
      triggerScreenEffect("meteor-core", "#d46a52", 0.72, 0.52);
    }
  }

  function collectPickup(type) {
    if (type === "evolution") collectEvolutionCore();
    else if (type === "trajectory") collectTrajectoryCore();
    else if (type === "shield") collectShieldCore();
    else if (type === "barrier") collectBarrierCore();
    else if (type === "ally") collectAllyCore();
    else if (type === "meteor-core") collectMeteorCore();
    else collectPowerCore();
  }

  function selectAirdropReward() {
    const rewards = ["firepower", "transform", "defense", "wingman", "skyfire"];
    const bias = getBattleMap(state.mapId).airdropBias;
    return Math.random() < 0.55 && rewards.includes(bias)
      ? bias
      : rewards[Math.floor(Math.random() * rewards.length)];
  }

  function spawnSupplyCrate(x, y, reward = selectAirdropReward()) {
    const targetY = Math.max(state.height * 0.34, Math.min(state.height * 0.62, y + 190));
    const escortRadius = Math.max(96, Math.min(132, state.width * 0.16));
    const horizontalMargin = escortRadius + 18;
    state.supplyCrates = [{
      x: Math.max(horizontalMargin, Math.min(state.width - horizontalMargin, x)),
      y,
      radius: 22,
      vy: 92,
      age: 0,
      reward,
      targetY,
      status: "falling",
      escortRadius,
      escortProgress: 0,
      maxHp: 100,
      hp: 100,
      playerInside: false,
    }];
  }

  function getActiveEscortCrate() {
    return state.supplyCrates.find((crate) => crate.status === "escorting") || null;
  }

  function closeAirdropChoice() {
    state.airdropDecision = null;
    airdropChoice.hidden = true;
    gameScreen.classList.remove("is-airdrop-paused");
  }

  function openAirdropChoice(crate, upgraded = false) {
    if (!crate || state.airdropDecision || state.missionPendingId || state.miniMission) return false;
    crate.status = upgraded ? "upgraded" : "deciding";
    state.airdropDecision = { upgraded };
    airdropChoiceTag.textContent = upgraded ? "护送成功 // 高级空投" : "战术空投 // 立即决策";
    airdropChoiceTitle.textContent = upgraded ? "选择高级补给" : "选择补给";
    airdropChoiceRule.textContent = upgraded
      ? "补给箱已安全解锁。选择一项强化奖励，立即返回战斗。"
      : "立即领取一项普通奖励，或者先护送补给箱 6 秒升级奖励。";
    airdropDefenseTitle.textContent = upgraded ? "修复 55% 耐久" : "修复 35% 耐久";
    airdropDefenseDetail.textContent = upgraded ? "护盾增加 2 层" : "护盾增加 1 层";
    airdropFirepowerTitle.textContent = "弹道等级 +1";
    airdropFirepowerDetail.textContent = upgraded ? "火力强化 20 秒并召唤精英僚机" : "射速与弹量强化 20 秒";
    airdropEscort.hidden = upgraded;
    airdropChoice.hidden = false;
    airdropProgress.hidden = true;
    gameScreen.classList.add("is-airdrop-paused");
    audio?.airdropDecision?.(upgraded);
    requestAnimationFrame(() => airdropDefense.focus());
    return true;
  }

  function applyTacticalAirdropReward(choice, upgraded) {
    const reward = airdropRewardSpec(choice, upgraded);
    if (reward.choice === "defense") {
      const restored = Math.round(state.maxHealth * reward.healthRatio);
      state.health = Math.min(state.maxHealth, state.health + restored);
      state.shieldCharges = Math.min(3, state.shieldCharges + reward.shieldCharges);
      showUpgrade(
        `耐久 +${restored} // 护盾 ${state.shieldCharges} 层`,
        upgraded ? "高级生存补给" : "生存补给",
      );
    } else {
      state.trajectoryLevel = Math.min(4, state.trajectoryLevel + reward.trajectoryLevels);
      state.firepowerTimer = Math.max(state.firepowerTimer, reward.firepowerDuration);
      state.overdrive = Math.max(state.overdrive, 6);
      if (reward.wingmen) {
        deployAllies();
        state.wingmanCooldown = 0;
        state.wingmanTimer = Math.max(state.wingmanTimer, wingmanSpec(state.fighterId).duration);
        updateWingmanPositions();
      }
      showUpgrade(
        reward.wingmen
          ? `弹道 +${state.trajectoryLevel} // 火力 20 秒 // 精英僚机抵达`
          : `弹道 +${state.trajectoryLevel} // 射速与弹量强化 20 秒`,
        upgraded ? "高级火力超载" : "火力超载",
      );
    }
    audio?.supplyCollected?.(reward.choice);
    triggerScreenEffect("tactical-supply", reward.choice === "defense" ? COLORS.ally : COLORS.overdrive, upgraded ? 1.15 : 0.9, 0.72, 0.045);
    state.player.invulnerable = Math.max(state.player.invulnerable, 0.7);
    updateHud();
  }

  function chooseTacticalAirdrop(choice) {
    if (!state.airdropDecision || !["defense", "firepower"].includes(choice)) return false;
    const upgraded = state.airdropDecision.upgraded;
    state.supplyCrates = [];
    closeAirdropChoice();
    applyTacticalAirdropReward(choice, upgraded);
    showWave(upgraded ? "高级补给已装载" : "战术补给已装载");
    return true;
  }

  function spawnAirdropEscortAttackers() {
    const slots = state.width < 620 ? [-0.22, 0.22] : [-0.3, 0, 0.3];
    slots.forEach((offset, index) => {
      const type = index === 1 && slots.length === 3 ? "fighter" : "gunner";
      const enemy = makeEnemy(type, state.width * (0.5 + offset));
      enemy.y = -40 - index * 28;
      enemy.fireTimer = 0.35 + index * 0.12;
      state.enemies.push(enemy);
    });
  }

  function startAirdropEscort() {
    const crate = state.supplyCrates[0];
    if (!crate || !state.airdropDecision || state.airdropDecision.upgraded) return false;
    closeAirdropChoice();
    crate.status = "escorting";
    crate.escortProgress = 0;
    crate.hp = crate.maxHp;
    crate.playerInside = false;
    airdropProgress.hidden = false;
    state.player.invulnerable = Math.max(state.player.invulnerable, 0.7);
    state.spawnTimer = Math.min(state.spawnTimer, 0.45);
    spawnAirdropEscortAttackers();
    showWave("护送开始 // 坚持 6 秒");
    showUpgrade("留在绿色范围内 // 敌机会攻击补给箱", "战术空投护送");
    audio?.airdropEscortStart?.();
    return true;
  }

  function failAirdropEscort(crate) {
    const index = state.supplyCrates.indexOf(crate);
    if (index >= 0) state.supplyCrates.splice(index, 1);
    state.airdropEscortsFailed += 1;
    airdropProgress.hidden = true;
    state.airdropTimer = Math.max(state.airdropTimer, 28);
    burst(crate.x, crate.y, COLORS.enemy, 34, 230, 0.8);
    addFloatingText(crate.x, crate.y - 24, "补给失效", COLORS.enemy);
    showUpgrade("补给箱被摧毁 // 继续作战", "护送失败");
    showWave("战术空投失效");
    audio?.airdropLost?.();
    triggerScreenEffect("airdrop-lost", COLORS.enemy, 0.82, 0.65, 0.035);
  }

  function damageAirdropCrate(crate, damage, x = crate.x, y = crate.y) {
    if (!crate || crate.status !== "escorting") return false;
    crate.hp = Math.max(0, crate.hp - damage);
    burst(x, y, COLORS.ally, 7, 105, 0.28);
    audio?.structureImpact?.();
    if (crate.hp <= 0) failAirdropEscort(crate);
    return true;
  }

  function collectSupplyReward(reward) {
    audio?.supplyCollected?.(reward);
    if (reward === "firepower") {
      state.firepowerTimer = 6;
      state.overdrive = Math.max(state.overdrive, 6);
      state.weaponLevel = Math.min(WEAPONS.length, state.weaponLevel + 1);
      state.trajectoryLevel = Math.min(4, state.trajectoryLevel + 1);
      showUpgrade("射速、弹量与弹道等级提升 // 6 秒", "极限火力空投");
    } else if (reward === "transform") {
      state.transformCores = TRANSFORM_CORE_COST;
      showUpgrade("能量球已补满 // 手动右键启动", "变身核心空投");
    } else if (reward === "defense") {
      state.health = Math.min(state.maxHealth, state.health + Math.round(state.maxHealth * 0.3));
      state.barrierTimer = Math.max(state.barrierTimer, 8);
      showUpgrade("恢复 30% 耐久 // 屏障 8 秒", "防御空投");
    } else if (reward === "wingman") {
      deployAllies();
      state.wingmanCooldown = 0;
      state.wingmanTimer = Math.max(state.wingmanTimer, 6);
      updateWingmanPositions();
      showUpgrade("精英友军加入 // 僚机冷却归零", "协同空投");
    } else {
      state.enemyBullets = [];
      for (let index = state.enemies.length - 1; index >= 0; index -= 1) {
        const enemy = state.enemies[index];
        enemy.hp -= enemy.type === "boss" ? 32 : 90;
        if (enemy.hp <= 0) killEnemy(index);
      }
      startScreenLaser();
      showUpgrade("清除敌弹 // 战区目标高伤", "天火空投");
    }
    triggerScreenEffect("supply", COLORS.overdrive, 0.9, 0.7, 0.045);
    updateHud();
  }

  function damagePlayer(x, y) {
    if (state.player.invulnerable > 0 || state.ended) return;

    if (state.barrierTimer > 0) {
      state.player.invulnerable = 0.12;
      state.barrierHits += 1;
      state.shake = 4;
      clearEnemyBulletsAround(state.player.x, state.player.y - 28, 92);
      burst(x, y, COLORS.barrier, 14, 150, 0.38);
      addFloatingText(x, y, "屏障抵消", COLORS.barrier);
      audio?.barrierImpact?.(x, state.width);
      return;
    }

    const fighter = getFighter();
    if (state.transformProgress > 0.78) {
      state.player.invulnerable = 0.72;
      state.shake = 10;
      state.impactFlash = 0.12;
      const absorbed = clearEnemyBulletsAround(state.player.x, state.player.y, 96);
      if (fighter.id === "su57") {
        const chargeGain = 18 + absorbed * 5;
        const cap = 100 + state.passivePower * 80;
        state.revengeCharge = Math.min(cap, state.revengeCharge + chargeGain);
        addFloatingText(x, y - 20, `反击能量 +${Math.round(chargeGain)}`, fighter.secondary);
        audio?.passive?.("revenge");
      }
      burst(x, y, getFighter().accent, 28, 240, 0.68);
      addFloatingText(x, y, "装甲吸收", getFighter().accent);
      audio?.armorAbsorb?.();
      updateHud();
      return;
    }

    if (state.shieldCharges > 0) {
      state.shieldCharges -= 1;
      state.player.invulnerable = 0.82;
      state.shake = 8;
      state.impactFlash = 0.1;
      clearEnemyBulletsAround(state.player.x, state.player.y, 82);
      burst(x, y, COLORS.shield, 26, 225, 0.68);
      addFloatingText(x, y, `护盾吸收 // 剩余 ${state.shieldCharges}`, COLORS.shield);
      audio?.armorAbsorb?.();
      updateHud();
      return;
    }

    burst(x, y, COLORS.enemy, 22, 220, 0.75);
    audio?.playerHit();
    const damage = Math.max(14, Math.round(32 - fighter.stats.armor * 0.14));
    state.health = Math.max(0, state.health - damage);
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

    if (state.health <= 0) endGame();
  }

  function killEnemy(index) {
    const enemy = state.enemies[index];
    if (!enemy) return;

    const previousCombo = state.combo;
    const gainedScore = enemy.score * state.combo;
    state.enemies.splice(index, 1);
    state.kills += 1;
    state.score += gainedScore;
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
      showUpgrade("狂热模式 // 火力提升", "连击反应");
      addFloatingText(state.width / 2, state.height * 0.42, "狂热 ×8", COLORS.overdrive);
      state.shake = 10;
    }

    if (enemy.type === "carrier") {
      state.activeAirdropId = null;
      spawnSupplyCrate(enemy.x, enemy.y);
      state.airdropTimer = 35 + Math.random() * 15;
      showUpgrade("大型补给箱已投放 // 接近即可拾取", "运输机击落");
      addFloatingText(enemy.x, enemy.y, "特殊空投", COLORS.ally);
      audio?.airdropDestroyed?.();
      triggerScreenEffect("airdrop-down", COLORS.ally, 1, 0.68, 0.05);
    } else if (enemy.type === "boss") {
      state.bossKills += 1;
      bossHud.hidden = true;
      state.enemyBullets = [];
      [
        ["barrier", -90],
        ["core", -54],
        ["evolution", -18],
        ["trajectory", 18],
        ["shield", 54],
        ["ally", 90],
      ].forEach(([type, offset]) => spawnPickup(enemy.x + offset, enemy.y, type));
      state.transformCores = TRANSFORM_CORE_COST;
      state.wingmanCooldown = 0;
      state.overdrive = Math.max(state.overdrive, 6);
      state.health = Math.min(state.maxHealth, state.health + Math.round(state.maxHealth * 0.24));
      state.shieldCharges = Math.min(3, state.shieldCharges + 1);
      state.player.invulnerable = Math.max(state.player.invulnerable, 1.2);
      showUpgrade(`${TRANSFORM_CORE_COST} 球已满 · 僚机就绪 · 极限火力 6 秒`, "王牌补给");
      addFloatingText(state.width / 2, state.height * 0.38, "王牌补给", COLORS.overdrive);
      audio?.supplyDrop?.();
      triggerScreenEffect("boss-kill", COLORS.overdrive, 1.25, 1, 0.07);
      updateHud();
    } else {
      if (enemy.type === "splitter") {
        [-1, 0, 1].forEach((slot) => {
          const child = makeEnemy("scout", Math.max(20, Math.min(state.width - 20, enemy.x + slot * 28)));
          child.y = enemy.y + 10 + Math.abs(slot) * 8;
          child.hp = 1;
          child.maxHp = 1;
          child.speed *= 1.24;
          child.drift += slot * 70;
          state.enemies.push(child);
        });
        for (let shot = 0; shot < 8; shot += 1) {
          addEnemyBullet(enemy.x, enemy.y, (Math.PI * 2 * shot) / 8, 210 + state.wave * 3, {
            kind: "crescent",
            color: COLORS.splitter,
            radius: 4.5,
          });
        }
      }
      const coreCadence = state.elapsed < 35 ? 5 : 9;
      const coreEligible = enemy.type === "elite" || enemy.type === "bomber" || state.kills % coreCadence === 0 || Math.random() < 0.035;
      if (state.coreDropCooldown <= 0 && coreEligible) {
        spawnPickup(enemy.x, enemy.y, "core");
        state.coreDropCooldown = state.elapsed < 35 ? 5 + Math.random() * 2 : 8 + Math.random() * 4;
      }
      if (state.elapsed >= 12 && state.kills % 6 === 0) spawnPickup(enemy.x + 14, enemy.y, "evolution");
      if (state.elapsed >= 15 && state.kills % 8 === 0) spawnPickup(enemy.x - 14, enemy.y, "trajectory");
      if (state.elapsed >= 18 && state.kills % 12 === 0) spawnPickup(enemy.x + 22, enemy.y, "barrier");
      if (state.elapsed >= 24 && state.kills % 18 === 0) spawnPickup(enemy.x - 22, enemy.y, "ally");
      if ((state.health < state.maxHealth || state.shieldCharges < 3) && Math.random() < 0.065) {
        spawnPickup(enemy.x, enemy.y, "shield");
      }
    }

    updateHud();
  }

  function endGame() {
    state.running = false;
    state.ended = true;
    state.airdropDecision = null;
    airdropChoice.hidden = true;
    airdropProgress.hidden = true;
    gameScreen.classList.remove("is-airdrop-paused");
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
    const fighter = getFighter();
    let nearest = null;
    let bestScore = Infinity;
    for (const enemy of state.enemies) {
      if (enemy.y > bullet.y + 36) continue;
      const dx = enemy.x - bullet.x;
      const dy = enemy.y - bullet.y;
      const distance = dx * dx + dy * dy;
      const priority = (fighter.id === "j20" || fighter.id === "faxx") && (bullet.type === "seeker" || bullet.type === "drone")
        ? enemy.type === "boss" ? 0.18 : enemy.type === "elite" ? 0.38 : enemy.type === "gunner" ? 0.72 : 1
        : 1;
      const score = distance * priority;
      if (score < bestScore) {
        nearest = enemy;
        bestScore = score;
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
      } else if (bullet.type === "seeker" || bullet.type === "drone") {
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

      const structure = state.mapStructures.find((item) => pointInsideStructure(bullet.x, bullet.y, item, bullet.radius * 0.45));
      if (structure) {
        const structureMultiplier = bullet.type === "rail" ? 4.2 : bullet.type === "heavy" ? 2 : bullet.type === "laser" ? 1.45 : state.meteorPierceTimer > 0 ? 1.1 : 0;
        if (structureMultiplier > 0) damageStructure(structure, bullet.damage * structureMultiplier, bullet.x, bullet.y, `${bullet.type === "heavy" ? "重炮" : bullet.type === "rail" ? "轨炮" : "贯穿火力"}破墙`);
        state.bullets.splice(i, 1);
        continue;
      }

      if (bullet.y < -50 || bullet.x < -70 || bullet.x > state.width + 70) {
        state.bullets.splice(i, 1);
      }
    }
  }

  function insideBarrierArc(object) {
    if (state.barrierTimer <= 0) return false;
    const dx = object.x - state.player.x;
    const dy = object.y - (state.player.y - 8);
    const radius = 92 + (object.radius || 0);
    return dy <= 20 && dy >= -112 && dx * dx + dy * dy <= radius * radius;
  }

  function damageAlly(ally, damage, x = ally.x, y = ally.y) {
    ally.hp = Math.max(0, ally.hp - damage);
    burst(x, y, ally.hp > 0 ? COLORS.ally : COLORS.enemy, ally.hp > 0 ? 10 : 28, ally.hp > 0 ? 120 : 220, ally.hp > 0 ? 0.3 : 0.72);
    if (ally.hp <= 0) {
      const index = state.allies.indexOf(ally);
      if (index >= 0) state.allies.splice(index, 1);
      addFloatingText(x, y, "友军被击毁", COLORS.enemy);
      audio?.allyLost?.(x, state.width);
    }
  }

  function updateAllies(dt) {
    const offsets = [
      [-62, 28],
      [62, 28],
      [-94, 62],
      [94, 62],
    ];
    state.allies.forEach((ally, index) => {
      const [offsetX, offsetY] = offsets[index] || [0, 54];
      const targetX = Math.max(22, Math.min(state.width - 22, state.player.x + offsetX));
      const targetY = Math.max(60, Math.min(state.height - 72, state.player.y + offsetY + Math.sin(state.elapsed * 3.2 + ally.phase) * 5));
      const follow = 1 - Math.pow(0.0018, dt);
      ally.x += (targetX - ally.x) * follow;
      ally.y += (targetY - ally.y) * follow;
      ally.fireTimer -= dt;
      if (ally.fireTimer <= 0 && state.elapsed >= 15) {
        const target = state.enemies.reduce((nearest, enemy) => {
          if (!nearest) return enemy;
          return Math.hypot(enemy.x - ally.x, enemy.y - ally.y) < Math.hypot(nearest.x - ally.x, nearest.y - ally.y)
            ? enemy
            : nearest;
        }, null);
        const angle = target
          ? Math.max(-0.42, Math.min(0.42, Math.atan2(target.x - ally.x, ally.y - target.y)))
          : 0;
        addPlayerBullet(ally.x, ally.y - 15, angle, 920, "pulse", 0.82, {
          source: "ally",
          color: COLORS.ally,
          radius: 3.8,
        });
        audio?.allyFire?.(ally.x, state.width);
        ally.fireTimer = 0.28 + index * 0.025;
      }
    });
  }

  function updateEnemies(dt) {
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      enemy.laserBurnTimer = Math.max(0, (enemy.laserBurnTimer || 0) - dt);
      if (enemy.laserBurnTimer === 0) enemy.laserBurn = 0;

      if (enemy.type === "carrier") {
        enemy.x += enemy.vx * dt;
        enemy.y += Math.sin(state.elapsed * 2.4 + enemy.phase) * 10 * dt;
        enemy.rotation = Math.sin(state.elapsed * 1.4) * 0.05;
        const escaped = enemy.escapeSide === "right" ? enemy.x > state.width + 70 : enemy.x < -70;
        if (escaped) {
          state.activeAirdropId = null;
          state.airdropTimer = 18 + Math.random() * 10;
          state.enemies.splice(i, 1);
          showUpgrade("运输机已离开战区", "空投错失");
          continue;
        }
      } else if (enemy.type === "boss") {
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

        const canFire = state.elapsed >= 5 && (state.elapsed >= 15 || enemy.type === "gunner");
        if (enemy.y > 42 && enemy.fireTimer <= 0 && canFire) fireEnemyPattern(enemy);
      }

      if (enemy.type !== "boss" && enemy.type !== "carrier" && state.mapStructures.some((structure) => circleIntersectsStructure(enemy, structure, 5))) {
        burst(enemy.x, enemy.y, COLORS.enemy, 8, 120, 0.32);
        state.enemies.splice(i, 1);
        continue;
      }

      if (enemy.type !== "boss" && enemy.type !== "carrier" && enemy.y - enemy.radius > state.height) {
        state.enemies.splice(i, 1);
        state.combo = 1;
        state.comboTimer = 0;
        updateHud();
        continue;
      }

      if (insideBarrierArc(enemy)) {
        burst(enemy.x, enemy.y, COLORS.barrier, 18, 170, 0.45);
        if (enemy.type === "boss") {
          enemy.hp -= 0.8;
          enemy.y = Math.max(enemy.targetY, enemy.y - 8);
        } else {
          state.enemies.splice(i, 1);
          state.score += Math.round(enemy.score * 0.35);
        }
        state.barrierHits += 1;
        audio?.barrierImpact?.(enemy.x, state.width);
        continue;
      }

      const ally = state.allies.find((unit) => circlesOverlap(enemy, unit));
      if (ally) {
        damageAlly(ally, enemy.type === "boss" ? 28 : 18, enemy.x, enemy.y);
        if (enemy.type !== "boss") state.enemies.splice(i, 1);
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
      if (!bullet) continue;
      bullet.age += dt;
      if (bullet.curve) {
        const angle = bullet.curve * dt;
        const vx = bullet.vx * Math.cos(angle) - bullet.vy * Math.sin(angle);
        const vy = bullet.vx * Math.sin(angle) + bullet.vy * Math.cos(angle);
        bullet.vx = vx;
        bullet.vy = vy;
      }
      if (bullet.accel) {
        const length = Math.hypot(bullet.vx, bullet.vy) || 1;
        bullet.vx += (bullet.vx / length) * bullet.accel * dt;
        bullet.vy += (bullet.vy / length) * bullet.accel * dt;
      }
      if (bullet.kind === "mine" && bullet.age > 0.85) {
        for (let shot = 0; shot < 8; shot += 1) {
          addEnemyBullet(bullet.x, bullet.y, (Math.PI * 2 * shot) / 8 + state.elapsed * 0.35, 185 + state.wave * 3, {
            kind: "crescent",
            color: COLORS.mine,
            radius: 4.4,
            curve: shot % 2 ? 0.2 : -0.2,
          });
        }
        burst(bullet.x, bullet.y, COLORS.mine, 14, 120, 0.34);
        state.enemyBullets.splice(i, 1);
        continue;
      }
      if (bullet.kind === "split" && !bullet.splitDone && bullet.age > 0.62) {
        bullet.splitDone = true;
        const base = Math.atan2(bullet.vy, bullet.vx);
        [-0.42, 0.42].forEach((offset) => {
          addEnemyBullet(bullet.x, bullet.y, base + offset, 250 + state.wave * 4, {
            kind: "bolt",
            color: COLORS.splitter,
            radius: 4.2,
          });
        });
      }
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;

      if (state.mapStructures.some((structure) => pointInsideStructure(bullet.x, bullet.y, structure, bullet.radius * 0.4))) {
        state.enemyBullets.splice(i, 1);
        continue;
      }

      if (bullet.y > state.height + 30 || bullet.y < -30 || bullet.x < -30 || bullet.x > state.width + 30) {
        state.enemyBullets.splice(i, 1);
        continue;
      }

      if (insideBarrierArc(bullet)) {
        state.enemyBullets.splice(i, 1);
        state.barrierHits += 1;
        burst(bullet.x, bullet.y, COLORS.barrier, 6, 90, 0.24);
        audio?.barrierImpact?.(bullet.x, state.width);
        continue;
      }

      const ally = state.allies.find((unit) => circlesOverlap(bullet, unit));
      if (ally) {
        state.enemyBullets.splice(i, 1);
        damageAlly(ally, bullet.kind === "shell" || bullet.kind === "mine" ? 16 : 10, bullet.x, bullet.y);
        continue;
      }

      const escortCrate = getActiveEscortCrate();
      if (escortCrate && circlesOverlap(bullet, { ...escortCrate, radius: escortCrate.radius + 5 })) {
        state.enemyBullets.splice(i, 1);
        damageAirdropCrate(escortCrate, bullet.kind === "shell" || bullet.kind === "mine" ? 16 : 10, bullet.x, bullet.y);
        continue;
      }

      if (circlesOverlap(bullet, state.player)) {
        state.enemyBullets.splice(i, 1);
        damagePlayer(bullet.x, bullet.y);
      } else if (getFighter().id === "gripen" && !bullet.grazed) {
        const distance = Math.hypot(bullet.x - state.player.x, bullet.y - state.player.y);
        const grazeRadius = state.player.radius + bullet.radius + 38;
        if (distance < grazeRadius) {
          bullet.grazed = true;
          state.grazeCount += 1;
          state.overclockStacks = Math.min(10 + Math.round(state.passivePower * 5), state.overclockStacks + 1);
          state.overclockTimer = 2.6;
          addFloatingText(state.player.x, state.player.y - 28, "擦弹 // 超频", getFighter().accent);
          audio?.passive?.("graze");
        }
      }
    }
  }

  function damageArea(x, y, radius, damage, ignoredEnemy = null) {
    for (const target of state.enemies) {
      if (target === ignoredEnemy) continue;
      if (Math.hypot(target.x - x, target.y - y) <= radius + target.radius) {
        target.hp -= target.type === "boss" ? damage * 0.42 : damage;
      }
    }
  }

  function resolveBulletHits() {
    for (let bulletIndex = state.bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
      const bullet = state.bullets[bulletIndex];
      let removeBullet = false;

      for (const meteor of state.meteors.slice()) {
        if (bullet.hitTargets.has(meteor.id) || !circlesOverlap(bullet, meteor)) continue;
        bullet.hitTargets.add(meteor.id);
        const canBreakLarge = bullet.type === "rail" || bullet.type === "heavy" || bullet.type === "laser" || bullet.tactical || state.meteorPierceTimer > 0;
        if (!meteor.large || canBreakLarge) {
          const multiplier = bullet.type === "rail" ? 3.2 : bullet.type === "heavy" ? 2.6 : bullet.type === "laser" ? 2.2 : 1;
          damageMeteor(meteor, bullet.damage * multiplier, bullet.color);
        } else {
          burst(bullet.x, bullet.y, "#ad5948", 4, 80, 0.2);
        }
        if (bullet.pierceLeft > 0 || state.meteorPierceTimer > 0) bullet.pierceLeft = Math.max(0, bullet.pierceLeft - 1);
        else removeBullet = true;
        break;
      }

      if (removeBullet) {
        state.bullets.splice(bulletIndex, 1);
        continue;
      }

      for (let enemyIndex = state.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
        const enemy = state.enemies[enemyIndex];
        if (bullet.hitTargets.has(enemy.id)) continue;
        if (!circlesOverlap(bullet, enemy)) continue;

        bullet.hitTargets.add(enemy.id);
        let appliedDamage = bullet.damage;
        if (getFighter().id === "typhoon" && bullet.type === "rail") {
          state.railChain = Math.min(20, state.railChain + 1);
          state.railChainTimer = 1.4;
          appliedDamage *= 1 + Math.min(0.55, state.railChain * 0.045 + state.passivePower * 0.22);
        }
        if ((getFighter().id === "f22" || getFighter().id === "j35") && bullet.type === "seeker") {
          enemy.marked = true;
          appliedDamage *= enemy.type === "boss" ? 1.08 : 1.16 + state.passivePower * 0.2;
          audio?.passive?.("mark");
        }
        if (enemy.type === "boss" && enemy.parts) {
          const relativeX = bullet.x - enemy.x;
          const partKey = relativeX < -34 ? "left" : relativeX > 34 ? "right" : null;
          const part = partKey ? enemy.parts[partKey] : null;
          if (part && !part.destroyed) {
            part.hp -= bullet.damage;
            appliedDamage *= 0.46;
            destroyBossPart(enemy, partKey, bullet.x, bullet.y);
          }
        }
        enemy.hp -= appliedDamage;
        if (getFighter().id === "rafale" && bullet.type === "wave") {
          enemy.resonance = (enemy.resonance || 0) + 1;
          const threshold = Math.max(2, 4 - Math.floor(state.passivePower * 2));
          if (enemy.resonance >= threshold) {
            enemy.resonance = 0;
            state.resonanceBursts += 1;
            const radius = 78 * state.waveRangeMultiplier;
            damageArea(enemy.x, enemy.y, radius, bullet.damage * (1.6 + state.passivePower), enemy);
            burst(enemy.x, enemy.y, getFighter().accent, 30, 260, 0.72);
            addFloatingText(enemy.x, enemy.y, "共振爆发", getFighter().secondary);
            audio?.passive?.("resonance");
          }
        }
        if (bullet.type === "heavy") {
          const radius = 52 * state.heavyRangeMultiplier;
          damageArea(bullet.x, bullet.y, radius, bullet.damage * 0.44, enemy);
          burst(bullet.x, bullet.y, bullet.color, 12, 170, 0.42);
        }
        burst(bullet.x, bullet.y, bullet.color, 4, 90, 0.24);

        if (enemy.type === "boss") {
          bossProgress.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
        }

        if (bullet.pierceLeft > 0) {
          bullet.pierceLeft -= 1;
        } else {
          removeBullet = true;
          break;
        }
      }

      if (removeBullet) state.bullets.splice(bulletIndex, 1);
    }

    for (let enemyIndex = state.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
      if (state.enemies[enemyIndex].hp <= 0) killEnemy(enemyIndex);
    }
  }

  function updatePickups(dt) {
    const fighter = getFighter();
    const magnetRadius = fighter.pickupRadius;
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
        collectPickup(pickup.type);
      }
    }
  }

  function spawnMeteorWarning(options = {}) {
    const large = options.large ?? (Math.random() < (state.mapId === "meteor-rift" ? 0.42 : 0.22));
    const radius = large ? 34 : 20;
    const x = Number.isFinite(options.x) ? options.x : radius + Math.random() * Math.max(1, state.width - radius * 2);
    const y = Number.isFinite(options.y) ? options.y : Math.max(130, state.height * (0.22 + Math.random() * 0.42));
    state.meteorWarnings.push({ x, y, radius, large, life: 1.2, maxLife: 1.2 });
    audio?.meteorWarning?.(large);
    return { x, y, large };
  }

  function launchMeteor(warning) {
    const radius = warning.radius;
    const startX = Math.max(radius, Math.min(state.width - radius, warning.x + (Math.random() - 0.5) * 180));
    const startY = -radius * 2;
    const flightTime = warning.large ? 0.92 : 0.72;
    state.meteors.push({
      id: `meteor-${state.elapsed}-${Math.random()}`,
      x: startX,
      y: startY,
      targetX: warning.x,
      targetY: warning.y,
      vx: (warning.x - startX) / flightTime,
      vy: (warning.y - startY) / flightTime,
      radius,
      large: warning.large,
      hp: warning.large ? 34 : 8,
      maxHp: warning.large ? 34 : 8,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 4,
      destroyed: false,
    });
  }

  function damageMeteor(meteor, amount, color = COLORS.trajectory) {
    if (!meteor || meteor.destroyed) return false;
    meteor.hp -= amount;
    if (Math.random() < 0.45) burst(meteor.x, meteor.y, color, 3, 95, 0.24);
    if (meteor.hp > 0) return false;
    meteor.destroyed = true;
    const index = state.meteors.indexOf(meteor);
    if (index >= 0) state.meteors.splice(index, 1);
    state.score += meteor.large ? 1200 : 420;
    if (meteor.large) spawnPickup(meteor.x, meteor.y, "meteor-core");
    burst(meteor.x, meteor.y, "#c95f48", meteor.large ? 44 : 24, 260, 0.9);
    addFloatingText(meteor.x, meteor.y, meteor.large ? "陨星核心掉落" : "+420", "#c95f48");
    audio?.meteorBreak?.(meteor.large);
    triggerScreenEffect("meteor-break", "#c95f48", meteor.large ? 0.9 : 0.45, 0.58, meteor.large ? 0.04 : 0);
    return true;
  }

  function impactMeteor(meteor) {
    if (!meteor || meteor.destroyed) return;
    meteor.destroyed = true;
    state.meteorImpacts += 1;
    const radius = meteor.large ? 112 : 72;
    if (Math.hypot(state.player.x - meteor.x, state.player.y - meteor.y) <= radius + state.player.radius) {
      damagePlayer(meteor.x, meteor.y);
    }
    for (let index = state.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = state.enemies[index];
      if (Math.hypot(enemy.x - meteor.x, enemy.y - meteor.y) > radius + enemy.radius) continue;
      enemy.hp -= enemy.type === "boss" ? (meteor.large ? 42 : 18) : (meteor.large ? 90 : 32);
      if (enemy.hp <= 0) killEnemy(index);
    }
    state.mapStructures.forEach((structure) => {
      const closestX = Math.max(structure.x, Math.min(structure.x + structure.width, meteor.x));
      const closestY = Math.max(structure.y, Math.min(structure.y + structure.height, meteor.y));
      if (Math.hypot(closestX - meteor.x, closestY - meteor.y) <= radius) {
        damageStructure(structure, meteor.large ? 42 : 14, closestX, closestY, "陨石冲击");
      }
    });
    state.enemyBullets = state.enemyBullets.filter((bullet) => Math.hypot(bullet.x - meteor.x, bullet.y - meteor.y) > radius);
    state.shake = Math.max(state.shake, meteor.large ? 20 : 12);
    burst(meteor.x, meteor.y, "#a94f40", meteor.large ? 62 : 34, 310, 1.05);
    audio?.meteorImpact?.(meteor.large);
    triggerScreenEffect("meteor-impact", "#a94f40", meteor.large ? 1.15 : 0.7, 0.72, meteor.large ? 0.06 : 0.03);
  }

  function updateMeteors(dt, bossAlive) {
    state.meteorTimer -= dt;
    if (!bossAlive && state.meteorTimer <= 0) {
      spawnMeteorWarning();
      const base = state.mapId === "meteor-rift" ? 7 : 20;
      state.meteorTimer = base + Math.random() * (state.mapId === "meteor-rift" ? 5 : 10);
    }
    for (let index = state.meteorWarnings.length - 1; index >= 0; index -= 1) {
      const warning = state.meteorWarnings[index];
      warning.life -= dt;
      if (warning.life <= 0) {
        state.meteorWarnings.splice(index, 1);
        launchMeteor(warning);
      }
    }
    for (let index = state.meteors.length - 1; index >= 0; index -= 1) {
      const meteor = state.meteors[index];
      meteor.x += meteor.vx * dt;
      meteor.y += meteor.vy * dt;
      meteor.rotation += meteor.spin * dt;
      const structure = state.mapStructures.find((item) => circleIntersectsStructure(meteor, item, 2));
      if (structure || meteor.y >= meteor.targetY) {
        state.meteors.splice(index, 1);
        impactMeteor(meteor);
      }
    }
  }

  function updateSupplyCrates(dt) {
    for (let index = state.supplyCrates.length - 1; index >= 0; index -= 1) {
      const crate = state.supplyCrates[index];
      crate.age += dt;
      if (crate.status === "falling") {
        crate.y = Math.min(crate.targetY, crate.y + crate.vy * dt);
        crate.x += Math.sin(crate.age * 2.8) * 12 * dt;
        if (crate.y >= crate.targetY) {
          crate.status = "ready";
          crate.vy = 0;
          showWave("战术空投已就位");
          showUpgrade("接近补给箱 // 立即选择或护送升级", "战术空投");
          audio?.airdropLanded?.();
        }
      }

      if (crate.status === "ready") {
        const distance = Math.hypot(state.player.x - crate.x, state.player.y - crate.y);
        if (distance <= crate.escortRadius * 0.72) openAirdropChoice(crate, false);
      } else if (crate.status === "escorting") {
        const distance = Math.hypot(state.player.x - crate.x, state.player.y - crate.y);
        crate.playerInside = distance <= crate.escortRadius;
        if (crate.playerInside) crate.escortProgress = Math.min(AIRDROP_ESCORT_DURATION, crate.escortProgress + dt);
        updateAirdropProgress(crate);
        if (crate.escortProgress >= AIRDROP_ESCORT_DURATION) {
          crate.status = "upgraded";
          state.airdropEscortsCompleted += 1;
          airdropProgress.hidden = true;
          state.enemyBullets = state.enemyBullets.filter((bullet) => Math.hypot(bullet.x - crate.x, bullet.y - crate.y) > 180);
          state.player.invulnerable = Math.max(state.player.invulnerable, 0.9);
          showWave("护送成功 // 高级补给解锁");
          addFloatingText(crate.x, crate.y - 32, "高级空投", COLORS.overdrive);
          burst(crate.x, crate.y, COLORS.overdrive, 42, 230, 0.85);
          triggerScreenEffect("airdrop-upgraded", COLORS.overdrive, 1.1, 0.76, 0.045);
          audio?.airdropEscortComplete?.();
          openAirdropChoice(crate, true);
        }
      }
    }
  }

  function updateAirdropProgress(crate) {
    const progress = Math.min(1, crate.escortProgress / AIRDROP_ESCORT_DURATION);
    const integrity = Math.max(0, crate.hp / crate.maxHp);
    airdropProgressStatus.textContent = crate.playerInside ? "护送有效 // 敌机来袭" : "返回绿色护送范围";
    airdropProgressBar.style.width = `${progress * 100}%`;
    airdropProgressValue.textContent = `${crate.escortProgress.toFixed(1)} / ${AIRDROP_ESCORT_DURATION.toFixed(1)} 秒`;
    airdropIntegrityBar.style.width = `${integrity * 100}%`;
    airdropIntegrityValue.textContent = `补给完整度 ${Math.ceil(integrity * 100)}%`;
  }

  function updateAirdrops(dt, bossAlive) {
    if (bossAlive) return;
    if (!state.activeAirdropId && !state.supplyCrates.length) state.airdropTimer -= dt;
    if (state.airdropTimer <= 0 && spawnAirdropCarrier()) state.airdropTimer = 45;
  }

  function triggerMapEvent() {
    const map = getBattleMap(state.mapId);
    if (map.event === "lightning") {
      state.enemyBullets = state.enemyBullets.filter((_, index) => index % 3 !== 0);
      state.enemies.forEach((enemy) => { enemy.hp -= enemy.type === "boss" ? 2 : 5; });
      showUpgrade("雷暴链清除部分敌弹", "地图事件");
    } else if (map.event === "aurora") {
      state.enemyBullets.forEach((bullet) => { bullet.vx *= 0.48; bullet.vy *= 0.48; });
      showUpgrade("敌方弹道减速", "极光冻结");
    } else if (map.event === "phase") {
      state.mapStructures.filter((structure) => structure.kind === "gate").forEach((structure) => { structure.forcedOpen = 3; });
      showUpgrade("能源门全部开放 // 3 秒", "相位窗口");
    } else if (map.event === "meteor") {
      spawnMeteorWarning({ large: true });
      showUpgrade("大型陨石进入轨道", "陨星风暴");
    } else {
      state.airdropTimer = Math.min(state.airdropTimer, 8);
      showUpgrade("友军空投航线已建立", "雷达支援");
    }
    audio?.mapEvent?.(map.event);
    triggerScreenEffect("map-event", map.accent, 0.55, 0.48);
  }

  function updateMapEvents(dt, bossAlive) {
    state.mapEventTimer -= dt;
    if (!bossAlive && state.mapEventTimer <= 0) {
      triggerMapEvent();
      state.mapEventTimer = 18 + Math.random() * 8;
    }
    updateMeteors(dt, bossAlive);
    updateAirdrops(dt, bossAlive);
    updateSupplyCrates(dt);
  }

  function spawnHazard() {
    const map = getBattleMap(state.mapId);
    const type = map.event === "lightning" ? "storm" : map.event === "aurora" ? "crystal" : "radar";
    const radius = type === "radar" ? 24 : type === "storm" ? 30 : 26;
    state.hazards.push({
      type,
      name: type === "radar" ? "雷达浮标" : type === "storm" ? "雷暴核心" : "极光晶体",
      x: radius + Math.random() * Math.max(1, state.width - radius * 2),
      y: -radius * 2,
      radius,
      speed: 88 + state.wave * 4 + Math.random() * 28,
      drift: (Math.random() - 0.5) * 34,
      phase: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI,
    });
  }

  function updateHazards(dt) {
    for (let index = state.hazards.length - 1; index >= 0; index -= 1) {
      const hazard = state.hazards[index];
      hazard.y += hazard.speed * dt;
      hazard.x += (hazard.drift + Math.sin(state.elapsed * 1.8 + hazard.phase) * 12) * dt;
      hazard.rotation += dt * (hazard.type === "storm" ? 1.8 : 0.55);
      if (hazard.y - hazard.radius > state.height || hazard.x < -hazard.radius * 2 || hazard.x > state.width + hazard.radius * 2) {
        state.hazards.splice(index, 1);
        continue;
      }
      if (circlesOverlap(hazard, state.player)) {
        addFloatingText(hazard.x, hazard.y, `${hazard.name} // 禁止碰撞`, "#ff5f57");
        damagePlayer(hazard.x, hazard.y);
      }
    }
  }

  function damageStructure(structure, amount, x, y, reason = "航路结构击破") {
    if (!structure?.breakable || structure.destroyed) return false;
    structure.hp -= amount;
    burst(x, y, COLORS.trajectory, 5, 95, 0.24);
    if (structure.hp > 0) return false;
    structure.destroyed = true;
    state.score += 900;
    state.shake = Math.max(state.shake, 8);
    showUpgrade("隐藏航路已开启", reason);
    addFloatingText(x, y, "+900", COLORS.trajectory);
    audio?.structureBreak?.();
    triggerScreenEffect("structure-break", COLORS.trajectory, 0.55, 0.42, 0.025);
    return true;
  }

  function updateMapStructures(dt) {
    if (!state.mapStructures.length) return;
    state.structureCollisionCooldown = Math.max(0, state.structureCollisionCooldown - dt);
    const map = getBattleMap(state.mapId);
    const speed = map.structureSpeed + Math.min(28, state.wave * 2.1);
    const cycle = state.height * 4.45;
    state.mapStructures.forEach((structure) => {
      structure.y += speed * dt;
      if (structure.vx) {
        structure.x += structure.vx * dt;
        const travel = Math.min(76, state.width * 0.14);
        if (structure.x < structure.originX - travel || structure.x > structure.originX + travel) {
          structure.vx *= -1;
          structure.x = Math.max(structure.originX - travel, Math.min(structure.originX + travel, structure.x));
        }
      }
      if (structure.forcedOpen > 0) structure.forcedOpen = Math.max(0, structure.forcedOpen - dt);
      if (structure.gateCycle) {
        const gatePhase = (state.elapsed + Number(structure.id.split("-").at(-1)) * 0.47) % structure.gateCycle;
        const wasOpen = structure.open;
        structure.open = structure.forcedOpen > 0 || gatePhase < structure.gateOpenFor;
        if (!wasOpen && structure.open && structure.y > -40 && structure.y < state.height) audio?.gateOpen?.();
      }
      if (structure.y > state.height + 90) {
        structure.y -= cycle;
        structure.x = structure.originX;
        structure.destroyed = false;
        structure.hp = structure.maxHp;
        structure.open = false;
        structure.forcedOpen = 0;
      }
      if (pointInsideHazard(state.player.x, state.player.y, structure, state.player.radius * 0.45)) {
        if (state.structureCollisionCooldown <= 0) {
          state.structureCollisionCooldown = 0.7;
          addFloatingText(state.player.x, state.player.y - 34, "危险区域", "#d44236");
          damagePlayer(state.player.x, state.player.y);
        }
        return;
      }
      if (!circleIntersectsStructure(state.player, structure, 8)) return;
      const resolved = resolveCircleFromStructure(state.player, structure);
      state.player.x = Math.max(state.player.radius, Math.min(state.width - state.player.radius, resolved.x));
      state.player.y = Math.max(54, Math.min(state.height - state.player.radius, resolved.y));
      if (state.structureCollisionCooldown <= 0) {
        state.structureCollisionCooldown = 0.7;
        addFloatingText(state.player.x, state.player.y - 34, "实体结构碰撞", "#d44236");
        damagePlayer(state.player.x, state.player.y);
        audio?.structureImpact?.();
      }
    });
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
    if (state.missionPendingId || state.airdropDecision) return;
    state.elapsed += dt;
    state.player.invulnerable = Math.max(0, state.player.invulnerable - dt);
    state.transformPulse = Math.max(0, state.transformPulse - dt);
    state.comboTimer = Math.max(0, state.comboTimer - dt);
    state.shake = Math.max(0, state.shake - dt * 30);
    state.impactFlash = Math.max(0, state.impactFlash - dt * 0.9);
    if (state.screenEffect) {
      state.screenEffect.life -= dt;
      if (state.screenEffect.life <= 0) state.screenEffect = null;
    }
    state.speedLines = Math.max(0, state.speedLines - dt * 1.8);
    state.tacticalCooldown = Math.max(0, state.tacticalCooldown - dt);
    state.barrierTimer = Math.max(0, state.barrierTimer - dt);
    state.wingmanCooldown = Math.max(0, state.wingmanCooldown - dt);
    state.wingmanTimer = Math.max(0, state.wingmanTimer - dt);
    state.railChainTimer = Math.max(0, state.railChainTimer - dt);
    if (state.railChainTimer === 0) state.railChain = 0;
    state.overclockTimer = Math.max(0, state.overclockTimer - dt);
    state.coreDropCooldown = Math.max(0, state.coreDropCooldown - dt);
    if (state.firepowerTimer > 0) {
      state.firepowerTimer = Math.max(0, state.firepowerTimer - dt);
      updateWeaponHud();
    }
    state.meteorPierceTimer = Math.max(0, state.meteorPierceTimer - dt);
    if (state.overclockTimer === 0) state.overclockStacks = Math.max(0, state.overclockStacks - dt * 1.4);
    updateLasers(dt);
    updateScreenLaser(dt);
    updateNuclearStrike(dt);
    const fighter = getFighter();
    state.transformProgress = nextTransformProgress(
      state.transformProgress,
      state.transformTarget,
      dt,
      fighter.transformDuration,
      fighter.restoreDuration,
    );
    if (state.transformTarget > 0.5) {
      state.transformElapsed = Math.min(TRANSFORM_DURATION, state.transformElapsed + dt);
      state.transformEnergy = Math.max(0, 100 * (1 - state.transformElapsed / TRANSFORM_DURATION));
      const stageCount = fighter.id === "hypersonic" ? fighter.transformation.stages.length : 1;
      state.assaultFormIndex = Math.min(stageCount - 1, Math.floor((state.transformElapsed / TRANSFORM_DURATION) * stageCount));
    }
    if (state.transformElapsed >= TRANSFORM_DURATION && state.transformTarget > 0) {
      state.transformTarget = 0;
      state.transformElapsed = 0;
      state.transformEnergy = 0;
      showUpgrade("10 秒结束 // 自动恢复飞行形态", "变身结束");
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

    const assaultMobility = 1 + state.transformProgress * 0.32;
    const followBase = Math.max(0.00018, fighter.followBase * assaultMobility);
    const follow = 1 - Math.pow(followBase, dt);
    state.player.x += (state.pointer.x - state.player.x) * follow;
    state.player.y += (state.pointer.y - state.player.y) * follow;
    if (!state.miniMission) updateMapStructures(dt);
    updateAllies(dt);

    if (state.wingmanTimer > 0) {
      updateWingmanPositions();
      state.wingmanFireTimer -= dt;
      if (state.wingmanFireTimer <= 0) {
        fireWingmen();
        state.wingmanFireTimer = wingmanSpec(state.fighterId).rate;
      }
    } else if (state.wingmanPositions.length) {
      state.wingmanPositions = [];
    }

    state.fireTimer -= dt;
    if (state.fireTimer <= 0) {
      const mode = toolModeSpec(state.fighterId, state.toolModeIndex);
      shoot();
      const weapon = WEAPONS[state.weaponLevel - 1];
      const rushRate = state.combo >= 8 ? 0.82 : 1;
      const fireBoost = assaultFireSpec(state.transformProgress, state.fighterId);
      const overclockRate = Math.max(0.55, 1 - state.overclockStacks * 0.048);
      const toolRate = mode.rate;
      state.fireTimer = mode.pattern === "laser"
        ? laserModeSpec(mode).cycle * fireBoost.rateMultiplier * (state.firepowerTimer > 0 ? 0.58 : 1)
        : weapon.rate * toolRate * fighter.fireRate * state.fireRateMultiplier * fireBoost.rateMultiplier * rushRate
          * overclockRate * (state.overdrive > 0 ? 0.68 : 1) * (state.firepowerTimer > 0 ? 0.58 : 1);
    }

    if (state.miniMission) {
      updateMiniMission(dt);
      updatePlayerBullets(dt);
      resolveMiniMissionBulletHits();
      updateParticles(dt);
      updateFloatingTexts(dt);
      updateAbilityHud();
      return;
    }

    const bossAlive = state.enemies.some((enemy) => enemy.type === "boss");
    updateMapEvents(dt, bossAlive);
    state.spawnTimer -= dt;
    if (!bossAlive && state.spawnTimer <= 0) {
      spawnEnemy();
      const phase = combatPhase(state.elapsed);
      const difficulty = Math.min(0.48, state.elapsed / 180 + state.wave * 0.01);
      const rushDensity = state.combo >= 8 ? 0.82 : 1;
      const phaseFloor = phase === "identify" ? 0.78 : phase === "learn" ? 0.62 : phase === "expand" ? 0.42 : 0.28;
      state.spawnTimer = Math.max(phaseFloor, (0.62 - difficulty + Math.random() * 0.24) * rushDensity);
    }

    state.formationTimer -= dt;
    if (!bossAlive && state.elapsed >= 15 && state.formationTimer <= 0) {
      spawnFormation();
      state.formationTimer = Math.max(6.2, 11 - state.wave * 0.28) + Math.random() * 3;
    }

    const nextWave = Math.floor(state.elapsed / 12) + 1;
    if (nextWave !== state.wave) {
      state.wave = nextWave;
      showWave(`第 ${String(state.wave).padStart(2, "0")} 波`);
      if (state.wave >= 4 && state.wave % 4 === 0 && state.bossWave !== state.wave && !state.supplyCrates.length) {
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
    updateHazards(dt);
    resolveBulletHits();
    updatePickups(dt);
    updateParticles(dt);
    updateFloatingTexts(dt);
    updateAbilityHud();

    const nextMission = autoMiniMissions ? nextMiniMission(
      state.elapsed,
      state.completedMiniMissions,
      bossAlive || state.ended || Boolean(state.missionPendingId) || state.supplyCrates.length > 0 || Boolean(state.airdropDecision),
    ) : null;
    if (nextMission) showMissionBriefing(nextMission.id);
  }

  function updateWeaponHud() {
    const weapon = WEAPONS[state.weaponLevel - 1];
    const tool = toolModeSpec(state.fighterId, state.toolModeIndex);
    const overdriveActive = state.overdrive > 0;
    const tacticalFirepowerActive = state.firepowerTimer > 0;
    const form = state.transformStage === 2 ? "终极" : state.transformStage === 1 ? "战术" : "基础";
    weaponValue.textContent = overdriveActive
      ? `极限超载 ${state.overdrive.toFixed(1)} 秒`
      : tacticalFirepowerActive
        ? `火力超载 ${state.firepowerTimer.toFixed(1)} 秒`
      : `等级 ${weapon.level} ${tool.name} / 弹道 +${state.trajectoryLevel} / ${form}`;
    weaponHud.classList.toggle("is-overdrive", overdriveActive || tacticalFirepowerActive);

    if (tool.pattern === "laser" && !overdriveActive) {
      weaponProgress.style.width = `${state.laserHeat}%`;
      weaponProgressLabel.textContent = state.laserCooldown > 0
        ? `过热冷却 ${state.laserCooldown.toFixed(1)} 秒`
        : state.laserWarmup > 0 ? `激光预热 ${state.laserWarmup.toFixed(1)} 秒` : `热量 ${Math.round(state.laserHeat)}%`;
    } else if (overdriveActive) {
      weaponProgress.style.width = `${(state.overdrive / 6) * 100}%`;
      weaponProgressLabel.textContent = "最大火力输出";
    } else if (tacticalFirepowerActive) {
      weaponProgress.style.width = `${Math.min(100, (state.firepowerTimer / 20) * 100)}%`;
      weaponProgressLabel.textContent = "战术空投强化";
    } else if (state.weaponLevel === WEAPONS.length) {
      weaponProgress.style.width = "100%";
      weaponProgressLabel.textContent = "进化已满，再拾取转为超载";
    } else {
      const progress = (state.weaponEnergy / weapon.threshold) * 100;
      weaponProgress.style.width = `${progress}%`;
      weaponProgressLabel.textContent = `${state.weaponEnergy} / ${weapon.threshold} 进化球`;
    }
  }

  function updateAbilityHud() {
    const fighter = getFighter();
    const assault = state.transformProgress > 0.72;
    const transforming = Math.abs(state.transformProgress - state.transformTarget) > 0.02;
    const modes = fighter.toolModes;
    const mode = toolModeSpec(state.fighterId, state.toolModeIndex);
    const wingmen = wingmanSpec(state.fighterId);
    skillValue.textContent = mode.name;
    skillCooldown.textContent = mode.pattern === "laser"
      ? `${state.toolModeIndex + 1} / ${modes.length} · 热 ${Math.round(state.laserHeat)}%`
      : `${state.toolModeIndex + 1} / ${modes.length}`;
    skillAbility.classList.remove("is-cooling");
    formValue.textContent = transforming
      ? state.transformTarget > 0.5 ? "机械重组中" : "飞行复原中"
      : assault
        ? fighter.id === "hypersonic" ? fighter.transformation.stages[state.assaultFormIndex] : fighter.transformation.label
        : "飞行形态";
    formEnergy.style.width = `${assault || state.transformTarget > 0.5 ? state.transformEnergy : (state.transformCores / TRANSFORM_CORE_COST) * 100}%`;
    formEnergyLabel.textContent = assault || state.transformTarget > 0.5
      ? `${transformSecondsRemaining(state.transformEnergy).toFixed(1)} 秒`
      : `${state.transformCores} / ${TRANSFORM_CORE_COST} 球`;
    wingmanValue.textContent = wingmen.name;
    wingmanCooldown.textContent = state.wingmanTimer > 0
      ? `${state.wingmanTimer.toFixed(1)} 秒作战`
      : state.wingmanCooldown > 0 ? `${state.wingmanCooldown.toFixed(1)} 秒` : "就绪";
    wingmanAbility.classList.toggle("is-cooling", state.wingmanCooldown > 0 && state.wingmanTimer <= 0);
    wingmanAbility.classList.toggle("is-active", state.wingmanTimer > 0);
    const passiveLabels = {
      f22: `${fighter.passiveName} // ${state.enemies.filter((enemy) => enemy.marked).length} 个目标`,
      j35: `${fighter.passiveName} // ${state.enemies.filter((enemy) => enemy.marked).length} 个目标`,
      typhoon: `${fighter.passiveName} // 连续贯穿 ${Math.floor(state.railChain)}`,
      rafale: `${fighter.passiveName} // ${state.resonanceBursts} 次爆发`,
      gripen: `${fighter.passiveName} // 超频 ${Math.floor(state.overclockStacks)} / 擦弹 ${state.grazeCount}`,
      su57: `${fighter.passiveName} // ${Math.round(state.revengeCharge)}%`,
      j20: `${fighter.passiveName} // ${2 + state.droneBonus} 架无人机`,
      faxx: `${fighter.passiveName} // ${1 + state.droneBonus} 架僚机`,
      hypersonic: `${fighter.passiveName} // ${state.toolModeIndex + 1} / ${modes.length} 形态`,
    };
    passiveStatus.textContent = passiveLabels[fighter.id] || fighter.passiveName;
    transformButton.disabled = state.transformTarget < 0.5
      && !canEnterCoreTransform(state.transformCores);
    const transformIsReady = state.running
      && state.transformTarget < 0.5
      && canEnterCoreTransform(state.transformCores);
    transformReady.hidden = !transformIsReady;
    skillButton.disabled = false;
    wingmanButton.disabled = state.elapsed < 15 || state.wingmanCooldown > 0 || state.wingmanTimer > 0;
  }

  function updateHud() {
    const fighter = getFighter();
    scoreValue.textContent = String(state.score).padStart(6, "0");
    comboValue.textContent = state.combo >= 8 ? `狂热 ×${state.combo}` : `×${state.combo}`;
    const healthRatio = Math.max(0, state.health / Math.max(1, state.maxHealth));
    healthValue.textContent = `${Math.ceil(state.health)} / ${state.maxHealth}`;
    healthProgress.style.width = `${healthRatio * 100}%`;
    healthProgress.classList.toggle("is-critical", healthRatio <= 0.28);
    shieldValue.textContent = `护盾 ${state.shieldCharges}`;
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

  function showMissionBriefing(missionId) {
    const mission = MINI_MISSIONS[missionId];
    if (!mission || state.missionPendingId || state.miniMission || state.airdropDecision || state.supplyCrates.length) return false;
    state.missionPendingId = missionId;
    missionEventTag.textContent = `${mission.tag} // 副本来袭`;
    missionEventTitle.textContent = mission.title;
    missionEventRule.textContent = mission.rule;
    missionEventObjective.textContent = mission.objective;
    missionEventReward.textContent = mission.reward;
    missionBriefing.hidden = false;
    gameScreen.classList.add("is-mission-paused");
    audio?.missionAlert?.();
    return true;
  }

  function clearBattlefieldForMission() {
    state.enemyBullets = [];
    state.enemies = [];
    state.bullets = [];
    state.laserBeams = [];
    state.pendingLaser = null;
    state.laserWarmup = 0;
    state.hazards = [];
    state.meteorWarnings = [];
    state.meteors = [];
    state.supplyCrates = [];
    state.activeAirdropId = null;
    state.airdropDecision = null;
    airdropChoice.hidden = true;
    airdropProgress.hidden = true;
    gameScreen.classList.remove("is-airdrop-paused");
    bossHud.hidden = true;
  }

  function createMissionRing(index) {
    const radius = Math.max(36, Math.min(56, state.width * 0.11));
    const margin = radius + 24;
    const pattern = [0.22, 0.72, 0.42, 0.8, 0.28];
    return {
      id: `mission-ring-${index}`,
      x: margin + pattern[index % pattern.length] * Math.max(1, state.width - margin * 2),
      y: -radius - 24,
      radius,
      speed: 245 + index * 18,
      phase: index * 0.9,
    };
  }

  function createChainNodes() {
    const columns = state.width < 620 ? 3 : 4;
    const rows = 3;
    const gapX = Math.min(116, (state.width - 92) / Math.max(1, columns - 1));
    const gapY = Math.min(104, state.height * 0.13);
    const startX = state.width / 2 - gapX * (columns - 1) / 2;
    const startY = Math.max(120, state.height * 0.2);
    return Array.from({ length: columns * rows }, (_, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      return {
        id: `chain-${index}`,
        x: startX + column * gapX + (row % 2 ? gapX * 0.22 : 0),
        y: startY + row * gapY,
        radius: 20,
        destroyed: false,
        pulse: index * 0.7,
      };
    });
  }

  function beginMiniMission(missionId) {
    const spec = MINI_MISSIONS[missionId];
    if (!spec) return false;
    clearBattlefieldForMission();
    const mission = {
      id: missionId,
      title: spec.title,
      timer: spec.duration,
      duration: spec.duration,
      success: false,
      score: 0,
    };

    if (missionId === "coaster") {
      const motion = coasterMotion(0);
      Object.assign(mission, {
        laneX: state.width / 2,
        horizonX: state.width / 2,
        laneBaseWidth: Math.min(230, state.width * 0.52),
        laneWidth: Math.min(230, state.width * 0.52),
        horizonRatio: motion.horizonRatio,
        cameraRoll: motion.roll,
        trackSpeed: motion.speed,
        segmentIndex: -1,
        segmentLabel: motion.segmentLabel,
        onTrack: 0,
        targetOnTrack: 8.5,
        boostCharge: 0,
        boostCount: 0,
        hitCooldown: 0,
      });
      state.speedLines = 3;
    } else if (missionId === "rings") {
      Object.assign(mission, { passed: 0, missed: 0, target: 5, ring: createMissionRing(0) });
    } else if (missionId === "carrier") {
      Object.assign(mission, {
        dockTime: 0,
        carrier: {
          x: state.width / 2,
          y: state.height + 120,
          targetY: state.height * 0.69,
          width: Math.min(410, state.width * 0.78),
          height: 190,
          deckWidth: Math.min(210, state.width * 0.48),
          deckHeight: 78,
        },
      });
    } else if (missionId === "mothership") {
      const centerX = state.width / 2;
      const y = Math.max(145, state.height * 0.24);
      Object.assign(mission, {
        mothership: { x: centerX, y, width: Math.min(560, state.width * 0.82), height: 170 },
        parts: [
          { id: "mother-left", label: "左舷武器舱", x: centerX - Math.min(150, state.width * 0.23), y: y + 18, radius: 34, hp: 62, maxHp: 62, destroyed: false },
          { id: "mother-core", label: "中央反应堆", x: centerX, y: y - 8, radius: 38, hp: 82, maxHp: 82, destroyed: false },
          { id: "mother-right", label: "右舷武器舱", x: centerX + Math.min(150, state.width * 0.23), y: y + 18, radius: 34, hp: 62, maxHp: 62, destroyed: false },
        ],
      });
    } else if (missionId === "chain") {
      Object.assign(mission, { nodes: createChainNodes(), chainMax: 0, detonated: 0, chainRadius: state.width < 620 ? 124 : 128 });
    }

    state.miniMission = mission;
    state.missionPendingId = null;
    state.player.invulnerable = Math.max(state.player.invulnerable, 1);
    missionBriefing.hidden = true;
    missionProgress.hidden = false;
    gameScreen.classList.remove("is-mission-paused");
    showWave(`${spec.title} // 开始`);
    audio?.missionStart?.(missionId);
    updateMiniMissionHud();
    return true;
  }

  function rewardMiniMission(mission, success) {
    if (!success) return;
    if (mission.id === "coaster") {
      state.score += 1000;
      state.overdrive = Math.max(state.overdrive, 5);
    } else if (mission.id === "rings") {
      state.score += 900;
      state.transformCores = Math.min(TRANSFORM_CORE_COST, state.transformCores + 1);
    } else if (mission.id === "carrier") {
      state.health = Math.min(state.maxHealth, state.health + Math.round(state.maxHealth * 0.35));
      state.transformCores = Math.min(TRANSFORM_CORE_COST, state.transformCores + 1);
      state.wingmanCooldown = 0;
      state.overdrive = Math.max(state.overdrive, 5);
    } else if (mission.id === "mothership") {
      state.score += 2400;
      state.transformCores = TRANSFORM_CORE_COST;
      state.enemyBullets = [];
    } else if (mission.id === "chain") {
      state.score += mission.chainMax * 250;
      state.barrierTimer = Math.max(state.barrierTimer, 7);
    }
  }

  function finishMiniMission(success, detail) {
    const mission = state.miniMission;
    if (!mission) return;
    rewardMiniMission(mission, success);
    state.completedMiniMissions.push(mission.id);
    state.miniMissionResults.push({ id: mission.id, success, detail });
    state.miniMission = null;
    missionProgress.hidden = true;
    state.spawnTimer = 0.8;
    state.formationTimer = Math.max(state.formationTimer, 5);
    state.player.invulnerable = Math.max(state.player.invulnerable, 1.2);
    showUpgrade(detail, success ? "副本完成" : "副本结束");
    showWave(success ? "挑战成功" : "返回主战场");
    triggerScreenEffect(success ? "mission-complete" : "mission-end", success ? COLORS.overdrive : COLORS.trajectory, success ? 1.05 : 0.62, 0.72, 0.04);
    audio?.missionResult?.(success);
    updateHud();
  }

  function skipPendingMiniMission() {
    const missionId = state.missionPendingId;
    if (!missionId) return;
    const spec = MINI_MISSIONS[missionId];
    state.completedMiniMissions.push(missionId);
    state.skippedMiniMissions.push(missionId);
    state.miniMissionResults.push({ id: missionId, success: false, detail: "本局跳过" });
    state.missionPendingId = null;
    missionBriefing.hidden = true;
    gameScreen.classList.remove("is-mission-paused");
    showUpgrade(`${spec.title} // 已跳过`, "返回主战场");
    audio?.missionResult?.(false);
  }

  function detonateChainNode(nodeId) {
    const mission = state.miniMission;
    if (mission?.id !== "chain") return 0;
    const ids = connectedChain(mission.nodes, nodeId, mission.chainRadius);
    ids.forEach((id, index) => {
      const node = mission.nodes.find((item) => item.id === id);
      if (!node || node.destroyed) return;
      node.destroyed = true;
      mission.detonated += 1;
      burst(node.x, node.y, index % 2 ? COLORS.overdrive : COLORS.enemy, 20 + index * 2, 180 + index * 12, 0.62);
      addFloatingText(node.x, node.y, `连爆 ${index + 1}`, COLORS.overdrive);
    });
    mission.chainMax = Math.max(mission.chainMax, ids.length);
    state.shake = Math.min(18, 5 + ids.length * 1.5);
    state.speedLines = Math.max(state.speedLines, 1.5);
    audio?.chainBlast?.(ids.length);
    if (mission.chainMax >= 5) finishMiniMission(true, `${mission.chainMax} 连爆 // 屏障 7 秒`);
    return ids.length;
  }

  function damageMissionPart(part, damage) {
    if (!part || part.destroyed) return false;
    part.hp -= damage;
    burst(part.x, part.y, COLORS.elite, 5, 100, 0.24);
    if (part.hp > 0) return false;
    part.destroyed = true;
    state.score += 600;
    state.shake = 12;
    addFloatingText(part.x, part.y, `${part.label}摧毁`, COLORS.overdrive);
    burst(part.x, part.y, COLORS.overdrive, 42, 280, 0.9);
    audio?.bossPart?.();
    const mission = state.miniMission;
    if (mission?.id === "mothership" && mission.parts.every((item) => item.destroyed)) {
      finishMiniMission(true, "三处武器舱全部摧毁 // 能量球补满");
    }
    return true;
  }

  function resolveMiniMissionBulletHits() {
    const mission = state.miniMission;
    if (!mission || !["mothership", "chain"].includes(mission.id)) return;
    for (let bulletIndex = state.bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
      const bullet = state.bullets[bulletIndex];
      if (mission.id === "mothership") {
        const part = mission.parts.find((item) => !item.destroyed && !bullet.hitTargets.has(item.id) && circlesOverlap(bullet, item));
        if (!part) continue;
        bullet.hitTargets.add(part.id);
        damageMissionPart(part, bullet.damage * (bullet.type === "heavy" ? 1.8 : 1.2));
      } else {
        const node = mission.nodes.find((item) => !item.destroyed && circlesOverlap(bullet, item));
        if (!node) continue;
        detonateChainNode(node.id);
      }
      if (bullet.pierceLeft > 0) bullet.pierceLeft -= 1;
      else state.bullets.splice(bulletIndex, 1);
    }
  }

  function updateMiniMissionHud() {
    const mission = state.miniMission;
    if (!mission) return;
    const spec = MINI_MISSIONS[mission.id];
    missionProgressTag.textContent = spec.tag;
    missionProgressTitle.textContent = spec.title;
    let rule = spec.objective;
    let value = `${mission.timer.toFixed(1)} 秒`;
    let progress = Math.max(0, mission.timer / mission.duration);
    if (mission.id === "coaster") {
      rule = `${mission.segmentLabel} · 轨道内 ${mission.onTrack.toFixed(1)} / ${mission.targetOnTrack.toFixed(1)} 秒`;
      value = mission.boostCount > 0 ? `增压 ×${mission.boostCount}` : `${mission.timer.toFixed(1)} 秒`;
      progress = Math.min(1, mission.onTrack / mission.targetOnTrack);
    } else if (mission.id === "rings") {
      rule = `已穿过 ${mission.passed} 个 · 漏过 ${mission.missed} 个`;
      value = `${mission.passed} / ${mission.target}`;
      progress = mission.passed / mission.target;
    } else if (mission.id === "carrier") {
      rule = isInsideCarrierDeck(state.player, mission.carrier) ? "保持稳定，不要离开甲板" : "飞入黄色甲板引导区";
      value = `${mission.dockTime.toFixed(1)} / 2.0 秒`;
      progress = mission.dockTime / 2;
    } else if (mission.id === "mothership") {
      const destroyed = mission.parts.filter((part) => part.destroyed).length;
      rule = `已摧毁 ${destroyed} 个武器舱`;
      value = `${destroyed} / 3`;
      progress = destroyed / 3;
    } else if (mission.id === "chain") {
      rule = `当前最高 ${mission.chainMax} 连爆`;
      value = `${mission.chainMax} / 5`;
      progress = Math.min(1, mission.chainMax / 5);
    }
    missionProgressRule.textContent = rule;
    missionProgressValue.textContent = value;
    missionProgressBar.style.width = `${Math.max(0, Math.min(1, progress)) * 100}%`;
  }

  function updateMiniMission(dt) {
    const mission = state.miniMission;
    if (!mission) return;
    mission.timer = Math.max(0, mission.timer - dt);
    if (mission.id === "coaster") {
      const rideProgress = 1 - mission.timer / mission.duration;
      const motion = coasterMotion(rideProgress);
      mission.laneX = state.width * motion.center;
      mission.horizonX = state.width * motion.horizonCenter;
      mission.laneWidth = mission.laneBaseWidth * motion.laneScale;
      mission.horizonRatio = motion.horizonRatio;
      mission.cameraRoll = motion.roll;
      mission.trackSpeed = motion.speed;
      mission.segmentLabel = motion.segmentLabel;
      if (mission.segmentIndex !== motion.segmentIndex) {
        mission.segmentIndex = motion.segmentIndex;
        showWave(`${motion.segmentLabel} // 保持轨道`);
        audio?.coasterCue?.(motion.segmentIndex);
        state.speedLines = Math.max(state.speedLines, 3.2);
      }
      mission.hitCooldown = Math.max(0, mission.hitCooldown - dt);
      const inside = Math.abs(state.player.x - mission.laneX) <= mission.laneWidth / 2;
      if (inside) {
        mission.onTrack = Math.min(mission.targetOnTrack, mission.onTrack + dt);
        mission.boostCharge += dt * motion.speed;
        if (mission.boostCharge >= 1.4) {
          mission.boostCharge -= 1.4;
          mission.boostCount += 1;
          state.score += 150;
          state.speedLines = Math.max(state.speedLines, 3.8);
          burst(state.player.x, state.player.y + 18, COLORS.trajectory, 16, 210, 0.4);
          addFloatingText(state.player.x, state.player.y - 32, `轨道增压 ×${mission.boostCount}`, COLORS.trajectory);
          audio?.coasterBoost?.(mission.boostCount);
        }
      } else {
        mission.boostCharge = 0;
        if (mission.hitCooldown <= 0) {
          mission.hitCooldown = 0.65;
          state.shake = Math.max(state.shake, 7);
          addFloatingText(state.player.x, state.player.y - 28, "被甩出轨道 // 向中线修正", COLORS.enemy);
          audio?.structureImpact?.();
        }
      }
      state.speedLines = Math.max(state.speedLines, 2.25 * motion.speed);
      if (mission.onTrack >= mission.targetOnTrack) finishMiniMission(true, `云端过山车完成 // ${mission.boostCount} 次增压 // 极限火力 5 秒`);
    } else if (mission.id === "rings") {
      const ring = mission.ring;
      ring.y += ring.speed * dt;
      ring.x += Math.sin(state.elapsed * 2.2 + ring.phase) * 28 * dt;
      if (ringContainsPlayer(state.player, ring)) {
        mission.passed += 1;
        state.score += 300;
        burst(ring.x, ring.y, COLORS.trajectory, 26, 230, 0.55);
        addFloatingText(ring.x, ring.y, `穿环 ${mission.passed} / ${mission.target}`, COLORS.trajectory);
        audio?.ringPass?.(mission.passed);
        if (mission.passed >= mission.target) finishMiniMission(true, "五环全连 // 获得 1 个能量球");
        else mission.ring = createMissionRing(mission.passed + mission.missed);
      } else if (ring.y - ring.radius > state.height) {
        mission.missed += 1;
        showUpgrade(`已完成 ${mission.passed} / ${mission.target}`, "能量环漏过");
        mission.ring = createMissionRing(mission.passed + mission.missed);
      }
    } else if (mission.id === "carrier") {
      const carrier = mission.carrier;
      carrier.y += (carrier.targetY - carrier.y) * (1 - Math.pow(0.018, dt));
      if (isInsideCarrierDeck(state.player, carrier)) {
        mission.dockTime = Math.min(2, mission.dockTime + dt);
        state.player.invulnerable = Math.max(state.player.invulnerable, 0.2);
      } else {
        mission.dockTime = Math.max(0, mission.dockTime - dt * 0.7);
      }
      if (mission.dockTime >= 2) {
        audio?.carrierDock?.();
        finishMiniMission(true, "航母补给完成 // 修复、能量球、僚机与弹射强化");
      }
    }

    updateMiniMissionHud();
    if (!state.miniMission) return;
    if (mission.timer <= 0) {
      const detail = mission.id === "rings"
        ? `穿过 ${mission.passed} / ${mission.target} 个能量环`
        : mission.id === "chain" ? `最高 ${mission.chainMax} 连爆` : `${mission.title}未在时限内完成`;
      finishMiniMission(false, detail);
    }
  }

  function drawBackground() {
    const map = getBattleMap(state.mapId);
    context.fillStyle = map.background;
    context.fillRect(0, 0, state.width, state.height);

    context.strokeStyle = map.grid;
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

  function drawCoasterMission(mission) {
    const horizonY = state.height * mission.horizonRatio;
    const horizonX = mission.horizonX;
    const nearX = mission.laneX;
    const half = mission.laneWidth / 2;
    const trackPoint = (depth, side = 0) => {
      const eased = depth ** 1.82;
      const bend = Math.sin(depth * Math.PI) * (nearX - horizonX) * 0.2;
      const center = horizonX + (nearX - horizonX) * eased + bend;
      return {
        x: center + side * (8 + eased * half),
        y: horizonY + eased * (state.height - horizonY + 32),
      };
    };
    context.save();
    const sky = context.createLinearGradient(0, 0, 0, state.height);
    sky.addColorStop(0, "rgba(27, 104, 128, 0.58)");
    sky.addColorStop(0.5, "rgba(46, 127, 139, 0.18)");
    sky.addColorStop(1, "rgba(8, 21, 29, 0.5)");
    context.fillStyle = sky;
    context.fillRect(0, 0, state.width, state.height);

    context.fillStyle = "rgba(9, 22, 29, 0.68)";
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(Math.max(0, horizonX - 30), horizonY);
    context.lineTo(Math.max(0, nearX - half - 90), state.height);
    context.lineTo(0, state.height);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo(state.width, 0);
    context.lineTo(Math.min(state.width, horizonX + 30), horizonY);
    context.lineTo(Math.min(state.width, nearX + half + 90), state.height);
    context.lineTo(state.width, state.height);
    context.closePath();
    context.fill();

    const leftRail = [];
    const rightRail = [];
    for (let step = 0; step <= 28; step += 1) {
      const depth = step / 28;
      leftRail.push(trackPoint(depth, -1));
      rightRail.push(trackPoint(depth, 1));
    }

    context.fillStyle = "rgba(42, 82, 90, 0.5)";
    context.beginPath();
    leftRail.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    rightRail.slice().reverse().forEach((point) => context.lineTo(point.x, point.y));
    context.closePath();
    context.fill();

    context.strokeStyle = COLORS.trajectory;
    context.shadowColor = COLORS.trajectory;
    context.shadowBlur = 12;
    [leftRail, rightRail].forEach((rail) => {
      context.beginPath();
      rail.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.lineWidth = 5;
      context.stroke();
    });
    context.shadowBlur = 0;

    for (let index = 0; index < 15; index += 1) {
      const depth = ((index / 15) + (state.elapsed * 0.42 * mission.trackSpeed) % 1) % 1;
      const left = trackPoint(depth, -1);
      const right = trackPoint(depth, 1);
      context.globalAlpha = 0.2 + depth * 0.72;
      context.strokeStyle = index % 5 === 0 ? "rgba(255, 250, 240, 0.9)" : COLORS.trajectory;
      context.lineWidth = 1 + depth * 4;
      context.beginPath();
      context.moveTo(left.x, left.y);
      context.lineTo(right.x, right.y);
      context.stroke();

      if (index % 5 === 0 && depth > 0.16) {
        const height = 18 + depth * 92;
        context.globalAlpha *= 0.55;
        context.lineWidth = 2 + depth * 2;
        context.beginPath();
        context.moveTo(left.x, left.y);
        context.lineTo(left.x, left.y - height);
        context.moveTo(right.x, right.y);
        context.lineTo(right.x, right.y - height);
        context.lineTo(left.x, left.y - height);
        context.stroke();
      }
    }

    context.strokeStyle = "rgba(255, 250, 240, 0.34)";
    for (let index = 0; index < 18; index += 1) {
      const side = index % 2 ? 1 : -1;
      const y = ((index * 83 + state.elapsed * 620 * mission.trackSpeed) % (state.height + 180)) - 90;
      const startX = side > 0 ? state.width : 0;
      const endX = startX - side * (36 + (index % 4) * 18);
      context.globalAlpha = 0.12 + (y / state.height) * 0.4;
      context.lineWidth = 1 + Math.max(0, y / state.height) * 2;
      context.beginPath();
      context.moveTo(startX, y);
      context.lineTo(endX, y + 28);
      context.stroke();
    }

    context.globalAlpha = 0.92;
    context.fillStyle = "#fffaf0";
    context.font = "900 12px Arial Narrow, sans-serif";
    context.textAlign = "center";
    context.fillText(mission.segmentLabel, horizonX, horizonY + 28);
    context.restore();
  }

  function drawRingMission(mission) {
    const ring = mission.ring;
    if (!ring) return;
    const pulse = 1 + Math.sin(state.elapsed * 7) * 0.045;
    context.save();
    context.translate(ring.x, ring.y);
    context.scale(pulse, pulse);
    context.strokeStyle = COLORS.trajectory;
    context.shadowColor = COLORS.trajectory;
    context.shadowBlur = 18;
    context.lineWidth = 9;
    context.beginPath();
    context.arc(0, 0, ring.radius, 0, Math.PI * 2);
    context.stroke();
    context.shadowBlur = 0;
    context.strokeStyle = "rgba(255, 250, 240, 0.82)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, ring.radius - 9, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = COLORS.trajectory;
    context.font = "900 12px Arial Narrow, sans-serif";
    context.textAlign = "center";
    context.fillText(`${mission.passed + 1} / ${mission.target}`, 0, 4);
    context.restore();
  }

  function drawCarrierMission(mission) {
    const carrier = mission.carrier;
    context.save();
    context.translate(carrier.x, carrier.y);
    context.fillStyle = "#344c54";
    context.strokeStyle = "#d7e5e7";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(0, -carrier.height * 0.58);
    context.lineTo(carrier.width * 0.42, -carrier.height * 0.34);
    context.lineTo(carrier.width * 0.5, carrier.height * 0.42);
    context.lineTo(carrier.width * 0.32, carrier.height * 0.58);
    context.lineTo(-carrier.width * 0.4, carrier.height * 0.5);
    context.lineTo(-carrier.width * 0.5, -carrier.height * 0.38);
    context.closePath();
    context.fill();
    context.stroke();

    context.fillStyle = "#789198";
    context.fillRect(-carrier.deckWidth * 0.72, -carrier.height * 0.4, carrier.deckWidth * 1.12, carrier.height * 0.82);
    context.strokeStyle = COLORS.barrier;
    context.lineWidth = 4;
    context.setLineDash([12, 8]);
    context.strokeRect(-carrier.deckWidth / 2, -carrier.deckHeight / 2, carrier.deckWidth, carrier.deckHeight);
    context.setLineDash([]);
    context.fillStyle = "rgba(230, 169, 26, 0.14)";
    context.fillRect(-carrier.deckWidth / 2, -carrier.deckHeight / 2, carrier.deckWidth, carrier.deckHeight);
    context.strokeStyle = "#fffaf0";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(0, carrier.deckHeight * 0.34);
    context.lineTo(0, -carrier.deckHeight * 0.34);
    context.moveTo(-10, -carrier.deckHeight * 0.18);
    context.lineTo(0, -carrier.deckHeight * 0.34);
    context.lineTo(10, -carrier.deckHeight * 0.18);
    context.stroke();
    context.fillStyle = "#f4c44f";
    context.font = "900 12px Arial Narrow, sans-serif";
    context.textAlign = "center";
    context.fillText("停靠区", 0, 5);
    context.restore();
  }

  function drawMothershipMission(mission) {
    const ship = mission.mothership;
    context.save();
    context.translate(ship.x, ship.y);
    context.fillStyle = "#3a4b55";
    context.strokeStyle = "#9eb8c0";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(0, -ship.height * 0.58);
    context.lineTo(ship.width * 0.5, -ship.height * 0.08);
    context.lineTo(ship.width * 0.4, ship.height * 0.44);
    context.lineTo(0, ship.height * 0.58);
    context.lineTo(-ship.width * 0.4, ship.height * 0.44);
    context.lineTo(-ship.width * 0.5, -ship.height * 0.08);
    context.closePath();
    context.fill();
    context.stroke();
    context.fillStyle = "#718894";
    context.fillRect(-ship.width * 0.28, -18, ship.width * 0.56, 42);
    context.restore();

    mission.parts.forEach((part) => {
      context.save();
      context.translate(part.x, part.y);
      context.globalAlpha = part.destroyed ? 0.18 : 1;
      context.fillStyle = part.destroyed ? "#202a2f" : COLORS.enemy;
      context.strokeStyle = part.destroyed ? "#4f5b60" : COLORS.overdrive;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(0, 0, part.radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      if (!part.destroyed) {
        const ratio = Math.max(0, part.hp / part.maxHp);
        context.fillStyle = "rgba(255, 250, 240, 0.2)";
        context.fillRect(-part.radius, part.radius + 9, part.radius * 2, 6);
        context.fillStyle = COLORS.overdrive;
        context.fillRect(-part.radius, part.radius + 9, part.radius * 2 * ratio, 6);
      }
      context.restore();
    });
  }

  function drawChainMission(mission) {
    context.save();
    context.strokeStyle = "rgba(215, 107, 44, 0.28)";
    context.lineWidth = 2;
    mission.nodes.forEach((node, index) => {
      if (node.destroyed) return;
      mission.nodes.slice(index + 1).forEach((other) => {
        if (other.destroyed || Math.hypot(node.x - other.x, node.y - other.y) > mission.chainRadius) return;
        context.beginPath();
        context.moveTo(node.x, node.y);
        context.lineTo(other.x, other.y);
        context.stroke();
      });
    });
    mission.nodes.forEach((node) => {
      if (node.destroyed) return;
      const pulse = 1 + Math.sin(state.elapsed * 6 + node.pulse) * 0.08;
      context.save();
      context.translate(node.x, node.y);
      context.scale(pulse, pulse);
      context.fillStyle = COLORS.enemy;
      context.strokeStyle = COLORS.overdrive;
      context.lineWidth = 3;
      context.fillRect(-18, -22, 36, 44);
      context.strokeRect(-18, -22, 36, 44);
      context.fillStyle = "#fffaf0";
      context.fillRect(-3, -14, 6, 28);
      context.fillRect(-10, -3, 20, 6);
      context.restore();
    });
    context.restore();
  }

  function drawMiniMissionScene() {
    const mission = state.miniMission;
    if (!mission) return;
    if (mission.id === "coaster") drawCoasterMission(mission);
    else if (mission.id === "rings") drawRingMission(mission);
    else if (mission.id === "carrier") drawCarrierMission(mission);
    else if (mission.id === "mothership") drawMothershipMission(mission);
    else if (mission.id === "chain") drawChainMission(mission);
  }

  function drawCoasterCockpit() {
    if (state.miniMission?.id !== "coaster") return;
    context.save();
    context.fillStyle = "rgba(8, 17, 22, 0.82)";
    context.beginPath();
    context.moveTo(0, state.height);
    context.lineTo(0, state.height * 0.76);
    context.lineTo(state.width * 0.17, state.height * 0.9);
    context.lineTo(state.width * 0.36, state.height);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo(state.width, state.height);
    context.lineTo(state.width, state.height * 0.76);
    context.lineTo(state.width * 0.83, state.height * 0.9);
    context.lineTo(state.width * 0.64, state.height);
    context.closePath();
    context.fill();
    context.strokeStyle = COLORS.trajectory;
    context.globalAlpha = 0.62;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(state.width / 2, state.height * 0.88, 48, Math.PI, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  function drawMapStructures() {
    if (!state.mapStructures.length) return;
    const map = getBattleMap(state.mapId);
    context.save();
    state.mapStructures.forEach((structure) => {
      if (structure.destroyed || structure.y > state.height + 80 || structure.y + structure.height < -80) return;
      const { x, y, width, height } = structure;
      const fills = {
        "radar-wall": "#7695a2",
        platform: "#718b95",
        gate: structure.open ? "rgba(56, 139, 151, 0.18)" : "#77a5ad",
        breakable: "#a6bbc0",
        danger: "rgba(185, 73, 56, 0.28)",
        wreck: "#758a8b",
        cargo: "#a98a52",
        "storm-core": "rgba(38, 134, 151, 0.3)",
        "ice-wall": "#8dbbc1",
        "ice-block": "#a5cfd2",
        "aurora-field": "rgba(57, 160, 127, 0.25)",
        reflector: "#789eaa",
        "meteor-rock": "#95675d",
        "meteor-fragment": "#a7796c",
        rift: "rgba(168, 67, 57, 0.28)",
      };
      context.shadowColor = "rgba(25, 55, 68, 0.28)";
      context.shadowBlur = 12;
      context.shadowOffsetY = 8;
      context.fillStyle = fills[structure.kind] || "#aebfc6";
      context.fillRect(x, y, width, height);
      context.shadowBlur = 0;
      context.shadowOffsetY = 0;
      context.fillStyle = "rgba(244, 249, 250, 0.68)";
      context.fillRect(x + 5, y + 5, Math.max(0, width - 10), Math.min(12, height * 0.16));
      context.strokeStyle = "rgba(32, 62, 74, 0.62)";
      context.lineWidth = 2;
      context.strokeRect(x + 1, y + 1, width - 2, height - 2);
      context.strokeStyle = map.accent;
      context.lineWidth = structure.reflective ? 4 : 2;
      context.beginPath();
      context.moveTo(x + 8, y + height - 8);
      context.lineTo(x + width - 8, y + height - 8);
      context.stroke();
      if (structure.kind === "gate") {
        context.strokeStyle = structure.open ? "rgba(35, 127, 141, 0.7)" : "rgba(246, 197, 85, 0.88)";
        context.lineWidth = 3;
        context.setLineDash(structure.open ? [10, 8] : []);
        context.strokeRect(x + 7, y + 7, width - 14, height - 14);
        context.setLineDash([]);
      }
      if (structure.solid === false) {
        context.strokeStyle = structure.damage > 0 ? "rgba(181, 65, 50, 0.86)" : "rgba(50, 143, 124, 0.8)";
        context.lineWidth = 2;
        context.setLineDash([6, 5]);
        context.strokeRect(x + 4, y + 4, width - 8, height - 8);
        context.setLineDash([]);
      }
      if (structure.reflective) {
        context.strokeStyle = "rgba(238, 251, 255, 0.9)";
        context.lineWidth = 1;
        context.setLineDash([8, 7]);
        context.strokeRect(x + 7, y + 7, width - 14, height - 14);
        context.setLineDash([]);
      }
      if (structure.breakable) {
        const ratio = Math.max(0, structure.hp / structure.maxHp);
        context.strokeStyle = "rgba(87, 55, 49, 0.72)";
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(x + width * 0.5, y + 8);
        context.lineTo(x + width * 0.42, y + height * 0.42);
        context.lineTo(x + width * 0.58, y + height * 0.68);
        context.lineTo(x + width * 0.46, y + height - 8);
        context.stroke();
        context.fillStyle = "rgba(22, 45, 54, 0.72)";
        context.fillRect(x + 8, y + height - 19, width - 16, 5);
        context.fillStyle = COLORS.trajectory;
        context.fillRect(x + 9, y + height - 18, (width - 18) * ratio, 3);
      }
    });
    context.restore();
  }

  function drawLaserBeams() {
    if (state.laserWarmup > 0 && state.pendingLaser) {
      const spec = laserModeSpec(state.pendingLaser.mode);
      const progress = 1 - state.laserWarmup / spec.warmup;
      context.save();
      context.strokeStyle = getFighter().accent;
      context.globalAlpha = 0.18 + progress * 0.28;
      context.setLineDash([6, 9]);
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(state.player.x, state.player.y - 24);
      context.lineTo(state.player.x, -20);
      context.stroke();
      context.restore();
    }
    state.laserBeams.forEach((beam) => {
      const alpha = Math.min(1, beam.life / Math.min(0.12, beam.duration));
      const segments = traceLaserBeam(beam);
      context.save();
      context.lineCap = "round";
      segments.forEach((segment) => {
        context.strokeStyle = beam.color;
        context.globalAlpha = 0.14 * alpha;
        context.lineWidth = beam.width * 3.2;
        context.beginPath();
        context.moveTo(segment.x1, segment.y1);
        context.lineTo(segment.x2, segment.y2);
        context.stroke();
        context.globalAlpha = 0.9 * alpha;
        context.lineWidth = beam.width;
        context.beginPath();
        context.moveTo(segment.x1, segment.y1);
        context.lineTo(segment.x2, segment.y2);
        context.stroke();
        context.strokeStyle = "rgba(255, 255, 255, 0.9)";
        context.globalAlpha = 0.8 * alpha;
        context.lineWidth = Math.max(1, beam.width * 0.24);
        context.stroke();
      });
      context.restore();
    });
  }

  function drawScreenLaser() {
    const laser = state.screenLaser;
    if (!laser) return;
    const elapsed = laser.maxLife - laser.life;
    const warning = elapsed < laser.warning;
    const geometry = screenLaserGeometry(laser);
    context.save();
    context.lineCap = "round";
    geometry.forEach((beam) => {
      context.strokeStyle = laser.color;
      context.globalAlpha = warning ? 0.32 : 0.18;
      context.lineWidth = warning ? 2 : 52;
      context.setLineDash(warning ? [8, 10] : []);
      context.beginPath();
      if (beam.vertical) {
        context.moveTo(beam.x, 0);
        context.lineTo(beam.x, state.height);
      } else {
        context.moveTo(0, beam.y);
        context.lineTo(state.width, beam.y);
      }
      context.stroke();
      if (!warning) {
        context.strokeStyle = "rgba(74, 31, 27, 0.34)";
        context.globalAlpha = 1;
        context.lineWidth = beam.vertical ? 42 : 58;
        context.stroke();
        context.strokeStyle = laser.color;
        context.globalAlpha = 0.92;
        context.lineWidth = beam.vertical ? 16 : 22;
        context.stroke();
        context.strokeStyle = "rgba(255, 244, 210, 0.92)";
        context.globalAlpha = 0.78;
        context.lineWidth = 3;
        context.stroke();
      }
    });
    context.restore();
  }

  function drawNuclearStrike() {
    const strike = state.nuclearStrike;
    if (!strike) return;
    context.save();
    context.translate(strike.x, strike.y);
    if (!strike.detonated) {
      const progress = 1 - strike.life / strike.maxLife;
      context.rotate(Math.sin(progress * Math.PI) * 0.18);
      context.shadowColor = getFighter().secondary;
      context.shadowBlur = 18;
      context.fillStyle = "#17385e";
      context.fillRect(-7, -22, 14, 38);
      context.fillStyle = getFighter().secondary;
      context.beginPath();
      context.moveTo(-7, -22);
      context.lineTo(0, -34);
      context.lineTo(7, -22);
      context.closePath();
      context.fill();
      context.fillStyle = getFighter().accent;
      context.fillRect(-13, 8, 26, 6);
      context.fillStyle = `rgba(255, 211, 90, ${0.45 + Math.sin(state.elapsed * 18) * 0.18})`;
      context.beginPath();
      context.moveTo(-5, 16);
      context.lineTo(0, 38 + Math.random() * 12);
      context.lineTo(5, 16);
      context.closePath();
      context.fill();
      context.strokeStyle = "rgba(255, 244, 206, 0.9)";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, -1, 10 + Math.sin(state.elapsed * 12) * 2, 0, Math.PI * 2);
      context.stroke();
    } else {
      const progress = 1 - strike.blastLife / strike.maxBlastLife;
      const maxRadius = Math.hypot(state.width, state.height) * 0.72;
      const shockProgress = Math.min(1, Math.sqrt(progress) * 1.08);
      const radius = 54 + shockProgress * maxRadius;
      context.fillStyle = `rgba(255, 180, 62, ${Math.max(0, 0.24 - progress * 0.2)})`;
      context.fillRect(-strike.x, -strike.y, state.width, state.height);
      const glow = context.createRadialGradient(0, 0, 0, 0, 0, radius);
      glow.addColorStop(0, `rgba(255, 255, 242, ${Math.max(0, 1 - progress * 0.35)})`);
      glow.addColorStop(0.12, `rgba(255, 219, 94, ${Math.max(0, 0.94 - progress * 0.48)})`);
      glow.addColorStop(0.42, `rgba(244, 76, 34, ${Math.max(0, 0.66 - progress * 0.36)})`);
      glow.addColorStop(1, "rgba(255, 104, 49, 0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = `rgba(255, 246, 207, ${Math.max(0, 0.9 - progress)})`;
      context.lineWidth = Math.max(3, 22 * (1 - progress));
      context.beginPath();
      context.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = `rgba(37, 200, 255, ${Math.max(0, 0.68 - progress * 0.62)})`;
      context.lineWidth = 4;
      [0.78, 0.9, 1].forEach((scale) => {
        context.beginPath();
        context.arc(0, 0, radius * scale, 0, Math.PI * 2);
        context.stroke();
      });
      context.globalAlpha = Math.max(0, 1 - progress * 1.25);
      context.fillStyle = "#4d180f";
      context.font = "900 22px Arial Narrow, sans-serif";
      context.textAlign = "center";
      context.fillText("天穹核裁决", 0, 7);
    }
    context.restore();
  }

  function drawHazards() {
    const map = getBattleMap(state.mapId);
    for (const hazard of state.hazards) {
      context.save();
      context.translate(hazard.x, hazard.y);
      context.rotate(hazard.rotation);
      context.lineWidth = 2;
      context.strokeStyle = hazard.type === "radar" ? "#e24b3b" : map.accent;
      context.fillStyle = hazard.type === "storm" ? "rgba(42, 127, 141, 0.22)" : "rgba(31, 52, 61, 0.2)";
      if (hazard.type === "radar") {
        context.beginPath();
        context.arc(0, 0, hazard.radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.beginPath();
        context.moveTo(-hazard.radius, 0);
        context.lineTo(hazard.radius, 0);
        context.moveTo(0, -hazard.radius);
        context.lineTo(0, hazard.radius);
        context.stroke();
        context.fillStyle = "#e24b3b";
        context.fillRect(-5, -5, 10, 10);
      } else if (hazard.type === "storm") {
        for (let ring = 0; ring < 3; ring += 1) {
          context.beginPath();
          context.arc(0, 0, hazard.radius * (1 - ring * 0.22), ring * 0.8, Math.PI * 1.6 + ring * 0.8);
          context.stroke();
        }
      } else {
        context.beginPath();
        for (let point = 0; point < 6; point += 1) {
          const angle = -Math.PI / 2 + point * Math.PI / 3;
          const radius = point % 2 ? hazard.radius * 0.62 : hazard.radius;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (point === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();
        context.fill();
        context.stroke();
      }
      context.restore();
    }
  }

  function drawMeteors() {
    state.meteorWarnings.forEach((warning) => {
      const progress = 1 - warning.life / warning.maxLife;
      context.save();
      context.strokeStyle = "#b64f3f";
      context.fillStyle = "rgba(182, 79, 63, 0.12)";
      context.lineWidth = 2;
      context.setLineDash([8, 7]);
      context.beginPath();
      context.arc(warning.x, warning.y, warning.radius * (1.4 - progress * 0.35), 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.setLineDash([]);
      context.beginPath();
      context.moveTo(warning.x - 58, warning.y - 90);
      context.lineTo(warning.x, warning.y);
      context.stroke();
      context.restore();
    });
    state.meteors.forEach((meteor) => {
      context.save();
      context.translate(meteor.x, meteor.y);
      context.rotate(meteor.rotation);
      context.fillStyle = meteor.large ? "#87574f" : "#a66b5c";
      context.strokeStyle = "#d18b6b";
      context.lineWidth = 3;
      context.beginPath();
      for (let point = 0; point < 8; point += 1) {
        const angle = (Math.PI * 2 * point) / 8;
        const radius = meteor.radius * (point % 2 ? 0.76 : 1);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (point === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.closePath();
      context.fill();
      context.stroke();
      context.fillStyle = "rgba(252, 190, 108, 0.72)";
      context.fillRect(-meteor.radius * 0.18, -meteor.radius * 0.68, meteor.radius * 0.36, meteor.radius * 0.36);
      context.restore();
    });
  }

  function drawSupplyCrates() {
    state.supplyCrates.forEach((crate) => {
      context.save();
      context.translate(crate.x, crate.y);
      if (crate.status === "ready" || crate.status === "deciding" || crate.status === "escorting" || crate.status === "upgraded") {
        const active = crate.status === "escorting";
        const progress = active ? crate.escortProgress / AIRDROP_ESCORT_DURATION : 0;
        context.strokeStyle = active && !crate.playerInside ? "#d44236" : "#49b887";
        context.globalAlpha = 0.2;
        context.lineWidth = 12;
        context.beginPath();
        context.arc(0, 0, crate.escortRadius, 0, Math.PI * 2);
        context.stroke();
        context.globalAlpha = 0.92;
        context.lineWidth = 3;
        context.setLineDash(active ? [] : [9, 7]);
        context.beginPath();
        context.arc(0, 0, crate.escortRadius, -Math.PI / 2, active ? -Math.PI / 2 + Math.PI * 2 * progress : Math.PI * 1.5);
        context.stroke();
        context.setLineDash([]);
        context.fillStyle = active ? "#fffaf0" : "#f1c45e";
        context.font = "900 11px ui-monospace, SFMono-Regular, Menlo, monospace";
        context.textAlign = "center";
        context.fillText(active ? (crate.playerInside ? "护送中" : "返回范围") : "接近选择补给", 0, -crate.escortRadius - 12);
      }
      context.rotate(Math.sin(crate.age * 2.2) * 0.08);
      context.fillStyle = "#2d8582";
      context.strokeStyle = "#f1c45e";
      context.lineWidth = 3;
      context.fillRect(-22, -17, 44, 34);
      context.strokeRect(-22, -17, 44, 34);
      context.fillStyle = "#f1c45e";
      context.fillRect(-4, -17, 8, 34);
      context.fillRect(-22, -4, 44, 8);
      context.restore();
    });
  }

  function drawBarrier() {
    if (state.barrierTimer <= 0) return;
    const pulse = 1 + Math.sin(state.elapsed * 7) * 0.025;
    context.save();
    context.translate(state.player.x, state.player.y - 8);
    context.scale(pulse, pulse);
    context.lineCap = "round";
    context.strokeStyle = COLORS.barrier;
    context.globalAlpha = 0.18;
    context.lineWidth = 18;
    context.beginPath();
    context.arc(0, 0, 84, Math.PI * 1.08, Math.PI * 1.92);
    context.stroke();
    context.globalAlpha = 0.92;
    context.lineWidth = 4;
    context.beginPath();
    context.arc(0, 0, 84, Math.PI * 1.08, Math.PI * 1.92);
    context.stroke();
    context.globalAlpha = 0.42;
    context.lineWidth = 1.5;
    [-8, 8].forEach((offset) => {
      context.beginPath();
      context.arc(0, 0, 84 + offset, Math.PI * 1.12, Math.PI * 1.88);
      context.stroke();
    });
    context.globalAlpha = 1;
    context.fillStyle = COLORS.barrier;
    context.font = "900 12px Arial Narrow, sans-serif";
    context.textAlign = "center";
    context.fillText(`全防御 ${state.barrierTimer.toFixed(1)} 秒`, 0, -94);
    context.restore();
  }

  function drawAllies() {
    state.allies.forEach((ally, index) => {
      context.save();
      context.translate(ally.x, ally.y);
      context.fillStyle = COLORS.ally;
      context.beginPath();
      context.moveTo(0, -15);
      context.lineTo(17, 9);
      context.lineTo(6, 6);
      context.lineTo(0, 13);
      context.lineTo(-6, 6);
      context.lineTo(-17, 9);
      context.closePath();
      context.fill();
      context.fillStyle = getFighter().secondary;
      context.fillRect(-2, -10, 4, 18);
      context.fillStyle = COLORS.ally;
      context.fillRect(-3, 14, 6, 7 + Math.sin(state.elapsed * 8 + index) * 2);

      const ratio = Math.max(0, ally.hp / ally.maxHp);
      context.fillStyle = "rgba(21, 18, 15, 0.86)";
      context.fillRect(-18, 21, 36, 5);
      context.fillStyle = ratio <= 0.3 ? COLORS.enemy : COLORS.ally;
      context.fillRect(-17, 22, 34 * ratio, 3);
      context.restore();
    });
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

    if ((fighter.id === "j20" || fighter.id === "faxx") && stage >= 1) {
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
    const engineCount = fighter.rig?.engineCount || 1;
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
      context.globalAlpha = bullet.source === "ally" ? 0.42 : bullet.source === "wingman" ? 0.58 : 0.94;
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
      } else if (bullet.type === "laser") {
        context.fillRect(-bullet.radius * 0.42, -34, bullet.radius * 0.84, 54);
        context.globalAlpha = 0.24;
        context.fillRect(-bullet.radius * 1.7, -22, bullet.radius * 3.4, 72);
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

    if (enemy.type === "carrier") {
      context.rotate(enemy.vx < 0 ? -Math.PI / 2 : Math.PI / 2);
      context.fillStyle = "#2f7779";
      context.beginPath();
      context.moveTo(0, -44);
      context.lineTo(18, -18);
      context.lineTo(48, 9);
      context.lineTo(18, 15);
      context.lineTo(13, 42);
      context.lineTo(0, 29);
      context.lineTo(-13, 42);
      context.lineTo(-18, 15);
      context.lineTo(-48, 9);
      context.lineTo(-18, -18);
      context.closePath();
      context.fill();
      context.fillStyle = "#f0c15b";
      context.fillRect(-7, -27, 14, 45);
      context.fillStyle = "#183b43";
      context.fillRect(-30, 3, 60, 8);
      context.rotate(enemy.vx < 0 ? Math.PI / 2 : -Math.PI / 2);
      const ratio = Math.max(0, enemy.hp / enemy.maxHp);
      context.fillStyle = "rgba(20, 38, 42, 0.85)";
      context.fillRect(-38, 49, 76, 7);
      context.fillStyle = "#f0c15b";
      context.fillRect(-36, 51, 72 * ratio, 3);
      context.fillStyle = "#173941";
      context.font = "800 11px ui-monospace, monospace";
      context.textAlign = "center";
      context.fillText("空投运输机", 0, 70);
      context.restore();
      return;
    }

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
      context.fillStyle = COLORS.elite;
      context.beginPath();
      context.moveTo(0, enemy.radius + 8);
      context.lineTo(enemy.radius + 10, 5);
      context.lineTo(enemy.radius * 0.64, -enemy.radius + 2);
      context.lineTo(6, -10);
      context.lineTo(0, -enemy.radius - 7);
      context.lineTo(-6, -10);
      context.lineTo(-enemy.radius * 0.64, -enemy.radius + 2);
      context.lineTo(-enemy.radius - 10, 5);
      context.closePath();
      context.fill();
      context.strokeStyle = COLORS.enemyCore;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(-enemy.radius - 4, 1);
      context.lineTo(enemy.radius + 4, 1);
      context.stroke();
      context.fillStyle = COLORS.enemyCore;
      context.beginPath();
      context.arc(0, 1, 7, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = COLORS.boss;
      context.beginPath();
      context.arc(0, 1, 3, 0, Math.PI * 2);
      context.fill();
    } else if (enemy.type === "sniper") {
      context.fillStyle = COLORS.sniper;
      context.beginPath();
      context.moveTo(0, enemy.radius + 8);
      context.lineTo(enemy.radius * 0.72, -enemy.radius * 0.4);
      context.lineTo(5, -enemy.radius - 10);
      context.lineTo(0, -enemy.radius * 0.42);
      context.lineTo(-5, -enemy.radius - 10);
      context.lineTo(-enemy.radius * 0.72, -enemy.radius * 0.4);
      context.closePath();
      context.fill();
      context.fillStyle = COLORS.canvas;
      context.fillRect(-2, -enemy.radius - 4, 4, enemy.radius + 16);
    } else if (enemy.type === "bomber") {
      context.fillStyle = COLORS.bomber;
      context.beginPath();
      context.moveTo(0, enemy.radius + 8);
      context.lineTo(enemy.radius * 1.42, -2);
      context.lineTo(enemy.radius * 1.18, -enemy.radius * 0.72);
      context.lineTo(12, -enemy.radius * 0.42);
      context.lineTo(0, -enemy.radius - 4);
      context.lineTo(-12, -enemy.radius * 0.42);
      context.lineTo(-enemy.radius * 1.18, -enemy.radius * 0.72);
      context.lineTo(-enemy.radius * 1.42, -2);
      context.closePath();
      context.fill();
      context.fillStyle = COLORS.enemyCore;
      context.fillRect(-enemy.radius * 0.72, -7, enemy.radius * 1.44, 8);
      context.fillStyle = COLORS.canvas;
      context.fillRect(-5, -enemy.radius * 0.62, 10, enemy.radius * 1.36);
      context.fillRect(-enemy.radius, 0, 8, 14);
      context.fillRect(enemy.radius - 8, 0, 8, 14);
    } else if (enemy.type === "mineLayer") {
      context.fillStyle = COLORS.mine;
      context.beginPath();
      context.moveTo(0, enemy.radius + 7);
      context.lineTo(enemy.radius + 9, 2);
      context.lineTo(enemy.radius * 0.76, -enemy.radius);
      context.lineTo(7, -10);
      context.lineTo(0, -enemy.radius - 5);
      context.lineTo(-7, -10);
      context.lineTo(-enemy.radius * 0.76, -enemy.radius);
      context.lineTo(-enemy.radius - 9, 2);
      context.closePath();
      context.fill();
      context.fillStyle = COLORS.enemyCore;
      context.fillRect(-4, -13, 8, 26);
      context.strokeStyle = COLORS.canvas;
      context.lineWidth = 3;
      context.strokeRect(-enemy.radius - 3, -1, 10, 13);
      context.strokeRect(enemy.radius - 7, -1, 10, 13);
    } else if (enemy.type === "splitter") {
      context.fillStyle = COLORS.splitter;
      context.beginPath();
      context.moveTo(0, enemy.radius + 6);
      context.lineTo(enemy.radius + 10, 0);
      context.lineTo(enemy.radius * 0.4, -enemy.radius - 9);
      context.lineTo(0, -enemy.radius * 0.35);
      context.lineTo(-enemy.radius * 0.4, -enemy.radius - 9);
      context.lineTo(-enemy.radius - 10, 0);
      context.closePath();
      context.fill();
      context.strokeStyle = COLORS.canvas;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(-enemy.radius * 0.6, -3);
      context.lineTo(enemy.radius * 0.6, 3);
      context.moveTo(-enemy.radius * 0.42, 10);
      context.lineTo(enemy.radius * 0.42, -10);
      context.stroke();
    } else if (enemy.type === "fighter") {
      context.fillStyle = COLORS.fighter;
      context.beginPath();
      context.moveTo(0, enemy.radius + 10);
      context.lineTo(enemy.radius * 1.7, -1);
      context.lineTo(enemy.radius * 0.58, -6);
      context.lineTo(7, -enemy.radius - 8);
      context.lineTo(0, -enemy.radius * 0.5);
      context.lineTo(-7, -enemy.radius - 8);
      context.lineTo(-enemy.radius * 0.58, -6);
      context.lineTo(-enemy.radius * 1.7, -1);
      context.closePath();
      context.fill();
      context.fillStyle = COLORS.enemyCore;
      context.fillRect(-3, -enemy.radius, 6, enemy.radius * 1.8);
      context.fillStyle = COLORS.boss;
      context.fillRect(-enemy.radius * 1.25, 0, 7, 11);
      context.fillRect(enemy.radius * 1.25 - 7, 0, 7, 11);
    } else if (enemy.type === "helicopter") {
      context.fillStyle = COLORS.helicopter;
      context.beginPath();
      context.ellipse(0, 3, 15, 22, 0, 0, Math.PI * 2);
      context.fill();
      context.fillRect(-5, 16, 10, 26);
      context.beginPath();
      context.moveTo(-5, 36);
      context.lineTo(-16, 45);
      context.lineTo(0, 41);
      context.lineTo(16, 45);
      context.lineTo(5, 36);
      context.closePath();
      context.fill();
      context.fillStyle = COLORS.enemyCore;
      context.beginPath();
      context.ellipse(0, -3, 8, 10, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = COLORS.helicopter;
      context.lineWidth = 4;
      context.save();
      context.rotate(state.elapsed * 15 + enemy.phase);
      context.beginPath();
      context.moveTo(-38, 0);
      context.lineTo(38, 0);
      context.moveTo(0, -10);
      context.lineTo(0, 10);
      context.stroke();
      context.restore();
      context.fillStyle = COLORS.boss;
      context.fillRect(-24, 8, 9, 16);
      context.fillRect(15, 8, 9, 16);
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
      const pulse = bullet.pulse ? 1 + Math.sin(bullet.age * 12) * 0.18 : 1;
      context.scale(pulse, pulse);
      if (bullet.kind === "needle") {
        context.fillRect(-bullet.radius * 0.42, -bullet.radius * 2.8, bullet.radius * 0.84, bullet.radius * 5.6);
        context.globalAlpha = 0.25;
        context.fillRect(-bullet.radius * 1.7, 4, bullet.radius * 3.4, bullet.radius * 1.1);
      } else if (bullet.kind === "bolt") {
        context.beginPath();
        context.moveTo(bullet.radius * 2.1, 0);
        context.lineTo(-bullet.radius * 0.2, bullet.radius * 1.35);
        context.lineTo(-bullet.radius * 1.2, 0);
        context.lineTo(-bullet.radius * 0.2, -bullet.radius * 1.35);
        context.closePath();
        context.fill();
      } else if (bullet.kind === "crescent") {
        context.beginPath();
        context.arc(0, 0, bullet.radius, -1.15, 1.15);
        context.lineTo(-bullet.radius * 0.45, 0);
        context.closePath();
        context.fill();
      } else if (bullet.kind === "shell" || bullet.kind === "mine") {
        context.beginPath();
        context.arc(0, 0, bullet.radius, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = COLORS.enemyCore;
        context.beginPath();
        context.arc(0, 0, bullet.radius * 0.36, 0, Math.PI * 2);
        context.fill();
        if (bullet.kind === "mine") {
          context.strokeStyle = bullet.color;
          context.lineWidth = 1.5;
          context.strokeRect(-bullet.radius * 1.1, -bullet.radius * 1.1, bullet.radius * 2.2, bullet.radius * 2.2);
        }
      } else {
        context.beginPath();
        context.arc(0, 0, bullet.radius, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 0.24;
        context.fillRect(-18, -2, 18, 4);
      }
      context.restore();
    }
  }

  function drawPickups() {
    for (const pickup of state.pickups) {
      const pulse = 1 + Math.sin(pickup.age * 6) * 0.12;
      const color = {
        core: COLORS.player,
        evolution: COLORS.evolution,
        trajectory: COLORS.trajectory,
        shield: COLORS.shield,
        barrier: COLORS.barrier,
        ally: COLORS.ally,
        "meteor-core": "#c95f48",
      }[pickup.type] || COLORS.player;
      context.save();
      context.translate(pickup.x, pickup.y);
      context.scale(pulse, pulse);
      context.strokeStyle = color;
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(0, 0, pickup.radius + 6, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = color;

      if (pickup.type === "meteor-core") {
        context.rotate(pickup.age * 0.8);
        context.beginPath();
        for (let point = 0; point < 6; point += 1) {
          const angle = (Math.PI * 2 * point) / 6;
          const radius = point % 2 ? 6 : 12;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (point === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();
        context.fill();
      } else if (pickup.type === "barrier") {
        context.lineWidth = 4;
        context.beginPath();
        context.arc(0, 4, 11, Math.PI * 1.1, Math.PI * 1.9);
        context.stroke();
        context.lineWidth = 1.5;
      } else if (pickup.type === "ally") {
        context.beginPath();
        context.moveTo(0, -11);
        context.lineTo(11, 7);
        context.lineTo(4, 5);
        context.lineTo(0, 10);
        context.lineTo(-4, 5);
        context.lineTo(-11, 7);
        context.closePath();
        context.fill();
      } else if (pickup.type === "shield") {
        context.beginPath();
        context.moveTo(0, -10);
        context.lineTo(9, -5);
        context.lineTo(7, 6);
        context.lineTo(0, 11);
        context.lineTo(-7, 6);
        context.lineTo(-9, -5);
        context.closePath();
        context.fill();
      } else if (pickup.type === "trajectory") {
        [-5, 0, 5].forEach((offset, index) => {
          context.fillRect(offset - 1.5, -9 + Math.abs(index - 1) * 3, 3, 18);
        });
      } else if (pickup.type === "evolution") {
        context.beginPath();
        for (let point = 0; point < 8; point += 1) {
          const angle = -Math.PI / 2 + point * Math.PI / 4;
          const radius = point % 2 ? 5 : 11;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (point === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();
        context.fill();
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

  function drawScreenFeedback() {
    if (state.speedLines > 0 && !reducedMotion) {
      context.save();
      context.strokeStyle = getFighter().accent;
      context.globalAlpha = Math.min(0.18, state.speedLines * 0.12);
      context.lineWidth = 2;
      const centerX = state.width / 2;
      const centerY = state.height * 0.55;
      for (let index = 0; index < 20; index += 1) {
        const angle = (Math.PI * 2 * index) / 20 + state.elapsed * 0.03;
        const start = Math.max(state.width, state.height) * 0.22;
        const end = start + 90 + state.speedLines * 70;
        context.beginPath();
        context.moveTo(centerX + Math.cos(angle) * start, centerY + Math.sin(angle) * start);
        context.lineTo(centerX + Math.cos(angle) * end, centerY + Math.sin(angle) * end);
        context.stroke();
      }
      context.restore();
    }
    if (!state.screenEffect) return;
    const effect = state.screenEffect;
    const progress = 1 - effect.life / effect.maxLife;
    context.save();
    context.strokeStyle = effect.color;
    context.globalAlpha = Math.max(0, (1 - progress) * 0.34 * effect.intensity);
    context.lineWidth = 8 + effect.intensity * 8;
    context.strokeRect(6, 6, state.width - 12, state.height - 12);
    context.globalAlpha *= 0.5;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(state.width / 2, state.height / 2, 50 + progress * Math.max(state.width, state.height) * 0.65, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  function draw() {
    context.save();
    if (state.shake > 0) {
      context.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    if (state.miniMission?.id === "coaster" && !reducedMotion) {
      const mission = state.miniMission;
      const bank = mission.cameraRoll || 0;
      const speedScale = 1.035 + Math.max(0, (mission.trackSpeed || 1) - 1) * 0.025;
      context.translate(state.width / 2, state.height / 2);
      context.rotate(bank);
      context.scale(speedScale, speedScale);
      context.translate(-state.width / 2, -state.height / 2);
    }
    drawBackground();
    drawMiniMissionScene();
    if (!state.miniMission) {
      drawMapStructures();
      drawHazards();
      drawMeteors();
      drawSupplyCrates();
    }
    drawPlayerBullets();
    if (!state.miniMission) state.enemies.forEach(drawEnemy);
    drawLaserBeams();
    drawScreenLaser();
    if (!state.miniMission) drawPickups();
    drawParticles();
    drawAllies();
    drawBarrier();
    drawPlayer();
    drawCoasterCockpit();
    drawNuclearStrike();
    drawScreenFeedback();
    if (!state.miniMission) drawEnemyBullets();
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
    if (state.hitStop > 0) {
      state.hitStop = Math.max(0, state.hitStop - dt);
    } else {
      update(dt);
    }
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
        trajectoryLevel: state.trajectoryLevel,
        fighterId: state.fighterId,
        transformStage: state.transformStage,
        transformProgress: state.transformProgress,
        transformTarget: state.transformTarget,
        transformEnergy: state.transformEnergy,
        transformCores: state.transformCores,
        transformElapsed: state.transformElapsed,
        assaultFormIndex: state.assaultFormIndex,
        assaultFireRateMultiplier: assaultFireSpec(state.transformProgress, state.fighterId).rateMultiplier,
        assaultProjectileBonus: assaultFireSpec(state.transformProgress, state.fighterId).projectileBonus,
        toolModeIndex: state.toolModeIndex,
        toolMode: toolModeSpec(state.fighterId, state.toolModeIndex).id,
        tacticalCooldown: state.tacticalCooldown,
        wingmanTimer: state.wingmanTimer,
        wingmanCooldown: state.wingmanCooldown,
        wingmanUses: state.wingmanUses,
        wingmanCount: state.wingmanPositions.length,
        passiveStatus: passiveStatus.textContent,
        passivePower: state.passivePower,
        pierceBonus: state.pierceBonus,
        tacticalProjectileBonus: state.tacticalProjectileBonus,
        droneBonus: state.droneBonus,
        revengeCharge: state.revengeCharge,
        overclockStacks: state.overclockStacks,
        bossKills: state.bossKills,
        visual3d: Boolean(visuals?.available),
        rigSignature: visuals?.getRigSignature?.() || "",
        hangarInteraction: visuals?.getHangarInteraction?.() || null,
        hangarPreview: visuals?.getHangarPreview?.() || null,
        maxHealth: state.maxHealth,
        health: state.health,
        shieldCharges: state.shieldCharges,
        playerX: state.player.x,
        playerY: state.player.y,
        barrierTimer: state.barrierTimer,
        barrierHits: state.barrierHits,
        allies: state.allies.map((ally) => ({ hp: ally.hp, maxHp: ally.maxHp })),
        overdrive: state.overdrive,
        bullets: state.bullets.length,
        bulletTypes: state.bullets.reduce((counts, bullet) => {
          counts[bullet.type] = (counts[bullet.type] || 0) + 1;
          return counts;
        }, {}),
        enemyBullets: state.enemyBullets.length,
        enemyBulletKinds: state.enemyBullets.reduce((counts, bullet) => {
          counts[bullet.kind] = (counts[bullet.kind] || 0) + 1;
          return counts;
        }, {}),
        enemies: state.enemies.map((enemy) => enemy.type),
        mapId: state.mapId,
        combatPhase: combatPhase(state.elapsed),
        laserHeat: state.laserHeat,
        laserWarmup: state.laserWarmup,
        laserBeams: state.laserBeams.length,
        screenLaser: state.screenLaser ? { life: state.screenLaser.life, beamCount: state.screenLaser.beamCount } : null,
        nuclearStrike: state.nuclearStrike ? { detonated: state.nuclearStrike.detonated, life: state.nuclearStrike.life } : null,
        nuclearDetonations: state.nuclearDetonations,
        screenEffect: state.screenEffect?.type || null,
        firepowerTimer: state.firepowerTimer,
        meteorPierceTimer: state.meteorPierceTimer,
        meteorWarnings: state.meteorWarnings.length,
        meteorImpacts: state.meteorImpacts,
        meteors: state.meteors.map((meteor) => ({ id: meteor.id, hp: meteor.hp, large: meteor.large })),
        supplyCrates: state.supplyCrates.map((crate) => ({
          reward: crate.reward,
          status: crate.status,
          x: crate.x,
          y: crate.y,
          hp: crate.hp,
          maxHp: crate.maxHp,
          escortProgress: crate.escortProgress,
          playerInside: crate.playerInside,
        })),
        airdropDecision: state.airdropDecision ? { ...state.airdropDecision } : null,
        airdropEscortsCompleted: state.airdropEscortsCompleted,
        airdropEscortsFailed: state.airdropEscortsFailed,
        pickupTypes: state.pickups.map((pickup) => pickup.type),
        activeAirdropId: state.activeAirdropId,
        laserBurns: state.enemies.filter((enemy) => enemy.laserBurn > 0).map((enemy) => ({ type: enemy.type, layers: enemy.laserBurn })),
        structures: state.mapStructures.filter((structure) => !structure.destroyed).map((structure) => ({
          id: structure.id,
          kind: structure.kind,
          x: structure.x,
          y: structure.y,
          width: structure.width,
          height: structure.height,
          open: structure.open,
          solid: structure.solid,
          breakable: structure.breakable,
        })),
        hazards: state.hazards.map((hazard) => hazard.type),
        bossPhases: state.enemies.filter((enemy) => enemy.type === "boss").map((enemy) => enemy.bossPhase),
        missionPendingId: state.missionPendingId,
        miniMission: state.miniMission ? {
          id: state.miniMission.id,
          timer: state.miniMission.timer,
          onTrack: state.miniMission.onTrack || 0,
          segmentLabel: state.miniMission.segmentLabel || "",
          boostCount: state.miniMission.boostCount || 0,
          passed: state.miniMission.passed || 0,
          missed: state.miniMission.missed || 0,
          dockTime: state.miniMission.dockTime || 0,
          destroyedParts: state.miniMission.parts?.filter((part) => part.destroyed).length || 0,
          chainMax: state.miniMission.chainMax || 0,
        } : null,
        completedMiniMissions: [...state.completedMiniMissions],
        skippedMiniMissions: [...state.skippedMiniMissions],
        miniMissionResults: [...state.miniMissionResults],
      }),
      addCore: () => collectPowerCore(),
      collectPickup: (type) => collectPickup(type),
      selectFighter: (fighterId) => selectFighter(fighterId),
      spawnBoss: () => {
        if (!state.enemies.some((enemy) => enemy.type === "boss")) spawnBoss();
      },
      spawnEnemyType: (type, options = {}) => {
        if (!ENEMY_CONFIGS[type]) return null;
        const x = Number.isFinite(options.x) ? options.x : state.width / 2;
        const enemy = makeEnemy(type, Math.max(34, Math.min(state.width - 34, x)));
        enemy.y = Number.isFinite(options.y) ? options.y : Math.min(180, state.height * 0.24);
        if (Number.isFinite(options.hp)) {
          enemy.hp = options.hp;
          enemy.maxHp = options.hp;
        }
        if (options.fireNow) enemy.fireTimer = 0.02;
        state.enemies.push(enemy);
        return enemy.type;
      },
      clearHazards: () => {
        state.enemies = state.enemies.filter((enemy) => enemy.type === "boss");
        state.enemyBullets = [];
        state.hazards = [];
      },
      clearStructures: () => {
        state.mapStructures = [];
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
      setHealth: (value) => {
        state.health = Math.max(0, Math.min(state.maxHealth, Number(value) || 0));
        updateHud();
      },
      toggleTransform: () => toggleTransform(),
      cycleToolMode: () => cycleToolMode(),
      fireTactical: () => fireTactical(),
      setTacticalCooldown: (seconds = 0) => {
        state.tacticalCooldown = Math.max(0, Number(seconds) || 0);
        updateAbilityHud();
      },
      summonWingmen: () => summonWingmen(),
      setTransformCores: (value) => {
        state.transformCores = Math.max(0, Math.min(TRANSFORM_CORE_COST, Math.trunc(Number(value) || 0)));
        updateAbilityHud();
      },
      hitFirstAlly: (damage = 10) => {
        if (state.allies[0]) damageAlly(state.allies[0], Math.max(0, Number(damage) || 0));
      },
      setMap: (mapId) => {
        selectMap(mapId, false);
        state.mapStructures = createMapStructures(state.mapId, state.width, state.height);
        state.hazards = [];
        state.meteorWarnings = [];
        state.meteors = [];
        state.mapEventTimer = 12;
        state.meteorTimer = state.mapId === "meteor-rift" ? 5.5 : 16;
      },
      setElapsed: (seconds) => {
        state.elapsed = Math.max(0, Number(seconds) || 0);
      },
      placeStructureAtPlayer: () => {
        const structure = state.mapStructures.find((item) => !item.destroyed);
        if (!structure) return false;
        structure.x = state.player.x - structure.width / 2;
        structure.y = state.player.y - structure.height / 2;
        state.structureCollisionCooldown = 0;
        return true;
      },
      showcaseStructures: () => {
        state.mapStructures.forEach((structure, index) => {
          structure.y = index < 5 ? 110 + Math.floor(index / 2) * 220 : -state.height * (1 + index * 0.4);
          structure.x = Math.max(0, Math.min(state.width - structure.width, structure.originX));
          structure.destroyed = false;
          structure.hp = structure.maxHp;
        });
      },
      setPointerPosition: (x, y) => {
        state.pointer.x = Math.max(0, Math.min(state.width, Number(x) || 0));
        state.pointer.y = Math.max(0, Math.min(state.height, Number(y) || 0));
        state.pointer.active = true;
      },
      spawnHazard: () => spawnHazard(),
      setTransformElapsed: (seconds) => {
        state.transformElapsed = Math.max(0, Math.min(TRANSFORM_DURATION, Number(seconds) || 0));
      },
      spawnHazardAtPlayer: () => {
        const map = getBattleMap(state.mapId);
        const type = map.event === "lightning" ? "storm" : map.event === "aurora" ? "crystal" : "radar";
        state.hazards.push({
          type,
          name: type === "radar" ? "雷达浮标" : type === "storm" ? "雷暴核心" : "极光晶体",
          x: state.player.x,
          y: state.player.y,
          radius: 28,
          speed: 0,
          drift: 0,
          phase: 0,
          rotation: 0,
        });
      },
      destroyBoss: () => {
        const index = state.enemies.findIndex((enemy) => enemy.type === "boss");
        if (index >= 0) killEnemy(index);
      },
      spawnMeteor: (large = false) => spawnMeteorWarning({ x: state.width / 2, y: state.height * 0.34, large: Boolean(large) }),
      launchMeteorNow: (large = false) => {
        const isLarge = Boolean(large);
        launchMeteor({
          x: state.width / 2,
          y: state.height * 0.34,
          radius: isLarge ? 34 : 20,
          large: isLarge,
        });
        return true;
      },
      damageFirstMeteor: (amount = 100) => {
        const meteor = state.meteors[0];
        return meteor ? damageMeteor(meteor, Number(amount) || 0) : false;
      },
      impactFirstMeteor: () => {
        const meteor = state.meteors.shift();
        if (!meteor) return false;
        impactMeteor(meteor);
        return true;
      },
      spawnAirdrop: () => {
        state.airdropTimer = 0;
        return spawnAirdropCarrier();
      },
      destroyAirdrop: () => {
        const index = state.enemies.findIndex((enemy) => enemy.type === "carrier");
        if (index >= 0) killEnemy(index);
      },
      collectFirstSupply: () => {
        const crate = state.supplyCrates.shift();
        if (crate) collectSupplyReward(crate.reward);
        return crate?.reward || null;
      },
      openFirstSupplyChoice: (upgraded = false) => {
        const crate = state.supplyCrates[0];
        if (!crate) return false;
        crate.y = crate.targetY;
        crate.status = upgraded ? "upgraded" : "ready";
        return openAirdropChoice(crate, Boolean(upgraded));
      },
      chooseAirdropReward: (choice) => chooseTacticalAirdrop(choice),
      startAirdropEscort: () => startAirdropEscort(),
      completeAirdropEscort: () => {
        const crate = getActiveEscortCrate();
        if (!crate) return false;
        crate.playerInside = true;
        crate.escortProgress = AIRDROP_ESCORT_DURATION;
        updateSupplyCrates(0);
        return true;
      },
      damageAirdrop: (amount = 100) => {
        const crate = getActiveEscortCrate();
        return crate ? damageAirdropCrate(crate, Math.max(0, Number(amount) || 0)) : false;
      },
      grantSupply: (reward) => {
        if (!["firepower", "transform", "defense", "wingman", "skyfire"].includes(reward)) return false;
        collectSupplyReward(reward);
        return true;
      },
      setToolMode: (index) => {
        state.toolModeIndex = Math.max(0, Math.min(getFighter().toolModes.length - 1, Math.trunc(Number(index) || 0)));
        updateAbilityHud();
      },
      triggerScreenLaser: () => startScreenLaser(),
      clearScreenLaser: () => {
        state.screenLaser = null;
        state.screenLaserCooldown = 0;
      },
      showMiniMission: (missionId) => showMissionBriefing(missionId),
      startMiniMission: (missionId) => {
        missionBriefing.hidden = true;
        gameScreen.classList.remove("is-mission-paused");
        state.missionPendingId = null;
        return beginMiniMission(missionId);
      },
      acceptMiniMission: () => beginMiniMission(state.missionPendingId),
      skipMiniMission: () => skipPendingMiniMission(),
      completeMiniMission: () => {
        const mission = state.miniMission;
        if (!mission) return false;
        if (mission.id === "coaster") {
          mission.onTrack = mission.targetOnTrack;
          updateMiniMission(0);
        } else if (mission.id === "rings") {
          mission.passed = mission.target;
          finishMiniMission(true, "五环全连 // 获得 1 个能量球");
        } else if (mission.id === "carrier") {
          state.player.x = mission.carrier.x;
          state.player.y = mission.carrier.y;
          mission.dockTime = 2;
          updateMiniMission(0);
        } else if (mission.id === "mothership") {
          mission.parts.slice().forEach((part) => damageMissionPart(part, 999));
        } else if (mission.id === "chain") {
          const node = mission.nodes.find((item) => !item.destroyed);
          if (node) detonateChainNode(node.id);
        }
        return true;
      },
    };
  }

  startButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", restartGame);
  menuButton.addEventListener("click", exitGame);
  missionEnter.addEventListener("click", async () => {
    await audio?.unlock();
    beginMiniMission(state.missionPendingId);
  });
  missionSkip.addEventListener("click", skipPendingMiniMission);
  airdropDefense.addEventListener("click", async () => {
    await audio?.unlock();
    chooseTacticalAirdrop("defense");
  });
  airdropFirepower.addEventListener("click", async () => {
    await audio?.unlock();
    chooseTacticalAirdrop("firepower");
  });
  airdropEscort.addEventListener("click", async () => {
    await audio?.unlock();
    startAirdropEscort();
  });
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
  rulesButton.addEventListener("click", async () => {
    await audio?.unlock();
    audio?.brief?.(true);
    rulesDialog.showModal();
  });
  rulesClose.addEventListener("click", () => {
    audio?.brief?.(false);
    rulesDialog.close();
  });
  rulesDialog.addEventListener("click", (event) => {
    if (event.target === rulesDialog) {
      audio?.brief?.(false);
      rulesDialog.close();
    }
  });
  function cancelHypersonicLaunch() {
    pendingHypersonicLaunch = false;
    unlockDialog.close();
  }

  unlockClose.addEventListener("click", cancelHypersonicLaunch);
  unlockDialog.addEventListener("click", (event) => {
    if (event.target === unlockDialog) cancelHypersonicLaunch();
  });
  unlockDialog.addEventListener("cancel", () => {
    pendingHypersonicLaunch = false;
  });
  unlockForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (unlockPassword.value !== HYPERSONIC_CONCEPT_CODE) {
      unlockError.hidden = false;
      unlockPassword.select();
      audio?.transformDenied?.();
      return;
    }
    const shouldLaunch = pendingHypersonicLaunch;
    pendingHypersonicLaunch = false;
    unlockError.hidden = true;
    unlockDialog.close();
    selectFighter("hypersonic", false);
    await audio?.unlock();
    audio?.fighterSelect?.("hypersonic");
    if (shouldLaunch) await startGame({ conceptVerified: true });
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
      summonWingmen();
    } else if (event.key.toLowerCase() === "e" && !gameScreen.hidden) {
      event.preventDefault();
      fireTactical();
    }
  });
  canvas.addEventListener("pointermove", (event) => setPointer(event.clientX, event.clientY));
  canvas.addEventListener("pointerdown", (event) => {
    setPointer(event.clientX, event.clientY);
    if (event.pointerType === "mouse" && event.button === 0) cycleToolMode();
    if (event.pointerType === "mouse" && event.button === 2) toggleTransform();
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  skillButton.addEventListener("click", cycleToolMode);
  transformButton.addEventListener("click", toggleTransform);
  wingmanButton.addEventListener("click", summonWingmen);

  const forceCanvas = new URLSearchParams(window.location.search).get("renderer") === "canvas";
  visuals = forceCanvas
    ? { available: false, setFighter() {}, setPreviewMode() {}, setToolMode() {}, resizeBattle() {}, renderBattle() {}, getRigSignature() { return ""; }, getHangarInteraction() { return null; }, getHangarPreview() { return null; }, dispose() {} }
    : createVisualSystem({
      hangarCanvas: fighterPreview,
      battleCanvas: battleThreeCanvas,
      fighter: getFighter(),
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
  createIcons({
    icons: {
      BookOpen,
      Bot,
      ChevronDown,
      Crosshair,
      KeyRound,
      Lock,
      LogOut,
      Map,
      MousePointer2,
      Plane,
      Play,
      RefreshCw,
      Volume2,
      VolumeX,
      X,
      Zap,
    },
    attrs: {
      "aria-hidden": "true",
      "stroke-width": 1.8,
    },
  });
  initializeHangar();
  syncAudioControls();
  installQaControls();
})();
