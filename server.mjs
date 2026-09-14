import { CloseCode, Room, defineRoom, defineServer } from "colyseus";
import { FIGHTERS } from "./fighter-profiles.js";
import { BulletState, EnemyState, GameState, PickupState, PlayerState, SimState, WorldState } from "./multiplayer-state.js";
import {
  MAX_PLAYERS,
  SERVER_TICK_RATE,
  SNAPSHOT_RATE,
  createRoomCode,
  duelHealth,
  isDuelFighterAllowed,
  normalizeMatchConfig,
  normalizeNickname,
  validInput,
} from "./multiplayer-rules.js";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const WIDTH = 960;
const HEIGHT = 720;
function broadcast(room, type, payload = {}) {
  room.broadcast(type, payload);
}

function publicPlayer(player) {
  return {
    id: player.id,
    nickname: player.nickname,
    fighterId: player.fighterId,
    ready: player.ready,
    connected: player.connected,
    score: player.score,
    roundWins: player.roundWins,
    rescues: player.rescues,
    syncStrikes: player.syncStrikes,
    pickups: player.pickups,
  };
}

function lobby(room) {
  return {
    roomCode: room.code,
    mode: room.mode,
    hostId: room.hostId,
    config: room.config,
    status: room.status,
    players: room.players.map(publicPlayer),
  };
}

function copyFields(target, source, fields) {
  fields.forEach((field) => { target[field] = source?.[field] ?? target[field]; });
}

function syncCollection(target, items, Klass, fields) {
  const alive = new Set();
  items.forEach((item) => {
    const key = String(item.id);
    alive.add(key);
    let state = target.get(key);
    if (!state) { state = new Klass(); target.set(key, state); }
    copyFields(state, item, fields);
  });
  [...target.keys()].forEach((key) => { if (!alive.has(key)) target.delete(key); });
}

function syncState(room) {
  const state = room.state;
  state.phase = room.status;
  state.mode = room.mode;
  state.hostSessionId = room.hostId;
  state.serverTime = Date.now();
  state.configJson = JSON.stringify(room.config);
  const now = Date.now();
  const world = room.world;
  state.world.elapsed = world ? (now - world.startedAt) / 1000 : 0;
  state.world.round = world?.round || 0;
  state.world.roundLeft = world ? Math.max(0, room.config.roundSeconds - (now - world.roundStartedAt) / 1000) : 0;
  state.world.link = world?.link || 0;
  state.world.respawns = world?.respawns || 0;
  state.world.event = world?.event || "";
  syncCollection(state.world.enemies, world?.enemies || [], EnemyState, ["id", "x", "y", "hp", "maxHp", "radius", "speed", "elite"]);
  syncCollection(state.world.bullets, world?.bullets || [], BulletState, ["id", "ownerId", "x", "y", "vx", "vy", "damage", "kind", "life"]);
  syncCollection(state.world.pickups, world?.pickups || [], PickupState, ["id", "x", "y", "type", "life"]);
  room.players.forEach((player) => {
    let playerState = state.players.get(player.id);
    if (!playerState) { playerState = new PlayerState(); playerState.id = player.id; playerState.sim = new SimState(); state.players.set(player.id, playerState); }
    copyFields(playerState, player, ["nickname", "fighterId", "ready", "connected", "score", "roundWins", "rescues", "syncStrikes", "pickups"]);
    if (player.sim) copyFields(playerState.sim, player.sim, ["x", "y", "targetX", "targetY", "health", "maxHealth", "cores", "transformUntil", "tacticalUntil", "wingmanUntil", "downedUntil", "reviveProgress", "invulnerableUntil"]);
  });
  const playerIds = new Set(room.players.map((player) => player.id));
  [...state.players.keys()].forEach((key) => { if (!playerIds.has(key)) state.players.delete(key); });
}

function syncLobby(room) {
  syncState(room);
  broadcast(room, "lobby", { room: lobby(room) });
}

