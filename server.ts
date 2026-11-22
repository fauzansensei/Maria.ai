import express from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { apiApp } from './src/server/api.ts';
import { attachLiveWebSocketServer } from './src/server/liveBridge.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);
  const isProd = process.env.NODE_ENV === 'production';

  // Enable reverse proxy trust (e.g. Vercel, Cloudflare, Google Cloud Run)
  app.set('trust proxy', 1);

  // Allow screen capture, camera, and microphone across supported browser contexts
  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'display-capture=*, camera=*, microphone=*');
    next();
  });

  // Mount API app
  app.use(apiApp);

  const publicPath = path.join(__dirname, 'public');
  const distPath = path.join(__dirname, 'dist');

  app.get(['/cookies', '/kebijakan-cookies'], (_req, res) => {
    res.sendFile(path.join(publicPath, 'cookies.html'));
  });

  app.get(['/terms', '/ketentuan-layanan', '/tos'], (_req, res) => {
    res.sendFile(path.join(publicPath, 'terms.html'));
  });

  app.get(['/help', '/bantuan', '/faq'], (_req, res) => {
    res.sendFile(path.join(publicPath, 'help.html'));
  });

  app.get(['/privacy', '/kebijakan-privasi'], (_req, res) => {
    res.sendFile(path.join(publicPath, 'privacy.html'));
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
        watch: null,
      },
      appType: 'spa',
    });

    // Vite 8 injects /@vite/client which attempts an HMR WebSocket connection to port 24678
    // even when hmr/ws are disabled in middlewareMode, causing console errors & unhandled rejections
    // behind Cloud Run reverse proxies. Preserve exports (updateStyle, createHotContext) without connecting WS.
    app.get('/@vite/client', async (_req, res, next) => {
      try {
        const result = await vite.transformRequest('/@vite/client');
        if (!result) return next();
        const patchedCode = result.code.replace(
          'transport.connect(createHMRHandler(handleMessage));',
          'void 0;'
        );
        res
          .status(200)
          .set({
            'Content-Type': 'application/javascript; charset=utf-8',
            'Cache-Control': 'no-cache',
          })
          .end(patchedCode);
      } catch (err) {
        next(err);
      }
    });

    app.use(vite.middlewares);

    app.use(async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  } else {
    app.use(express.static(distPath));
    app.use(express.static(publicPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = app.listen(port, '0.0.0.0', () => {
    console.log(`Maria AI server running on http://0.0.0.0:${port} (${isProd ? 'production' : 'development'})`);
  });

  attachLiveWebSocketServer(httpServer);
}

startServer().catch((err) => {
  console.error('Failed to start Maria AI server:', err);
  process.exit(1);
});
