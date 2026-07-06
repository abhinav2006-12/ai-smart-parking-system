import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import anprHandler from './api/anpr.js'
import chatbotHandler from './api/chatbot.js'
import expressHandler from './api/express.js'
import dashboardInsightHandler from './api/dashboard-insight.js'

function vercelApiPlugin() {
  return {
    name: 'vercel-api-plugin',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      for (const key in env) {
        process.env[key] = env[key];
      }

      server.middlewares.use('/api/anpr', async (req, res, _next) => {
        console.log('[ANPR Middleware] Request received:', req.method, req.url);
        if (env.PLATERECOGNIZER_TOKEN) {
          process.env.PLATRECOGNIZER_TOKEN = env.PLATERECOGNIZER_TOKEN;
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

      server.middlewares.use('/api/dashboard-insight', async (req, res, _next) => {
        console.log('[DashboardInsight Middleware] Request received:', req.method, req.url);

        res.status = function (code) {
          this.statusCode = code;
          return this;
        };
        res.json = function (data) {
          this.setHeader('Content-Type', 'application/json');
          this.end(JSON.stringify(data));
          return this;
        };

        try {
          await dashboardInsightHandler(req, res);
        } catch (err) {
          console.error('[DashboardInsight Middleware] Unhandled Error:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
          }
        }
      });

      server.middlewares.use((req, res, next) => {
        if (req.url.startsWith('/api/chat') || req.url.startsWith('/api/admin') || req.url.startsWith('/api/health')) {
          expressHandler(req, res, next);
        } else {
          next();
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vercelApiPlugin()],
  server: {
    // Express backend is mounted as middleware in vercelApiPlugin, no proxy needed
  },
})
