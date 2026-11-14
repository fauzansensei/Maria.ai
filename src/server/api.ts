import express, { Request, Response } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  generateChatResponse,
  generateChatResponseStream,
  generateAiImage,
  generateSpeechAudio,
  uploadMediaFileToGemini,
} from './gemini.ts';

export const apiApp = express();
export const apiRouter = express.Router();

apiApp.use(express.json({ limit: '100mb' }));
apiApp.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Helper to safely send JSON responses in any middleware context
function sendJson(res: any, statusCode: number, data: any) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

// Health Check
apiRouter.get('/health', (_req: Request, res: Response) => {
  sendJson(res, 200, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiAvailable: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Chunked Raw Binary Media Upload -> Gemini Files API (Fixes 413 / Failed to fetch for large videos)
apiRouter.post(
  '/upload-media/chunk',
  express.raw({ type: 'application/octet-stream', limit: '15mb' }),
  async (req: Request, res: Response) => {
    try {
      const uploadId = String(req.query.uploadId || '').replace(/[^a-zA-Z0-9_-]/g, '');
      const chunkIndex = Number(req.query.chunkIndex);
      if (!uploadId || !Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex > 500) {
        sendJson(res, 400, { error: 'Parameter uploadId atau chunkIndex tidak valid.' });
        return;
      }
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        sendJson(res, 400, { error: 'Data biner chunk kosong.' });
        return;
      }

      const uploadDir = path.join(os.tmpdir(), 'maria_uploads', uploadId);
      await fs.promises.mkdir(uploadDir, { recursive: true });
      const chunkPath = path.join(uploadDir, `chunk_${chunkIndex}.bin`);
      await fs.promises.writeFile(chunkPath, req.body);

      sendJson(res, 200, { ok: true, chunkIndex, bytes: req.body.length });
    } catch (err: any) {
      console.error('Media chunk upload error:', err);
      sendJson(res, 500, { error: err?.message || 'Gagal menyimpan chunk video.' });
    }
  }
);

apiRouter.post('/upload-media/finalize', async (req: Request, res: Response) => {
  const uploadId = String(req.body?.uploadId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const totalChunks = Number(req.body?.totalChunks);
  const fileName = String(req.body?.fileName || 'video.mp4').replace(/[/\\]/g, '_');
  const rawMime = String(req.body?.mimeType || 'video/mp4').split(';')[0].trim().toLowerCase();

  if (!uploadId || !Number.isInteger(totalChunks) || totalChunks < 1 || totalChunks > 500) {
    sendJson(res, 400, { error: 'Parameter finalize upload tidak valid.' });
    return;
  }

  // Block unsafe executable extensions
  const isBlockedExt = /\.(exe|bat|cmd|sh|php|jsp|asp|msi|dll|vbs|ps1)$/i.test(fileName);
  if (isBlockedExt) {
    sendJson(res, 403, { error: 'Jenis berkas ini tidak didukung untuk diunggah.' });
    return;
  }

  const uploadDir = path.join(os.tmpdir(), 'maria_uploads', uploadId);
  const assembledPath = path.join(uploadDir, `assembled_${Date.now()}_${fileName}`);

  try {
    const writeStream = fs.createWriteStream(assembledPath);
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(uploadDir, `chunk_${i}.bin`);
      if (!fs.existsSync(chunkPath)) {
        writeStream.close();
        sendJson(res, 400, { error: `Chunk ${i} tidak ditemukan.` });
        return;
      }
      const data = await fs.promises.readFile(chunkPath);
      await new Promise<void>((resolve, reject) => {
        if (!writeStream.write(data)) {
          writeStream.once('drain', resolve);
        } else {
          resolve();
        }
        writeStream.once('error', reject);
      });
    }
    await new Promise<void>((resolve, reject) => {
      writeStream.end(() => resolve());
      writeStream.once('error', reject);
    });

    const uploaded = await uploadMediaFileToGemini(assembledPath, rawMime || 'video/mp4', fileName);
    sendJson(res, 200, uploaded);
  } catch (err: any) {
    console.error('Media finalize/Gemini upload error:', err);
    sendJson(res, 500, { error: err?.message || 'Gagal mengunggah video ke Gemini Files API.' });
  } finally {
    fs.promises.rm(uploadDir, { recursive: true, force: true }).catch(() => {});
  }
});

// Real-time Chat Streaming via Server-Sent Events (SSE)
apiRouter.post('/chat-stream', async (req: Request, res: Response) => {
  try {
    const {
      messages,
      mode,
      systemInstruction,
      location,
      webSearch,
      allowEmojis,
      deviceTime,
      userMemories,
      userName,
    } = req.body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      sendJson(res, 400, { error: 'Daftar pesan tidak boleh kosong.' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    let tokensSent = 0;
    try {
      const stream = generateChatResponseStream({
        messages,
        mode,
        systemInstruction,
        location,
        webSearch: webSearch !== false,
        allowEmojis: Boolean(allowEmojis),
        deviceTime,
        userMemories,
        userName,
      });

      for await (const chunk of stream) {
        if (chunk && chunk.text) {
          tokensSent++;
        }
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (streamErr: any) {
      console.warn('Chat stream recovered from streaming interruption:', streamErr?.message || streamErr);
      if (tokensSent > 0) {
        // Tokens were already streamed to user, conclude stream gracefully
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        // Fall back seamlessly to non-streaming generateChatResponse
        try {
          const fallbackRes = await generateChatResponse({
            messages,
            mode,
            systemInstruction,
            location,
            withVoice: false,
            webSearch: webSearch !== false,
            allowEmojis: Boolean(allowEmojis),
            deviceTime,
            userMemories,
            userName,
          });

          if (fallbackRes.text) {
            res.write(`data: ${JSON.stringify({ type: 'chunk', text: fallbackRes.text, model: fallbackRes.model })}\n\n`);
          }
          res.write(`data: ${JSON.stringify({ type: 'done', model: fallbackRes.model, groundingLinks: fallbackRes.groundingLinks })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        } catch (fbErr: any) {
          const errMsg = String(fbErr?.message || streamErr?.message || '');
          if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota') || errMsg.includes('kuota')) {
            const quotaReply = 'Mohon maaf, saat ini batas kuota harian Gemini API (429) pada kunci gratis Anda sedang mencapai batas maksimum dari Google akibat lonjakan permintaan atau pengujian paket. Kuota akan otomatis dipulihkan oleh Google, atau Anda dapat menyetel kunci billing di Google AI Studio untuk akses tanpa batas.';
            res.write(`data: ${JSON.stringify({ type: 'chunk', text: quotaReply, model: 'system-notice' })}\n\n`);
            res.write(`data: ${JSON.stringify({ type: 'done', model: 'system-notice' })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
            return;
          }
          res.write(`data: ${JSON.stringify({ type: 'error', error: fbErr?.message || streamErr?.message || 'Gagal memproses stream.' })}\n\n`);
          res.end();
        }
      }
    }
  } catch (error: any) {
    console.error('Chat stream initialization error:', error);
    if (!res.headersSent) {
      sendJson(res, 500, {
        error: error.message || 'Gagal memproses stream AI.',
      });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  }
});

// Chat Completion (Standard Fallback)
apiRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const {
      messages,
      mode,
      systemInstruction,
      location,
      withVoice,
      voiceName,
      personaId,
      webSearch,
      allowEmojis,
      deviceTime,
      userMemories,
      userName,
    } = req.body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      sendJson(res, 400, { error: 'Daftar pesan tidak boleh kosong.' });
      return;
    }

    const result = await generateChatResponse({
      messages,
      mode,
      systemInstruction,
      location,
      withVoice: Boolean(withVoice),
      voiceName,
      personaId,
      webSearch: webSearch !== false,
      allowEmojis: Boolean(allowEmojis),
      deviceTime,
      userMemories,
      userName,
    });

    sendJson(res, 200, result);
  } catch (error: any) {
    console.error('Chat generation error:', error);
    const rawMsg = String(error?.message || '');
    let cleanMsg = error?.message || 'Terjadi kesalahan saat memproses jawaban AI.';
    if (rawMsg.includes('503') || rawMsg.includes('high demand') || rawMsg.includes('UNAVAILABLE')) {
      cleanMsg = 'Server AI Google sedang mengalami lonjakan permintaan (503). Sistem sedang mengalihkan ke model cadangan, silakan coba kirim ulang.';
    } else if (rawMsg.includes('429') || rawMsg.includes('quota') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
      sendJson(res, 200, {
        text: 'Mohon maaf, saat ini batas kuota harian Gemini API (429) pada kunci gratis Anda sedang mencapai batas maksimum dari Google akibat lonjakan permintaan atau pengujian paket. Kuota akan otomatis dipulihkan secara berkala oleh Google, atau Anda dapat menyetel kunci billing di Google AI Studio untuk akses tanpa batas.',
        model: 'system-notice',
      });
      return;
    }
    sendJson(res, 500, {
      error: cleanMsg,
    });
  }
});

// Image Generation & Editing (Gemini Nano Banana 2.1 & Free Trial Engine)
apiRouter.post(['/generate-image', '/edit-image'], async (req: Request, res: Response) => {
  try {
    const { prompt, imageSize, aspectRatio, baseImage, mimeType, engine } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      sendJson(res, 400, { error: 'Prompt atau instruksi gambar wajib diisi.' });
      return;
    }

    const result = await generateAiImage({
      prompt,
      imageSize,
      aspectRatio,
      baseImage,
      mimeType,
      engine,
    });

    sendJson(res, 200, result);
  } catch (error: any) {
    console.error('Image generation/edit error:', error);
    sendJson(res, 500, {
      error: error.message || 'Gagal memproses gambar.',
    });
  }
});

// Text-to-Speech (TTS)
apiRouter.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceName, personaId, model } = req.body || {};

    if (!text || typeof text !== 'string') {
      sendJson(res, 400, { error: 'Teks untuk suara wajib diisi.' });
      return;
    }

    const result = await generateSpeechAudio(text, voiceName, personaId, model);
    sendJson(res, 200, result);
  } catch (error: any) {
    console.error('TTS endpoint error:', error);
    sendJson(res, 500, {
      error: error?.message || 'Gagal memproses suara AI.',
    });
  }
});