function initialPlayer(slot, mode, config) {
  const x = mode === "duel" ? (slot === 0 ? WIDTH * 0.22 : WIDTH * 0.78) : WIDTH * (slot === 0 ? 0.42 : 0.58);
  const y = mode === "duel" ? HEIGHT * 0.7 : HEIGHT * 0.76;
  const maxHealth = mode === "duel" ? duelHealth(config) : 170;
  return {
    x, y, targetX: x, targetY: y, health: maxHealth, maxHealth, cores: 0,
    transformUntil: 0, tacticalUntil: 0, wingmanUntil: 0, downedUntil: 0,
    reviveProgress: 0, invulnerableUntil: 0, lastAction: "", actionUntil: 0, nextFireAt: 0,
  };
}

function startMatch(room) {
  room.status = "playing";
  room.world = {
    startedAt: Date.now(), roundStartedAt: Date.now(), round: 1, link: 0, linkWindow: {},
    enemies: [], bullets: [], pickups: [], nextId: 1, spawnAt: Date.now() + 1200, nextPickupAt: Date.now() + 7000,
    respawns: 2, roundWinner: "", matchWinner: "", event: "合作远征开始",
  };
  room.players.forEach((player, index) => {
    player.ready = false;
    player.score = 0;
    player.roundWins = 0;
    player.rescues = 0;
    player.syncStrikes = 0;
    player.pickups = 0;
    player.input = { x: index ? 0.58 : 0.42, y: 0.76, action: "" };
    player.sim = initialPlayer(index, room.mode, room.config);
  });
  broadcast(room, "matchStart", { room: lobby(room) });
  syncLobby(room);
}

function resetRound(room) {
  room.world.roundStartedAt = Date.now();
  room.world.bullets = [];
  room.world.pickups = [];
  room.world.link = 0;
  room.world.nextPickupAt = Date.now() + 7000;
  room.world.roundWinner = "";
  room.players.forEach((player, index) => { player.sim = initialPlayer(index, room.mode, room.config); });
}

function endMatch(room, winnerId = "") {
  if (!room.world || room.status === "finished") return;
  room.status = "finished";
  room.world.matchWinner = winnerId;
  broadcast(room, "matchEnd", { winnerId, room: lobby(room), stats: room.players.map(publicPlayer) });
  syncLobby(room);
}

function finishRound(room, winnerId, reason) {
  if (room.world.roundWinner) return;
  room.world.roundWinner = winnerId || "draw";
  const winner = room.players.find((player) => player.id === winnerId);
  if (winner) winner.roundWins += 1;
  broadcast(room, "roundEnd", { winnerId, reason, round: room.world.round, scores: room.players.map(publicPlayer) });
  if (!winner) {
    setTimeout(() => { if (room.status === "playing") resetRound(room); }, 1300);
    return;
  }
  if (winner.roundWins >= room.config.roundsToWin) {
    setTimeout(() => endMatch(room, winnerId), 1300);
    return;
  }
  room.world.round += 1;
  setTimeout(() => { if (room.status === "playing") resetRound(room); }, 1300);
}

function fighterDamage(player, room) {
  const fighter = FIGHTERS[player.fighterId] || FIGHTERS.f22;
  const transformed = player.sim.transformUntil > Date.now();
  const loadout = room.config.loadout;
  const loadoutBonus = loadout === "laser" ? 1.15 : loadout === "rail" ? 1.22 : loadout === "heavy" ? 1.35 : loadout === "swarm" ? 1.08 : 1;
  const wingman = player.sim.wingmanUntil > Date.now() ? 1.24 : 1;
  return Math.max(7, fighter.damage * 10 * loadoutBonus * wingman * (transformed ? 1.55 : 1));
}

function addBullet(room, source, target, damage, kind = "pulse") {
  const targetX = target.sim?.x ?? target.x;
  const targetY = target.sim?.y ?? target.y;
  if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) return;
  const dx = targetX - source.sim.x;
  const dy = targetY - source.sim.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  room.world.bullets.push({ id: room.world.nextId++, ownerId: source.id, x: source.sim.x, y: source.sim.y, vx: dx / length * 680, vy: dy / length * 680, damage, kind, life: 1.35 });
}

