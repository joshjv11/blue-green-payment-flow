import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { config } from "dotenv";

// Load environment variables from .env file
config();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            const apiKey = process.env.VITE_OPENAI_API_KEY;
            if (apiKey) {
              proxyReq.setHeader('Authorization', `Bearer ${apiKey}`);
              proxyReq.setHeader('Content-Type', 'application/json');
            }
          });
        },
      },
      '/api/groq': {
        target: 'https://api.groq.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/groq/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            const apiKey = process.env.VITE_GROQ_API_KEY;
            if (apiKey) {
              proxyReq.setHeader('Authorization', `Bearer ${apiKey}`);
              proxyReq.setHeader('Content-Type', 'application/json');
            }
          });
        },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