// Science Quick-Lookup (UniProt, PDB, PubMed)
apiRouter.get('/science/lookup', async (req: Request, res: Response) => {
  const { query, type = 'uniprot' } = req.query;

  if (!query || typeof query !== 'string') {
    sendJson(res, 400, { error: 'Query sains wajib diisi.' });
    return;
  }

  try {
    if (type === 'uniprot') {
      // Search UniProtKB for proteins
      const uniprotRes = await fetch(
        `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(query)}&size=3&format=json`
      );
      if (uniprotRes.ok) {
        const data = await uniprotRes.json();
        const results = (data.results || []).map((item: any) => ({
          accession: item.primaryAccession,
          gene: item.genes?.[0]?.geneName?.value || 'N/A',
          proteinName: item.proteinDescription?.recommendedName?.fullName?.value || item.uniProtkbId,
          organism: item.organism?.scientificName || 'N/A',
          length: item.sequence?.length,
          alphaFoldUrl: `https://alphafold.ebi.ac.uk/entry/${item.primaryAccession}`,
        }));
        sendJson(res, 200, { type: 'uniprot', results });
        return;
      }
    } else if (type === 'pdb') {
      // RCSB PDB search
      const pdbRes = await fetch(
        `https://data.rcsb.org/rest/v1/core/entry/${encodeURIComponent(query.toUpperCase())}`
      );
      if (pdbRes.ok) {
        const data = await pdbRes.json();
        sendJson(res, 200, {
          type: 'pdb',
          results: [
            {
              pdbId: data.rcsb_id,
              title: data.struct?.title,
              method: data.exptl?.[0]?.method,
              resolution: data.rcsb_entry_info?.resolution_combined?.[0],
              depositDate: data.rcsb_accession_info?.deposit_date,
              link: `https://www.rcsb.org/structure/${data.rcsb_id}`,
            },
          ],
        });
        return;
      }
    } else if (type === 'pubmed') {
      // NCBI E-utilities esearch
      const esearchRes = await fetch(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=3`
      );
      if (esearchRes.ok) {
        const data = await esearchRes.json();
        const idList: string[] = data.esearchresult?.idlist || [];
        if (idList.length > 0) {
          const esummaryRes = await fetch(
            `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${idList.join(',')}&retmode=json`
          );
          if (esummaryRes.ok) {
            const sumData = await esummaryRes.json();
            const results = idList.map((id) => {
              const item = sumData.result?.[id];
              return {
                pmid: id,
                title: item?.title,
                source: item?.source,
                pubdate: item?.pubdate,
                link: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
              };
            });
            sendJson(res, 200, { type: 'pubmed', results });
            return;
          }
        }
      }
    }

    sendJson(res, 200, { results: [] });
  } catch (error: any) {
    console.error('Science lookup error:', error);
    sendJson(res, 500, { error: error.message || 'Gagal mencari data sains.' });
  }
});

// Mount router on app for both /api and root paths
apiApp.use('/api', apiRouter);
apiApp.use(apiRouter);
