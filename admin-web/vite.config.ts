import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendPort = process.env.BACKEND_PORT || "8080";

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_BACKEND_PORT": JSON.stringify(backendPort),
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
