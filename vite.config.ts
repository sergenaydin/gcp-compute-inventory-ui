import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // In development the UI talks to the API through this proxy, so no CORS setup is needed.
  const proxy = { "/api": { target: env.API_PROXY_TARGET || "http://localhost:8080", changeOrigin: true } };

  return {
    plugins: [react()],
    server: { proxy },
    preview: { proxy },
  };
});