function addEnemy(room) {
  const id = room.world.nextId++;
  const elite = room.world.enemies.length % 7 === 6;
  room.world.enemies.push({ id, x: 90 + Math.random() * (WIDTH - 180), y: -35, hp: elite ? 160 : 52, maxHp: elite ? 160 : 52, radius: elite ? 25 : 17, speed: elite ? 48 : 74, fireAt: Date.now() + 1200 + Math.random() * 1300, elite });
}

function killCoopEnemy(room, enemy, owner) {
  room.world.enemies = room.world.enemies.filter((item) => item.id !== enemy.id);
  owner.score += enemy.elite ? 500 : 100;
  room.world.link = Math.min(100, room.world.link + (enemy.elite ? 14 : 5));
  if (Math.random() < 0.18) room.world.pickups.push({ id: room.world.nextId++, x: enemy.x, y: enemy.y, type: Math.random() < 0.65 ? "core" : "heal", life: 10 });
}

function activateAction(room, player, action, now) {
  const sim = player.sim;
  if (!action || sim.actionUntil > now) return;
  sim.lastAction = action;
  sim.actionUntil = now + 180;
  if (action === "transform" && room.config.transform && sim.cores >= 3) {
    sim.cores = 0;
    sim.transformUntil = now + 10_000;
  }
  if (action === "tactical" && sim.tacticalUntil <= now) {
    sim.tacticalUntil = now + room.config.skillCooldown * 1000;
    if (room.mode === "duel") {
      const target = room.players.find((item) => item.id !== player.id);
      if (target?.sim && target.sim.downedUntil <= now) addBullet(room, player, target, fighterDamage(player, room) * 2.15, "tactical");
    } else {
      room.world.enemies.forEach((enemy) => { enemy.hp -= fighterDamage(player, room) * 0.8; });
    }
    room.world.linkWindow[player.id] = now;
    const other = room.players.find((item) => item.id !== player.id);
    if (room.mode === "coop" && room.world.link >= 100 && other && now - (room.world.linkWindow[other.id] || 0) < 1000) {
      room.world.enemies.forEach((enemy) => { enemy.hp = 0; });
      room.world.bullets = [];
      room.world.link = 0;
      room.world.event = "同步合击 // 天穹共鸣";
      player.syncStrikes += 1;
      other.syncStrikes += 1;
    }
  }
  if (action === "wingman" && sim.wingmanUntil <= now) sim.wingmanUntil = now + 9_000;
}

function updatePlayers(room, dt, now) {
  room.players.forEach((player) => {
    const sim = player.sim;
    if (!sim || !player.connected) return;
    const input = player.input || { x: 0.5, y: 0.75 };
    sim.targetX = input.x * WIDTH;
    sim.targetY = input.y * HEIGHT;
    const dx = sim.targetX - sim.x;
    const dy = sim.targetY - sim.y;
    const length = Math.hypot(dx, dy);
    const step = 420 * dt;
    if (length > 1) { sim.x += dx / length * Math.min(step, length); sim.y += dy / length * Math.min(step, length); }
    sim.x = Math.max(22, Math.min(WIDTH - 22, sim.x));
    sim.y = Math.max(45, Math.min(HEIGHT - 28, sim.y));
    activateAction(room, player, input.action, now);
    player.input.action = "";
  });
  if (room.mode === "coop" && room.players.length === 2 && room.players.every((player) => player.connected)) {
    const [a, b] = room.players;
    if (a.sim.downedUntil <= now && b.sim.downedUntil <= now && Math.hypot(a.sim.x - b.sim.x, a.sim.y - b.sim.y) < 120) room.world.link = Math.min(100, room.world.link + dt * 4.5);
    for (const downed of room.players.filter((item) => item.sim.downedUntil > now)) {
      const rescuer = room.players.find((item) => item.id !== downed.id && item.sim.downedUntil <= now);
      if (rescuer && Math.hypot(rescuer.sim.x - downed.sim.x, rescuer.sim.y - downed.sim.y) < 86) {
        downed.sim.reviveProgress += dt;
        if (downed.sim.reviveProgress >= 2) { downed.sim.downedUntil = 0; downed.sim.health = downed.sim.maxHealth * 0.42; downed.sim.invulnerableUntil = now + 1500; downed.sim.reviveProgress = 0; room.world.link = Math.min(100, room.world.link + 25); rescuer.rescues += 1; }
      } else downed.sim.reviveProgress = 0;
    }
  }
}

