import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom", "zustand"],
          "monaco-vendor": ["monaco-editor", "@monaco-editor/react"],
          "collab-vendor": ["yjs", "y-websocket", "y-monaco", "socket.io-client"],
        },
      },
    },
  },
});
