import { defineConfig, loadEnv } from "vite";
import { generateAiFighterDesign, readJsonBody, sendJson } from "./ai-fighter-service.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiKey = env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
  return {
    plugins: [{
      name: "deepseek-fighter-api",
      configureServer(server) {
        server.middlewares.use("/api/ai/fighter", async (request, response) => {
          if (request.method !== "POST") return sendJson(response, 405, { error: "仅支持 POST 请求" });
          try {
            const body = await readJsonBody(request);
            const design = await generateAiFighterDesign({ ...body, apiKey });
            return sendJson(response, 200, { design });
          } catch (error) {
            return sendJson(response, error.status || 500, { error: error.message || "AI 生成失败" });
          }
        });
      },
    }],
    test: {
      include: ["tests/**/*.test.js"],
    },
    build: {
      chunkSizeWarningLimit: 700,
    },
  };
});
