const defaultUrl = () => {
  if (import.meta.env.VITE_GAME_SERVER_URL) return import.meta.env.VITE_GAME_SERVER_URL;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname || "127.0.0.1"}:8787`;
};

const values = (collection) => collection ? [...collection.values()] : [];
const plainSim = (sim) => sim ? { x: sim.x, y: sim.y, targetX: sim.targetX, targetY: sim.targetY, health: sim.health, maxHealth: sim.maxHealth, cores: sim.cores, transformUntil: sim.transformUntil, tacticalUntil: sim.tacticalUntil, wingmanUntil: sim.wingmanUntil, downedUntil: sim.downedUntil, reviveProgress: sim.reviveProgress, invulnerableUntil: sim.invulnerableUntil } : null;
const plainPlayers = (state) => values(state?.players).map((player) => ({ id: player.id, nickname: player.nickname, fighterId: player.fighterId, ready: player.ready, connected: player.connected, score: player.score, roundWins: player.roundWins, rescues: player.rescues, syncStrikes: player.syncStrikes, pickups: player.pickups, sim: plainSim(player.sim) }));

function plainRoom(room) {
  const state = room.state;
  return { roomCode: room.roomId, mode: state.mode, hostId: state.hostSessionId, roomName: state.roomName, status: state.phase, config: JSON.parse(state.configJson || "{}"), players: plainPlayers(state) };
}

function plainSnapshot(room) {
  const state = room.state;
  return {
    now: state.serverTime, mode: state.mode, status: state.phase, config: JSON.parse(state.configJson || "{}"),
    world: { width: state.world.width, height: state.world.height, elapsed: state.world.elapsed, round: state.world.round, roundLeft: state.world.roundLeft, link: state.world.link, respawns: state.world.respawns, event: state.world.event, enemies: values(state.world.enemies).map((item) => ({ ...item })), bullets: values(state.world.bullets).map((item) => ({ ...item })), pickups: values(state.world.pickups).map((item) => ({ ...item })) },
    players: plainPlayers(state),
  };
}

export class MultiplayerClient {
  constructor(callbacks) {
    this.callbacks = callbacks; this.client = null; this.roomConnection = null; this.playerId = ""; this.room = null;
    this.lastInputAt = 0; this.inputSeq = 0; this.intentionalClose = false; this.reconnecting = false;
    try { this.session = JSON.parse(window.sessionStorage.getItem("mouse-strike-online-session") || "null"); } catch { this.session = null; }
  }

  async connect() {
    this.intentionalClose = false;
    if (!this.client) { const { Client } = await import("@colyseus/sdk"); this.client = new Client(defaultUrl()); }
    return true;
  }
  async createRoom(payload) { this.clearSession(); try { await this.connect(); this.attachRoom(await this.client.create("game", payload)); } catch (error) { this.reportError(error, "无法创建房间"); } }
  async joinRoom(payload) { try { await this.connect(); this.attachRoom(await this.client.joinById(String(payload.roomCode || "").toUpperCase(), payload)); } catch (error) { this.reportError(error, "房间不存在、已满或已开始"); } }

  attachRoom(room) {
    this.roomConnection = room; this.playerId = room.sessionId;
    this.session = { roomCode: room.roomId, reconnectionToken: room.reconnectionToken };
    try { window.sessionStorage.setItem("mouse-strike-online-session", JSON.stringify(this.session)); } catch { /* Optional storage. */ }
    room.onMessage("lobby", ({ room: lobby }) => { this.room = lobby; this.callbacks.onLobby?.(lobby); });
    room.onMessage("countdown", (message) => this.callbacks.onCountdown?.(message));
    room.onMessage("matchStart", ({ room: lobby }) => { this.room = lobby; this.callbacks.onMatchStart?.(lobby); });
    room.onMessage("roundEnd", (message) => this.callbacks.onRoundEnd?.(message));
    room.onMessage("matchEnd", (message) => this.callbacks.onMatchEnd?.(message));
    room.onMessage("error", ({ message }) => this.callbacks.onError?.(message || "联机服务错误"));
    room.onStateChange((state) => {
      if (Number(state.protocolVersion) !== 2) return this.callbacks.onError?.("联机协议已更新，请刷新页面");
      const lobby = plainRoom(room); this.room = lobby;
      if (state.phase === "lobby") this.callbacks.onLobby?.(lobby);
      if (state.phase === "playing") this.callbacks.onSnapshot?.(plainSnapshot(room));
    });
    room.onLeave(() => { this.callbacks.onStatus?.(this.intentionalClose ? "已离开联机房间" : "连接已断开，正在尝试重连…"); if (!this.intentionalClose) this.reconnect(); });
    this.room = plainRoom(room); this.callbacks.onLobby?.(this.room); this.callbacks.onStatus?.("已连接联机服务");
  }

  async reconnect() {
    if (this.reconnecting || !this.session?.reconnectionToken) return;
    this.reconnecting = true;
    try { await new Promise((resolve) => window.setTimeout(resolve, 1000)); this.attachRoom(await this.client.reconnect(this.session.reconnectionToken)); this.callbacks.onStatus?.("已恢复联机对局"); }
    catch { this.callbacks.onError?.("重连窗口已结束，请重新加入房间"); }
    finally { this.reconnecting = false; }
  }

  reportError(error, fallback) { this.callbacks.onError?.(error?.message || fallback); }
  send(type, payload = {}) { if (!this.roomConnection) return false; this.roomConnection.send(type, payload); return true; }
  selectFighter(fighterId) { return this.send("selectFighter", { fighterId }); }
  updateConfig(config) { return this.send("updateConfig", { config }); }
  ready(ready) { return this.send("setReady", { ready }); }
  requestRematch() { return this.send("requestRematch"); }
  input(x, y, action = "") { const now = performance.now(); if (!action && now - this.lastInputAt < 45) return; this.lastInputAt = now; this.send("input", { x, y, action, seq: ++this.inputSeq, clientTime: Date.now() }); }
  leave() { this.clearSession(); this.roomConnection?.leave(true); }
  clearSession() { this.session = null; try { window.sessionStorage.removeItem("mouse-strike-online-session"); } catch { /* Optional storage. */ } }
  close(intentional = false) { this.intentionalClose = intentional; if (intentional) this.leave(); else this.roomConnection?.leave(); this.roomConnection = null; this.room = null; }
}
