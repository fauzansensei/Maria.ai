import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';
import { defineConfig, Plugin } from 'vite';

dotenv.config();

function expressApiPlugin(): Plugin {
  return {
    name: 'express-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const reqUrl = req.url || '';
        const ua = String(req.headers['user-agent'] || '').toLowerCase().trim();
        const isAutomatedRootProbe =
          reqUrl === '/' &&
          (ua === 'mozilla/5.0' ||
            ua.includes('python-requests') ||
            ua.includes('curl/') ||
            ua.includes('wget/'));

        // Intercept /api calls and automated bot probes on root /; never interfere with normal browser static loads
        if (!reqUrl.startsWith('/api') && !isAutomatedRootProbe) {
          return next();
        }

        try {
          const { defconAntiDdosMiddleware } = await import('./src/server/defcon/guard.ts');
          defconAntiDdosMiddleware(req as any, res as any, () => {
            if (!reqUrl.startsWith('/api')) {
              return next();
            }
            import('./src/server/api.ts').then(({ apiApp }) => {
              apiApp(req as any, res as any, (err?: any) => {
                if (err) {
                  console.error('API Error in Vite middleware:', err);
                  if (!res.headersSent) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
                  }
                } else if (!res.headersSent) {
                  res.statusCode = 404;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Endpoint API tidak ditemukan.' }));
                }
              });
            }).catch((importErr) => {
              console.error('Failed to import apiApp:', importErr);
              next();
            });
          });
        } catch (err) {
          next();
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), expressApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
