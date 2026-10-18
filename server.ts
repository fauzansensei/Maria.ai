import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { apiApp } from './src/server/api.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Mount API app
app.use(apiApp);

// Serve static assets from Vite build output and public folder
const distPath = path.join(__dirname, 'dist');
const publicPath = path.join(__dirname, 'public');
app.use(express.static(distPath));
app.use(express.static(publicPath));

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

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Maria AI production server running on port ${port}`);
});
