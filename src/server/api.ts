import express, { Request, Response } from 'express';
import {
  generateChatResponse,
  generateChatResponseStream,
  generateAiImage,
  generateSpeechAudio,
} from './gemini.ts';
import { guard, sanitizeOutput, getDefconSummary } from './defcon/guard.ts';

export const apiApp = express();
export const apiRouter = express.Router();

apiApp.use(express.json({ limit: '50mb' }));
apiApp.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to safely send JSON responses in any middleware context
function sendJson(res: any, statusCode: number, data: any) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

// DEFCON 5 Shield Status & Summary Endpoint (Claude revision)
apiRouter.get('/defcon', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const summary = await getDefconSummary();
    sendJson(res, 200, summary);
  } catch (err: any) {
    sendJson(res, 500, { error: err?.message || 'Gagal memuat status DEFCON.' });
  }
});

// Test trigger for DEFCON Shield verification
apiRouter.post('/defcon/test', async (req: Request, res: Response) => {
  const { payload } = req.body || {};
  const isAllowed = await guard(req, res, { message: payload || 'test' });
  if (isAllowed) {
    sendJson(res, 200, { status: 'passed', message: 'Payload terverifikasi bersih dan lolos pengawasan DEFCON.' });
  }
});

// VirusTotal Status Endpoint
apiRouter.get('/virustotal/status', (_req: Request, res: Response) => {
  const apiKey = process.env.VIRUSTOTAL_API_KEY || process.env.VT_API_KEY || '';
  sendJson(res, 200, {
    configured: Boolean(apiKey && apiKey.length >= 20),
    variableName: 'VIRUSTOTAL_API_KEY',
  });
});

// VirusTotal Live Hash Lookup Endpoint (v3 Files API)
apiRouter.get(['/virustotal/check/:hash', '/virustotal/check-hash/:hash'], async (req: Request, res: Response) => {
  const apiKey = process.env.VIRUSTOTAL_API_KEY || process.env.VT_API_KEY || '';
  const hash = req.params.hash?.trim().toLowerCase();

  if (!hash || hash.length !== 64) {
    sendJson(res, 400, { error: 'Format hash SHA-256 tidak valid (harus 64 karakter heksadesimal).' });
    return;
  }

  if (!apiKey) {
    sendJson(res, 200, {
      configured: false,
      message: 'VIRUSTOTAL_API_KEY belum dikonfigurasi di secrets.',
    });
    return;
  }

  try {
    const vtRes = await fetch(`https://www.virustotal.com/api/v3/files/${hash}`, {
      headers: {
        'x-apikey': apiKey,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (vtRes.status === 404) {
      sendJson(res, 200, {
        configured: true,
        found: false,
        message: 'Berkas belum pernah dilaporkan di database global VirusTotal.',
      });
      return;
    }

    if (!vtRes.ok) {
      const errText = await vtRes.text();
      sendJson(res, vtRes.status, {
        configured: true,
        error: `VirusTotal API error (${vtRes.status}): ${errText.slice(0, 200)}`,
      });
      return;
    }

    const data = await vtRes.json();
    const attrs = data?.data?.attributes || {};
    const stats = attrs.last_analysis_stats || {};
    const maliciousCount = stats.malicious || 0;
    const suspiciousCount = stats.suspicious || 0;
    const harmlessCount = stats.harmless || 0;
    const undetectedCount = stats.undetected || 0;
    const totalVendors = maliciousCount + suspiciousCount + harmlessCount + undetectedCount;

    sendJson(res, 200, {
      configured: true,
      found: true,
      sha256: hash,
      verdict: maliciousCount > 0 ? 'threat' : suspiciousCount > 1 ? 'suspicious' : 'clean',
      malicious: maliciousCount,
      suspicious: suspiciousCount,
      harmless: harmlessCount,
      undetected: undetectedCount,
      totalVendors,
      threatName: attrs.meaningful_name || attrs.popular_threat_classification?.suggested_threat_label || null,
      reputation: attrs.reputation || 0,
      scanDate: attrs.last_analysis_date,
    });
  } catch (err: any) {
    sendJson(res, 500, {
      configured: true,
      error: `Gagal menghubungi VirusTotal: ${err?.message || err}`,
    });
  }
});

// Health Check
apiRouter.get('/health', (_req: Request, res: Response) => {
  sendJson(res, 200, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiAvailable: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Real-time Chat Streaming via Server-Sent Events (SSE)
apiRouter.post('/chat-stream', async (req: Request, res: Response) => {
  try {
    const { messages, mode, systemInstruction, location, webSearch, deviceTime } = req.body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      sendJson(res, 400, { error: 'Daftar pesan tidak boleh kosong.' });
      return;
    }

    // DEFCON 5 Guard inspection before calling Gemini
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user')?.content || '';
    const isAllowed = await guard(req, res, { message: lastUserMsg });
    if (!isAllowed) return;

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
        deviceTime,
      });

      for await (const chunk of stream) {
        if (chunk && chunk.text) {
          chunk.text = sanitizeOutput(chunk.text);
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
            deviceTime,
          });

          if (fallbackRes.text) {
            res.write(`data: ${JSON.stringify({ type: 'chunk', text: sanitizeOutput(fallbackRes.text), model: fallbackRes.model })}\n\n`);
          }
          res.write(`data: ${JSON.stringify({ type: 'done', model: fallbackRes.model, groundingLinks: fallbackRes.groundingLinks })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        } catch (fbErr: any) {
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
    const { messages, mode, systemInstruction, location, withVoice, voiceName, personaId, webSearch, deviceTime } = req.body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      sendJson(res, 400, { error: 'Daftar pesan tidak boleh kosong.' });
      return;
    }

    // DEFCON 5 Guard inspection before calling Gemini
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user')?.content || '';
    const isAllowed = await guard(req, res, { message: lastUserMsg });
    if (!isAllowed) return;

    const result = await generateChatResponse({
      messages,
      mode,
      systemInstruction,
      location,
      withVoice: Boolean(withVoice),
      voiceName,
      personaId,
      webSearch: webSearch !== false,
      deviceTime,
    });

    // DLP Sanitize Output to prevent secret leaks
    if (result && result.text) {
      result.text = sanitizeOutput(result.text);
    }

    sendJson(res, 200, result);
  } catch (error: any) {
    console.error('Chat generation error:', error);
    const rawMsg = String(error?.message || '');
    let cleanMsg = error?.message || 'Terjadi kesalahan saat memproses jawaban AI.';
    if (rawMsg.includes('503') || rawMsg.includes('high demand') || rawMsg.includes('UNAVAILABLE')) {
      cleanMsg = 'Server AI Google sedang mengalami lonjakan permintaan (503). Sistem sedang mengalihkan ke model cadangan, silakan coba kirim ulang.';
    } else if (rawMsg.includes('429') || rawMsg.includes('quota') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
      cleanMsg = 'Batas kuota model tercapai (429). Silakan tunggu beberapa saat atau periksa kuota Google AI Studio Anda.';
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
