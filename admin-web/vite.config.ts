import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendUrl =
  process.env.VITE_API_URL || "https://curo-backend-fwaq.onrender.com";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
