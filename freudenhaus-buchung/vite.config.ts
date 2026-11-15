import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { easyrestProxy } from "./vite-easyrest-proxy.ts";

export default defineConfig({
  plugins: [react(), easyrestProxy()],
  server: {
    // Allow Cloudflare quick tunnels / publish previews to reach the Vite host check.
    allowedHosts: true,
  },
  preview: {
    allowedHosts: true,
  },
});
