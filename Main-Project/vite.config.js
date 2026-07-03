import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import anprHandler from './api/anpr.js'
import chatbotHandler from './api/chatbot.js'
import adminChatbotHandler from './api/admin-chatbot.js'

function vercelApiPlugin() {
  return {
    name: 'vercel-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/anpr', async (req, res, _next) => {
        console.log('[ANPR Middleware] Request received:', req.method, req.url);
        const env = loadEnv(server.config.mode, process.cwd(), '');
        if (env.PLATERECOGNIZER_TOKEN) {
          process.env.PLATERECOGNIZER_TOKEN = env.PLATERECOGNIZER_TOKEN;
        } else {
          console.error('[ANPR Middleware] WARNING: PLATERECOGNIZER_TOKEN is missing in loadEnv!');
        }

        res.status = function (code) {
          this.statusCode = code;
          return this;
        };
        res.json = function (data) {
          console.log('[ANPR Middleware] Responding with status', this.statusCode, data);
          this.setHeader('Content-Type', 'application/json');
          this.end(JSON.stringify(data));
          return this;
        };

        try {
          await anprHandler(req, res);
        } catch (err) {
          console.error('[ANPR Middleware] Unhandled Error:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
          }
        }
      });

      server.middlewares.use('/api/chatbot', async (req, res, _next) => {
        console.log('[Chatbot Middleware] Request received:', req.method, req.url);
        const env = loadEnv(server.config.mode, process.cwd(), '');
        if (env.GEMINI_API_KEY) {
          process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
        }

        res.status = function (code) {
          this.statusCode = code;
          return this;
        };
        res.json = function (data) {
          console.log('[Chatbot Middleware] Responding with status', this.statusCode, data);
          this.setHeader('Content-Type', 'application/json');
          this.end(JSON.stringify(data));
          return this;
        };

        try {
          await chatbotHandler(req, res);
        } catch (err) {
          console.error('[Chatbot Middleware] Unhandled Error:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
          }
        }
      });

      server.middlewares.use('/api/admin-chatbot', async (req, res, _next) => {
        console.log('[Admin Chatbot Middleware] Request received:', req.method, req.url);
        const env = loadEnv(server.config.mode, process.cwd(), '');
        if (env.GEMINI_API_KEY) {
          process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
        }
        if (env.VITE_SUPABASE_URL) {
          process.env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL;
        }
        if (env.VITE_SUPABASE_ANON_KEY) {
          process.env.VITE_SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
        }

        res.status = function (code) {
          this.statusCode = code;
          return this;
        };
        res.json = function (data) {
          console.log('[Admin Chatbot Middleware] Responding with status', this.statusCode, data);
          this.setHeader('Content-Type', 'application/json');
          this.end(JSON.stringify(data));
          return this;
        };

        try {
          await adminChatbotHandler(req, res);
        } catch (err) {
          console.error('[Admin Chatbot Middleware] Unhandled Error:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
          }
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vercelApiPlugin()],
})
