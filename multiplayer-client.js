const defaultUrl = () => {
  if (import.meta.env.VITE_GAME_SERVER_URL) return import.meta.env.VITE_GAME_SERVER_URL;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname || "127.0.0.1"}:8787`;
};

export class MultiplayerClient {
  constructor({ onLobby, onMatchStart, onSnapshot, onRoundEnd, onMatchEnd, onError, onStatus }) {
    this.callbacks = { onLobby, onMatchStart, onSnapshot, onRoundEnd, onMatchEnd, onError, onStatus };
    this.socket = null;
    this.playerId = "";
    this.room = null;
    this.lastInputAt = 0;
    this.inputSeq = 0;
    this.reconnectTimer = null;
    this.intentionalClose = false;
    try { this.session = JSON.parse(window.sessionStorage.getItem("mouse-strike-online-session") || "null"); } catch { this.session = null; }
  }

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) return Promise.resolve();
    this.intentionalClose = false;
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(defaultUrl());
      this.socket = socket;
      const timeout = window.setTimeout(() => reject(new Error("联机服务未响应，请先运行 npm run server")), 4500);
      socket.addEventListener("open", () => {
        window.clearTimeout(timeout);
        this.callbacks.onStatus?.("已连接本地联机服务");
        if (this.session?.roomCode && this.session?.token) this.send("reconnect", this.session);
        resolve();
      }, { once: true });
      socket.addEventListener("error", () => { window.clearTimeout(timeout); reject(new Error("无法连接联机服务，请先运行 npm run server")); }, { once: true });
      socket.addEventListener("close", () => {
        this.callbacks.onStatus?.(this.intentionalClose ? "已离开联机房间" : "连接已断开，正在尝试重连…");
        if (!this.intentionalClose && this.session?.roomCode && this.session?.token) this.scheduleReconnect();
      });
      socket.addEventListener("message", (event) => this.receive(event));
    });
  }

  receive(event) {
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    if (message.type === "joined") {
      this.playerId = message.playerId;
      this.room = message.room;
      this.session = { roomCode: message.room.roomCode, token: message.token };
      try { window.sessionStorage.setItem("mouse-strike-online-session", JSON.stringify(this.session)); } catch { /* Reconnect remains available in this page. */ }
      this.callbacks.onLobby?.(message.room);
      return;
    }
    if (message.type === "lobby") { this.room = message.room; this.callbacks.onLobby?.(message.room); return; }
    if (message.type === "matchStart") { this.room = message.room; this.callbacks.onMatchStart?.(message.room); return; }
    if (message.type === "snapshot") { this.callbacks.onSnapshot?.(message.snapshot); return; }
    if (message.type === "roundEnd") { this.callbacks.onRoundEnd?.(message); return; }
    if (message.type === "matchEnd") { this.callbacks.onMatchEnd?.(message); return; }
    if (message.type === "error") this.callbacks.onError?.(message.message || "联机服务错误");
  }

  send(type, payload = {}) {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify({ type, payload }));
    return true;
  }

  scheduleReconnect() {
    if (this.reconnectTimer || this.intentionalClose) return;
    this.reconnectTimer = window.setTimeout(async () => {
      this.reconnectTimer = null;
      try { await this.connect(); }
      catch { if (!this.intentionalClose) this.scheduleReconnect(); }
    }, 1200);
  }

  createRoom(payload) { this.clearSession(); return this.send("createRoom", payload); }
  joinRoom(payload) { return this.send("joinRoom", payload); }
  selectFighter(fighterId) { return this.send("selectFighter", { fighterId }); }
  updateConfig(config) { return this.send("updateConfig", { config }); }
  ready(ready) { return this.send("ready", { ready }); }

  input(x, y, action = "") {
    const now = performance.now();
    if (!action && now - this.lastInputAt < 45) return;
    this.lastInputAt = now;
    this.send("input", { x, y, action, seq: ++this.inputSeq, clientTime: Date.now() });
  }

  leave() { this.send("leave"); this.clearSession(); }

  clearSession() {
    this.session = null;
    try { window.sessionStorage.removeItem("mouse-strike-online-session"); } catch { /* Storage is optional. */ }
  }

  close(intentional = false) {
    this.intentionalClose = intentional;
    if (this.reconnectTimer) { window.clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (intentional) this.leave();
    this.socket?.close();
    this.socket = null;
  }
}
