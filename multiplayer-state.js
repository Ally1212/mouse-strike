import { schema, t } from "@colyseus/schema";

export const SimState = schema({
  x: t.float32(), y: t.float32(), targetX: t.float32(), targetY: t.float32(),
  health: t.float32(), maxHealth: t.float32(), cores: t.uint8(),
  transformUntil: t.float64(), tacticalUntil: t.float64(), wingmanUntil: t.float64(),
  downedUntil: t.float64(), reviveProgress: t.float32(), invulnerableUntil: t.float64(),
});

export const PlayerState = schema({
  id: t.string(), nickname: t.string(), fighterId: t.string(), ready: t.boolean(),
  connected: t.boolean(), score: t.int32(), roundWins: t.uint8(), sim: t.ref(SimState),
  rescues: t.uint16(), syncStrikes: t.uint16(), pickups: t.uint16(),
});

export const EnemyState = schema({
  id: t.uint32(), x: t.float32(), y: t.float32(), hp: t.float32(), maxHp: t.float32(),
  radius: t.float32(), speed: t.float32(), elite: t.boolean(),
});

export const BulletState = schema({
  id: t.uint32(), ownerId: t.string(), x: t.float32(), y: t.float32(),
  vx: t.float32(), vy: t.float32(), damage: t.float32(), kind: t.string(), life: t.float32(),
});

export const PickupState = schema({
  id: t.uint32(), x: t.float32(), y: t.float32(), type: t.string(), life: t.float32(),
});

export const WorldState = schema({
  width: t.uint16(), height: t.uint16(), elapsed: t.float32(), round: t.uint8(),
  roundLeft: t.float32(), link: t.float32(), respawns: t.uint8(), event: t.string(),
  enemies: t.map(EnemyState), bullets: t.map(BulletState), pickups: t.map(PickupState),
});

export const GameState = schema({
  protocolVersion: t.uint8(), phase: t.string(), mode: t.string(), hostSessionId: t.string(),
  roomName: t.string(), serverTime: t.float64(), configJson: t.string(),
  world: t.ref(WorldState), players: t.map(PlayerState),
});