function updateCoop(room, dt, now) {
  const world = room.world;
  if (now >= world.spawnAt && world.enemies.length < 14) { addEnemy(room); world.spawnAt = now + 850; }
  const living = room.players.filter((player) => player.connected && player.sim.downedUntil <= now);
  for (const enemy of world.enemies) {
    enemy.y += enemy.speed * dt;
    if (now >= enemy.fireAt && living.length) {
      const target = living[Math.floor(Math.random() * living.length)];
      target.sim.health -= enemy.elite ? 15 : 8;
      enemy.fireAt = now + 1250 + Math.random() * 900;
    }
  }
  for (const player of living) {
    const target = world.enemies.reduce((closest, enemy) => !closest || Math.hypot(enemy.x - player.sim.x, enemy.y - player.sim.y) < Math.hypot(closest.x - player.sim.x, closest.y - player.sim.y) ? enemy : closest, null);
    if (target && now >= player.sim.nextFireAt) {
      addBullet(room, player, { x: target.x, y: target.y }, fighterDamage(player, room), "auto");
      player.sim.nextFireAt = now + 420;
    }
  }
  for (const player of room.players) {
    if (player.sim.health <= 0 && player.sim.downedUntil <= now) {
      player.sim.downedUntil = now + 7000;
      player.sim.reviveProgress = 0;
      player.sim.health = 0;
    }
    if (player.sim.downedUntil && player.sim.downedUntil <= now) {
      if (world.respawns > 0) { world.respawns -= 1; player.sim = { ...initialPlayer(room.players.indexOf(player), room.mode, room.config), health: player.sim.maxHealth * 0.5, invulnerableUntil: now + 1500 }; }
      else endMatch(room, room.players.find((item) => item.id !== player.id)?.id || "");
    }
  }
}

function updateDuel(room, dt, now) {
  const [a, b] = room.players;
  if (!a || !b || !a.connected || !b.connected) return;
  if (room.config.pickups !== "off" && now >= room.world.nextPickupAt) {
    const chaos = room.config.pickups === "chaos";
    room.world.pickups.push({
      id: room.world.nextId++, x: WIDTH * (0.35 + Math.random() * 0.3), y: HEIGHT * (0.28 + Math.random() * 0.3),
      type: chaos && Math.random() > 0.5 ? "heal" : "core", life: 8,
    });
    room.world.nextPickupAt = now + (chaos ? 4800 : 7500);
  }
  if (!room.world.roundWinner) {
    if (now >= a.sim.nextFireAt) { addBullet(room, a, b, fighterDamage(a, room), "auto"); a.sim.nextFireAt = now + 460; }
    if (now >= b.sim.nextFireAt) { addBullet(room, b, a, fighterDamage(b, room), "auto"); b.sim.nextFireAt = now + 460; }
  }
  const elapsed = (now - room.world.roundStartedAt) / 1000;
  if (room.config.victory === "elimination" && (a.sim.health <= 0 || b.sim.health <= 0)) {
    const winner = a.sim.health <= 0 ? b : a;
    finishRound(room, winner.id, "击毁");
  } else if (elapsed >= room.config.roundSeconds) {
    const primary = room.config.victory === "score" ? [a.score, b.score] : [a.sim.health, b.sim.health];
    const winner = primary[0] === primary[1] ? null : primary[0] > primary[1] ? a : b;
    finishRound(room, winner?.id || "", winner ? room.config.victory === "score" ? "得分领先" : "时间到" : "平局重赛");
  }
}

