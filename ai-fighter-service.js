const ARCHETYPES = new Set(["laser", "siege", "swarm", "skirmisher"]);
const ARCHETYPE_ALIASES = { 激光: "laser", 光束: "laser", 重炮: "siege", 装甲: "siege", 蜂群: "swarm", 导弹: "swarm", 高速: "skirmisher", 游击: "skirmisher" };

function clean(value, fallback, limit) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return (text || fallback).slice(0, limit);
}

function parseJson(content) {
  const text = String(content || "").trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  return JSON.parse(text);
}

export function sanitizeAiDesign(value) {
  const design = value && typeof value === "object" ? value : {};
  const requestedArchetype = String(design.archetype).toLowerCase();
  const archetype = ARCHETYPES.has(requestedArchetype)
    ? requestedArchetype
    : (ARCHETYPE_ALIASES[requestedArchetype] || "");
  const modeNames = Array.isArray(design.modeNames)
    ? design.modeNames.slice(0, 3).map((name) => clean(name, "", 24))
    : [];
  return {
    archetype,
    callsign: clean(design.callsign, "", 20),
    role: clean(design.role, "", 32),
    passiveName: clean(design.passiveName, "", 20),
    passive: clean(design.passive, "", 86),
    tacticalName: clean(design.tacticalName, "", 24),
    special: clean(design.special, "", 110),
    modeNames,
    wingmanName: clean(design.wingmanName, "", 24),
    transformName: clean(design.transformName, "", 28),
    transformSummary: clean(design.transformSummary, "", 110),
  };
}

export async function generateAiFighterDesign({ name, brief, apiKey, fetchImpl = fetch }) {
  if (!apiKey) {
    const error = new Error("DeepSeek API 密钥未配置");
    error.status = 503;
    throw error;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetchImpl("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "你是街机空战游戏的战机设计师。只返回 JSON，不要 markdown。必须包含 archetype，且其值只能是 laser、siege、swarm、skirmisher 之一：laser=激光精确，siege=重炮装甲，swarm=蜂群追踪，skirmisher=高速波动。不得生成数值、现实武器说明或不安全内容。还必须返回 callsign、role、passiveName、passive、tacticalName、special、modeNames（恰好3项）、wingmanName、transformName、transformSummary；全部为简短中文。",
          },
          { role: "user", content: `战机名称：${clean(name, "AI 原型机", 24)}\n作战偏好：${clean(brief, "高机动多用途战机", 140)}` },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const error = new Error("DeepSeek 生成请求失败");
      error.status = response.status >= 400 && response.status < 500 ? 502 : 503;
      throw error;
    }
    const payload = await response.json();
    return sanitizeAiDesign(parseJson(payload.choices?.[0]?.message?.content));
  } catch (cause) {
    if (cause?.name === "AbortError") {
      const error = new Error("DeepSeek 生成超时");
      error.status = 504;
      throw error;
    }
    throw cause;
  } finally {
    clearTimeout(timeout);
  }
}

export async function readJsonBody(request, limit = 8_000) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > limit) {
      const error = new Error("请求内容过长");
      error.status = 413;
      throw error;
    }
  }
  try {
    return JSON.parse(body || "{}");
  } catch {
    const error = new Error("请求格式无效");
    error.status = 400;
    throw error;
  }
}

export function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(payload));
}
