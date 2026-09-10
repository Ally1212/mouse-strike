import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import { FIGHTERS } from "./fighter-profiles.js";
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
const rooms = new Map();

function send(socket, type, payload = {}) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type, ...payload }));
}

function broadcast(room, type, payload = {}) {
  room.players.forEach((player) => send(player.socket, type, payload));
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

function syncLobby(room) {
  broadcast(room, "lobby", { room: lobby(room) });
}

function createRoom(mode, config) {
  let code = createRoomCode();
  while (rooms.has(code)) code = createRoomCode();
  const room = {
    code,
    mode: mode === "duel" ? "duel" : "coop",
    config: normalizeMatchConfig(config),
    hostId: "",
    players: [],
    status: "lobby",
    world: null,
    lastTick: Date.now(),
  };
  rooms.set(code, room);
  return room;
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
  room.players.forEach((player, index) => { player.sim = initialPlayer(index, room.mode, room.config); });
}

function endMatch(room, winnerId = "") {
  room.status = "finished";
  room.world.matchWinner = winnerId;
  broadcast(room, "matchEnd", { winnerId, room: lobby(room) });
  syncLobby(room);
}

function finishRound(room, winnerId, reason) {
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
  const dx = target.x - source.sim.x;
  const dy = target.y - source.sim.y;
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
        if (downed.sim.reviveProgress >= 2) { downed.sim.downedUntil = 0; downed.sim.health = downed.sim.maxHealth * 0.42; downed.sim.invulnerableUntil = now + 1500; downed.sim.reviveProgress = 0; room.world.link = Math.min(100, room.world.link + 25); }
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
        pickup.life = 0;
      }
    }
  }
  world.pickups = world.pickups.filter((pickup) => pickup.life > 0);
}

function snapshot(room) {
  const now = Date.now();
  return {
    now, mode: room.mode, status: room.status, config: room.config,
    world: {
      width: WIDTH, height: HEIGHT, elapsed: room.world ? (now - room.world.startedAt) / 1000 : 0,
      round: room.world?.round || 0, roundLeft: room.world ? Math.max(0, room.config.roundSeconds - (now - room.world.roundStartedAt) / 1000) : 0,
      link: room.world?.link || 0, respawns: room.world?.respawns || 0, event: room.world?.event || "",
      enemies: room.world?.enemies || [], bullets: room.world?.bullets || [], pickups: room.world?.pickups || [],
    },
    players: room.players.map((player) => ({ ...publicPlayer(player), sim: player.sim })),
  };
}

function tick() {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.status !== "playing" || room.players.length !== MAX_PLAYERS) continue;
    const dt = Math.min(0.05, Math.max(0.01, (now - room.lastTick) / 1000));
    room.lastTick = now;
    updatePlayers(room, dt, now);
    if (room.mode === "coop") updateCoop(room, dt, now); else updateDuel(room, dt, now);
    updateBullets(room, dt, now);
  }
}

function attachPlayer(room, socket, payload, host = false) {
  const player = {
    id: randomUUID(), socket, token: randomUUID(), nickname: normalizeNickname(payload.nickname),
    fighterId: FIGHTERS[payload.fighterId] ? payload.fighterId : "j20", ready: false, connected: true,
    score: 0, roundWins: 0, input: { x: 0.5, y: 0.75, action: "" }, sim: null,
  };
  room.players.push(player);
  if (host) room.hostId = player.id;
  socket.player = player;
  socket.room = room;
  send(socket, "joined", { playerId: player.id, token: player.token, room: lobby(room) });
  syncLobby(room);
}

function detachPlayer(room, player) {
  room.players = room.players.filter((item) => item.id !== player.id);
  if (room.hostId === player.id) room.hostId = room.players[0]?.id || "";
  if (!room.players.length) rooms.delete(room.code);
  else {
    if (room.status === "playing") endMatch(room, room.players[0]?.id || "");
    syncLobby(room);
  }
}

function handleMessage(socket, raw) {
  let message;
  try { message = JSON.parse(String(raw)); } catch { return send(socket, "error", { message: "消息格式无效" }); }
  const payload = message.payload || {};
  if (message.type === "createRoom") {
    if (socket.room) return send(socket, "error", { message: "已在房间中" });
    const room = createRoom(payload.mode, payload.config);
    attachPlayer(room, socket, payload, true);
    return;
  }
  if (message.type === "joinRoom") {
    const room = rooms.get(String(payload.roomCode || "").toUpperCase());
    if (!room || room.players.length >= MAX_PLAYERS || room.status === "playing") return send(socket, "error", { message: "房间不存在、已满或已开始" });
    attachPlayer(room, socket, payload);
    return;
  }
  if (message.type === "reconnect") {
    const room = rooms.get(String(payload.roomCode || "").toUpperCase());
    const player = room?.players.find((item) => item.token === payload.token && !item.connected && Date.now() - item.disconnectedAt < 30_000);
    if (!room || !player) return send(socket, "error", { message: "重连窗口已结束" });
    player.socket = socket;
    player.connected = true;
    player.disconnectedAt = 0;
    socket.player = player;
    socket.room = room;
    send(socket, "joined", { playerId: player.id, token: player.token, room: lobby(room), reconnected: true });
    syncLobby(room);
    return;
  }
  const room = socket.room;
  const player = socket.player;
  if (!room || !player) return send(socket, "error", { message: "请先进入房间" });
  if (message.type === "selectFighter") {
    const fighterId = String(payload.fighterId || "");
    if (!FIGHTERS[fighterId] || (room.mode === "duel" && !isDuelFighterAllowed(fighterId))) return send(socket, "error", { message: "该战机不可用于本模式" });
    player.fighterId = fighterId; player.ready = false; syncLobby(room); return;
  }
  if (message.type === "updateConfig") {
    if (room.hostId !== player.id || room.status !== "lobby") return send(socket, "error", { message: "只有房主可修改规则" });
    room.config = normalizeMatchConfig(payload.config); room.players.forEach((item) => { item.ready = false; }); syncLobby(room); return;
  }
  if (message.type === "ready") {
    if (room.status !== "lobby") return;
    player.ready = Boolean(payload.ready);
    syncLobby(room);
    if (room.players.length === MAX_PLAYERS && room.players.every((item) => item.ready)) startMatch(room);
    return;
  }
  if (message.type === "input" && room.status === "playing") player.input = validInput(payload);
  if (message.type === "leave") detachPlayer(room, player);
}

const httpServer = createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ service: "mouse-strike-multiplayer", rooms: rooms.size }));
});
const wss = new WebSocketServer({ server: httpServer });
wss.on("connection", (socket) => {
  socket.on("message", (message) => handleMessage(socket, message));
  socket.on("close", () => {
    const { room, player } = socket;
    if (!room || !player) return;
    player.connected = false;
    player.disconnectedAt = Date.now();
    syncLobby(room);
    setTimeout(() => {
      if (!player.connected && room.players.includes(player) && Date.now() - player.disconnectedAt >= 30_000) detachPlayer(room, player);
    }, 30_100);
  });
  send(socket, "hello", { tickRate: SERVER_TICK_RATE, snapshotRate: SNAPSHOT_RATE });
});
setInterval(tick, 1000 / SERVER_TICK_RATE);
setInterval(() => { rooms.forEach((room) => { if (room.status === "playing") broadcast(room, "snapshot", { snapshot: snapshot(room) }); }); }, 1000 / SNAPSHOT_RATE);
httpServer.listen(PORT, HOST, () => console.log(`Mouse Strike multiplayer server listening on ws://${HOST}:${PORT}`));
