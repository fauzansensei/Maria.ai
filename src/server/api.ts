import express, { Request, Response } from 'express';
import {
  generateChatResponse,
  generateChatResponseStream,
  generateAiImage,
  generateSpeechAudio,
} from './gemini.ts';

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

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const stream = generateChatResponseStream({
      messages,
      mode,
      systemInstruction,
      location,
      webSearch: webSearch !== false,
      deviceTime,
    });

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Chat stream error:', error);
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

    sendJson(res, 200, result);
  } catch (error: any) {
    console.error('Chat generation error:', error);
    sendJson(res, 500, {
      error: error.message || 'Terjadi kesalahan saat memproses jawaban AI.',
    });
  }
});

// Image Generation
apiRouter.post('/generate-image', async (req: Request, res: Response) => {
  try {
    const { prompt, imageSize, aspectRatio } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      sendJson(res, 400, { error: 'Prompt gambar wajib diisi.' });
      return;
    }

    const result = await generateAiImage({
      prompt,
      imageSize,
      aspectRatio,
    });

    sendJson(res, 200, result);
  } catch (error: any) {
    console.error('Image generation error:', error);
    sendJson(res, 500, {
      error: error.message || 'Gagal menghasilkan gambar.',
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