function updateBullets(room, dt, now) {
  const world = room.world;
  for (const bullet of world.bullets) { bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; bullet.life -= dt; }
  for (const bullet of [...world.bullets]) {
    const owner = room.players.find((player) => player.id === bullet.ownerId);
    if (!owner) continue;
    if (room.mode === "duel") {
      const target = room.players.find((player) => player.id !== owner.id);
      if (target && Math.hypot(target.sim.x - bullet.x, target.sim.y - bullet.y) < 26) {
        target.sim.health -= bullet.damage;
        owner.score += Math.round(bullet.damage);
        bullet.life = 0;
      }
    } else {
      const target = world.enemies.find((enemy) => Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < enemy.radius + 7);
      if (target) { target.hp -= bullet.damage; bullet.life = 0; if (target.hp <= 0) killCoopEnemy(room, target, owner); }
    }
  }
  world.bullets = world.bullets.filter((bullet) => bullet.life > 0 && bullet.x >= -30 && bullet.x <= WIDTH + 30 && bullet.y >= -40 && bullet.y <= HEIGHT + 40);
  world.enemies = world.enemies.filter((enemy) => enemy.y < HEIGHT + 80 && enemy.hp > 0);
  for (const pickup of world.pickups) {
    pickup.life -= dt;
    for (const player of room.players) {
      if (Math.hypot(player.sim.x - pickup.x, player.sim.y - pickup.y) < 46) {
        if (pickup.type === "core") player.sim.cores = Math.min(3, player.sim.cores + 1);
        else player.sim.health = Math.min(player.sim.maxHealth, player.sim.health + 35);
        player.pickups += 1;
        pickup.life = 0;
      }
    }
  }
  world.pickups = world.pickups.filter((pickup) => pickup.life > 0);
}

function tick(room) {
  const now = Date.now();
  if (room.status !== "playing" || room.players.length !== MAX_PLAYERS) return;
  const dt = Math.min(0.05, Math.max(0.01, (now - room.lastTick) / 1000));
  room.lastTick = now;
  updatePlayers(room, dt, now);
  if (room.mode === "coop") updateCoop(room, dt, now); else updateDuel(room, dt, now);
  updateBullets(room, dt, now);
  syncState(room);
}

function attachPlayer(room, client, payload, host = false) {
  let fighterId = FIGHTERS[payload.fighterId] ? payload.fighterId : "j20";
  if (room.mode === "duel" && !isDuelFighterAllowed(fighterId)) fighterId = "j20";
  const player = {
    id: client.sessionId, client, nickname: normalizeNickname(payload.nickname), fighterId, ready: false, connected: true,
    score: 0, roundWins: 0, rescues: 0, syncStrikes: 0, pickups: 0, lastInputSeq: 0, input: { x: 0.5, y: 0.75, action: "" }, sim: null,
  };
  room.players.push(player);
  if (host) room.hostId = player.id;
  syncLobby(room);
  return player;
}

function detachPlayer(room, player) {
  room.players = room.players.filter((item) => item.id !== player.id);
  if (room.hostId === player.id) room.hostId = room.players[0]?.id || "";
  if (room.players.length) {
    if (room.status === "playing") endMatch(room, room.players[0]?.id || "");
    syncLobby(room);
  }
}

function sendError(client, code, message) { client.send("error", { code, message }); }

