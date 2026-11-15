import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { easyrestProxy } from "./vite-easyrest-proxy.ts";

export default defineConfig({
  plugins: [react(), easyrestProxy()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    // Cloudflare / LocalTunnel Hostnames erlauben
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
});
