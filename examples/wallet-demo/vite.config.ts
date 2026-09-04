import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ["buffer", "process", "stream", "util"],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  server: {
    port: 5173,
  },
  resolve: {
    dedupe: ["react", "react-dom", "buffer"],
  },
  optimizeDeps: {
    include: ["@solanaguard/sdk", "@solanaguard/types", "buffer"],
  },
});