class GameRoom extends Room {
  onCreate(options = {}) {
    this.roomId = createRoomCode();
    this.code = this.roomId;
    this.maxClients = MAX_PLAYERS;
    this.maxMessagesPerSecond = 45;
    this.patchRate = 1000 / SNAPSHOT_RATE;
    this.autoDispose = true;
    this.mode = options.mode === "duel" ? "duel" : "coop";
    this.config = normalizeMatchConfig(options.config);
    this.hostId = "";
    this.players = [];
    this.status = "lobby";
    this.world = null;
    this.lastTick = Date.now();
    const state = new GameState();
    state.protocolVersion = 2;
    state.phase = "lobby";
    state.mode = this.mode;
    state.roomName = ["赤焰双翼", "天穹编队", "银翼航线", "龙牙小队"][Math.floor(Math.random() * 4)];
    state.world = new WorldState();
    state.world.width = WIDTH;
    state.world.height = HEIGHT;
    this.setState(state);
    this.setSimulationInterval(() => tick(this), 1000 / SERVER_TICK_RATE);
    this.onMessage("selectFighter", (client, payload = {}) => this.selectFighter(client, payload));
    this.onMessage("updateConfig", (client, payload = {}) => this.updateConfig(client, payload));
    this.onMessage("ready", (client, payload = {}) => this.setReady(client, payload));
    this.onMessage("setReady", (client, payload = {}) => this.setReady(client, payload));
    this.onMessage("input", (client, payload = {}) => this.handleInput(client, payload));
    this.onMessage("requestRematch", () => this.requestRematch());
  }

  onJoin(client, options = {}) {
    if (this.status !== "lobby") throw new Error("对局已开始");
    attachPlayer(this, client, options, this.players.length === 0);
  }

  async onLeave(client, code) {
    const player = this.players.find((item) => item.id === client.sessionId);
    if (!player) return;
    if (code === CloseCode.CONSENTED) { detachPlayer(this, player); return; }
    player.connected = false;
    syncLobby(this);
    try {
      player.client = await this.allowReconnection(client, 30);
      player.connected = true;
      syncLobby(this);
    } catch { detachPlayer(this, player); }
  }

  selectFighter(client, payload) {
    const player = this.players.find((item) => item.id === client.sessionId);
    const fighterId = String(payload.fighterId || "");
    if (!player || !FIGHTERS[fighterId] || (this.mode === "duel" && !isDuelFighterAllowed(fighterId))) return sendError(client, "FIGHTER_NOT_ALLOWED", "该战机不可用于本模式");
    player.fighterId = fighterId; player.ready = false; syncLobby(this);
  }

  updateConfig(client, payload) {
    if (this.hostId !== client.sessionId || this.status !== "lobby") return sendError(client, "CONFIG_FORBIDDEN", "只有房主可修改规则");
    this.config = normalizeMatchConfig(payload.config); this.players.forEach((item) => { item.ready = false; }); syncLobby(this);
  }

  setReady(client, payload) {
    const player = this.players.find((item) => item.id === client.sessionId);
    if (!player || this.status !== "lobby") return;
    player.ready = Boolean(payload.ready); syncLobby(this);
    if (this.players.length === MAX_PLAYERS && this.players.every((item) => item.connected && item.ready)) {
      this.status = "countdown";
      const startsAt = Date.now() + 3000;
      syncState(this);
      this.broadcast("countdown", { startsAt });
      this.clock.setTimeout(() => { if (this.status === "countdown") startMatch(this); }, 3000);
    }
  }

  handleInput(client, payload) {
    const player = this.players.find((item) => item.id === client.sessionId);
    if (!player || this.status !== "playing") return;
    const seq = Number(payload.seq || 0);
    if (seq >= player.lastInputSeq) { player.lastInputSeq = seq; player.input = validInput(payload); }
  }

  requestRematch() {
    if (this.status !== "finished") return;
    this.status = "lobby"; this.world = null;
    this.players.forEach((player) => { player.ready = false; player.sim = null; });
    syncLobby(this);
  }
}

export const server = defineServer({ rooms: { game: defineRoom(GameRoom) } });
await server.listen(PORT, HOST);
console.log(`Mouse Strike Colyseus server listening on ws://${HOST}:${PORT}`);
