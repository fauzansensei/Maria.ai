import { FunctionDeclaration, Type } from '@google/genai';

export interface DiscoveredMcpTool {
  name: string;
  description?: string;
  inputSchema?: any;
}

export interface ActiveConnectorConfig {
  id: string;
  source: 'core' | 'connector' | 'custom';
  name: string;
  mentionTag: string;
  mcpUrl?: string;
  authType?: 'none' | 'bearer' | 'header';
  authHeaderName?: string;
  authToken?: string;
  tools?: string[];
  discoveredTools?: DiscoveredMcpTool[];
}

export interface ConnectorToolExecutor {
  connectorId: string;
  connectorName: string;
  mentionTag: string;
  execute: (args: Record<string, any>) => Promise<{
    ok: boolean;
    data?: any;
    error?: string;
    sourceUrl?: string;
    sourceTitle?: string;
  }>;
}

export interface BuiltConnectorTools {
  declarations: FunctionDeclaration[];
  executors: Map<string, ConnectorToolExecutor>;
  systemAddendum: string;
  forceMapsMode?: boolean;
  forceWebSearch?: boolean;
}

// Validate external HTTP(S) URLs and block private/loopback networks (SSRF protection)
export function validateSafeRemoteUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error('URL konektor tidak valid.');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Hanya protokol http:// atau https:// yang diizinkan.');
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    !host ||
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.startsWith('127.') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    host.startsWith('169.254.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    host.startsWith('fc') ||
    host.startsWith('fd') ||
    host.startsWith('fe80:')
  ) {
    throw new Error('Alamat host privat atau lokal tidak diizinkan demi keamanan.');
  }

  return parsed;
}

function buildAuthHeaders(connector: {
  authType?: string;
  authHeaderName?: string;
  authToken?: string;
}): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = connector.authToken?.trim();
  if (!token) return headers;

  if (connector.authType === 'header' && connector.authHeaderName?.trim()) {
    headers[connector.authHeaderName.trim()] = token;
  } else {
    headers['Authorization'] = token.toLowerCase().startsWith('bearer ')
      ? token
      : `Bearer ${token}`;
  }
  return headers;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = 10000
): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonOrSsePayload(rawText: string): any {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // Parse SSE response payloads like "event: message\ndata: {...}\n\n"
    const dataLines = trimmed
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .filter((line) => line && line !== '[DONE]');

    for (let i = dataLines.length - 1; i >= 0; i--) {
      try {
        return JSON.parse(dataLines[i]);
      } catch {}
    }
    return null;
  }
}

export async function testAndDiscoverConnector(params: {
  url: string;
  authType?: 'none' | 'bearer' | 'header';
  authHeaderName?: string;
  authToken?: string;
}): Promise<{
  ok: boolean;
  mode: 'mcp' | 'rest';
  statusCode?: number;
  latencyMs: number;
  tools: DiscoveredMcpTool[];
  message: string;
}> {
  const safeUrl = validateSafeRemoteUrl(params.url);
  const authHeaders = buildAuthHeaders(params);
  const startTime = Date.now();

  // 1. Try standard MCP Streamable HTTP JSON-RPC (initialize -> tools/list)
  try {
    const initRes = await fetchWithTimeout(
      safeUrl.toString(),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'User-Agent': 'MariaAI-ConnectorEngine/1.0',
          ...authHeaders,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'MariaAI', version: '1.0.0' },
          },
        }),
      },
      8000
    );

    const sessionHeader = initRes.headers.get('mcp-session-id');
    const initText = await initRes.text().catch(() => '');
    const initJson = parseJsonOrSsePayload(initText);

    if (initRes.ok && initJson && (initJson.result || initJson.jsonrpc === '2.0')) {
      const listHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'User-Agent': 'MariaAI-ConnectorEngine/1.0',
        ...authHeaders,
      };
      if (sessionHeader) {
        listHeaders['mcp-session-id'] = sessionHeader;
      }

      const listRes = await fetchWithTimeout(
        safeUrl.toString(),
        {
          method: 'POST',
          headers: listHeaders,
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
            params: {},
          }),
        },
        8000
      );

      const listText = await listRes.text().catch(() => '');
      const listJson = parseJsonOrSsePayload(listText);
      const rawTools = listJson?.result?.tools;
      const tools: DiscoveredMcpTool[] = Array.isArray(rawTools)
        ? rawTools
            .filter((t: any) => t && typeof t.name === 'string')
            .slice(0, 20)
            .map((t: any) => ({
              name: String(t.name),
              description: typeof t.description === 'string' ? t.description.slice(0, 300) : undefined,
              inputSchema: t.inputSchema,
            }))
        : [];

      return {
        ok: true,
        mode: 'mcp',
        statusCode: listRes.status,
        latencyMs: Date.now() - startTime,
        tools,
        message:
          tools.length > 0
            ? `MCP terhubung (${tools.length} tool terdeteksi).`
            : 'MCP terhubung dan siap digunakan.',
      };
    }
  } catch {
    // Fall through to HTTP REST reachability probe
  }

  // 2. Fallback REST GET probe
  try {
    const getRes = await fetchWithTimeout(
      safeUrl.toString(),
      {
        method: 'GET',
        headers: {
          Accept: 'application/json, text/plain, */*',
          'User-Agent': 'MariaAI-ConnectorEngine/1.0',
          ...authHeaders,
        },
      },
      8000
    );

    const latencyMs = Date.now() - startTime;
    if (getRes.ok || getRes.status === 405) {
      return {
        ok: true,
        mode: 'rest',
        statusCode: getRes.status,
        latencyMs,
        tools: [],
        message: `Endpoint REST/Webhook aktif (HTTP ${getRes.status}, ${latencyMs} ms).`,
      };
    }

    return {
      ok: false,
      mode: 'rest',
      statusCode: getRes.status,
      latencyMs,
      tools: [],
      message: `Endpoint merespons HTTP ${getRes.status}. Periksa URL atau token otorisasi.`,
    };
  } catch (err: any) {
    return {
      ok: false,
      mode: 'rest',
      latencyMs: Date.now() - startTime,
      tools: [],
      message:
        err?.name === 'AbortError'
          ? 'Koneksi timeout (>8 detik).'
          : err?.message || 'Gagal menjangkau endpoint konektor.',
    };
  }
}

function sanitizeToolIdentifier(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned || 'tool';
}

function convertSchemaToGeminiParameters(inputSchema: any): FunctionDeclaration['parameters'] {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  if (inputSchema && typeof inputSchema === 'object' && inputSchema.properties && typeof inputSchema.properties === 'object') {
    const entries = Object.entries(inputSchema.properties).slice(0, 10);
    for (const [key, val] of entries) {
      const prop = val as any;
      const rawType = String(prop?.type || 'string').toLowerCase();
      let geminiType = Type.STRING;
      if (rawType === 'number') geminiType = Type.NUMBER;
      else if (rawType === 'integer') geminiType = Type.INTEGER;
      else if (rawType === 'boolean') geminiType = Type.BOOLEAN;
      else if (rawType === 'array') geminiType = Type.ARRAY;
      else if (rawType === 'object') geminiType = Type.OBJECT;

      const def: any = {
        type: geminiType,
        description: typeof prop?.description === 'string' ? prop.description.slice(0, 200) : `Parameter ${key}`,
      };
      if (geminiType === Type.ARRAY) {
        def.items = { type: Type.STRING };
      } else if (geminiType === Type.OBJECT) {
        def.properties = { value: { type: Type.STRING } };
      }
      properties[key] = def;
    }

    if (Array.isArray(inputSchema.required)) {
      for (const reqKey of inputSchema.required) {
        if (typeof reqKey === 'string' && properties[reqKey]) {
          required.push(reqKey);
        }
      }
    }
  }

  if (Object.keys(properties).length === 0) {
    properties.query = {
      type: Type.STRING,
      description: 'Input query or search term for this connector tool.',
    };
    properties.paramsJson = {
      type: Type.STRING,
      description: 'Optional JSON string of extra key-value arguments if needed.',
    };
  }

  return {
    type: Type.OBJECT,
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

function truncatePayload(value: any, maxChars: number = 22000): any {
  try {
    const json = JSON.stringify(value);
    if (json.length <= maxChars) return value;
    return {
      truncated: true,
      preview: json.slice(0, maxChars),
    };
  } catch {
    return String(value).slice(0, maxChars);
  }
}

export function buildConnectorTools(
  activeConnectors: ActiveConnectorConfig[] = [],
  lastUserText: string = ''
): BuiltConnectorTools {
  const declarations: FunctionDeclaration[] = [];
  const executors = new Map<string, ConnectorToolExecutor>();
  const activeLabels: string[] = [];

  if (!Array.isArray(activeConnectors) || activeConnectors.length === 0) {
    return { declarations, executors, systemAddendum: '' };
  }

  const lowerPrompt = lastUserText.toLowerCase();
  const isMentioned = (c: ActiveConnectorConfig) =>
    Boolean(c.mentionTag && lowerPrompt.includes(c.mentionTag.toLowerCase()));

  let forceMapsMode = false;
  let forceWebSearch = false;

  const hasId = (id: string) => activeConnectors.some((c) => c.id === id);
  const findConnector = (ids: string[]) => activeConnectors.find((c) => ids.includes(c.id));

  // Built-in directives via @mention
  const mapsConn = findConnector(['google-maps']);
  if (mapsConn && isMentioned(mapsConn)) {
    forceMapsMode = true;
  }

  const searchConn = findConnector(['google-search', 'exa']);
  if (searchConn && isMentioned(searchConn)) {
    forceWebSearch = true;
  }

  // 1. Live GitHub Connector
  const githubConn = findConnector(['github', 'conn-github']);
  const wantsGithub =
    Boolean(githubConn) &&
    (isMentioned(githubConn!) || /\b(github|repo|repository|issue|pull request|pr)\b/i.test(lowerPrompt));

  if (githubConn && wantsGithub) {
    activeLabels.push(`${githubConn.name} (${githubConn.mentionTag})`);
    const ghHeaders: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'MariaAI-ConnectorEngine/1.0',
      ...buildAuthHeaders(githubConn),
    };

    const searchDecl: FunctionDeclaration = {
      name: 'github_search_repos',
      description: 'Search public GitHub repositories by keyword or topic.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING, description: 'GitHub search query (e.g., "react mcp server" or "user:vercel")' },
          limit: { type: Type.INTEGER, description: 'Number of results (1-8, default 5)' },
        },
        required: ['query'],
      },
    };
    declarations.push(searchDecl);
    executors.set(searchDecl.name!, {
      connectorId: githubConn.id,
      connectorName: githubConn.name,
      mentionTag: githubConn.mentionTag,
      execute: async (args) => {
        const q = String(args.query || '').trim();
        const limit = Math.max(1, Math.min(8, Number(args.limit) || 5));
        const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=${limit}`;
        const res = await fetchWithTimeout(url, { headers: ghHeaders });
        if (!res.ok) {
          return { ok: false, error: `GitHub API returned HTTP ${res.status}` };
        }
        const json: any = await res.json();
        const items = (json.items || []).map((r: any) => ({
          fullName: r.full_name,
          description: r.description,
          stars: r.stargazers_count,
          language: r.language,
          updatedAt: r.updated_at,
          url: r.html_url,
        }));
        return {
          ok: true,
          data: { totalCount: json.total_count, repositories: items },
          sourceUrl: `https://github.com/search?q=${encodeURIComponent(q)}`,
          sourceTitle: `GitHub Search: ${q}`,
        };
      },
    });

    const repoDecl: FunctionDeclaration = {
      name: 'github_get_repo',
      description: 'Inspect live metadata, stars, license, and open issues count of a GitHub repository.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          owner: { type: Type.STRING, description: 'Repository owner or organization (e.g. "facebook")' },
          repo: { type: Type.STRING, description: 'Repository name (e.g. "react")' },
        },
        required: ['owner', 'repo'],
      },
    };
    declarations.push(repoDecl);
    executors.set(repoDecl.name!, {
      connectorId: githubConn.id,
      connectorName: githubConn.name,
      mentionTag: githubConn.mentionTag,
      execute: async (args) => {
        const owner = encodeURIComponent(String(args.owner || '').trim());
        const repo = encodeURIComponent(String(args.repo || '').trim());
        const url = `https://api.github.com/repos/${owner}/${repo}`;
        const res = await fetchWithTimeout(url, { headers: ghHeaders });
        if (!res.ok) {
          return { ok: false, error: `GitHub repo lookup returned HTTP ${res.status}` };
        }
        const r: any = await res.json();
        return {
          ok: true,
          data: {
            fullName: r.full_name,
            description: r.description,
            stars: r.stargazers_count,
            forks: r.forks_count,
            openIssues: r.open_issues_count,
            defaultBranch: r.default_branch,
            language: r.language,
            license: r.license?.name,
            url: r.html_url,
          },
          sourceUrl: r.html_url,
          sourceTitle: r.full_name,
        };
      },
    });

    const issuesDecl: FunctionDeclaration = {
      name: 'github_list_issues',
      description: 'List recent open or closed issues from a GitHub repository.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          owner: { type: Type.STRING, description: 'Repository owner' },
          repo: { type: Type.STRING, description: 'Repository name' },
          state: { type: Type.STRING, description: '"open" or "closed"' },
        },
        required: ['owner', 'repo'],
      },
    };
    declarations.push(issuesDecl);
    executors.set(issuesDecl.name!, {
      connectorId: githubConn.id,
      connectorName: githubConn.name,
      mentionTag: githubConn.mentionTag,
      execute: async (args) => {
        const owner = encodeURIComponent(String(args.owner || '').trim());
        const repo = encodeURIComponent(String(args.repo || '').trim());
        const state = args.state === 'closed' ? 'closed' : 'open';
        const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=${state}&per_page=8`;
        const res = await fetchWithTimeout(url, { headers: ghHeaders });
        if (!res.ok) {
          return { ok: false, error: `GitHub issues returned HTTP ${res.status}` };
        }
        const raw: any[] = await res.json();
        return {
          ok: true,
          data: raw.map((iss) => ({
            number: iss.number,
            title: iss.title,
            state: iss.state,
            author: iss.user?.login,
            comments: iss.comments,
            url: iss.html_url,
          })),
          sourceUrl: `https://github.com/${owner}/${repo}/issues`,
          sourceTitle: `${owner}/${repo} Issues`,
        };
      },
    });
  }

  // 2. Science / Literature Connectors (PubMed + UniProt)
  const scienceConn = findConnector(['science-scout', 'consensus', 'zotero']);
  const wantsScience =
    Boolean(scienceConn) &&
    (isMentioned(scienceConn!) || /\b(pubmed|uniprot|protein|journal|jurnal|paper|riset|study|penelitian)\b/i.test(lowerPrompt));

  if (scienceConn && wantsScience) {
    activeLabels.push(`${scienceConn.name} (${scienceConn.mentionTag})`);

    const pubmedDecl: FunctionDeclaration = {
      name: 'science_search_pubmed',
      description: 'Search peer-reviewed biomedical and scientific papers on NCBI PubMed.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING, description: 'Scientific keywords or topic' },
        },
        required: ['query'],
      },
    };
    declarations.push(pubmedDecl);
    executors.set(pubmedDecl.name!, {
      connectorId: scienceConn.id,
      connectorName: scienceConn.name,
      mentionTag: scienceConn.mentionTag,
      execute: async (args) => {
        const q = String(args.query || '').trim();
        const searchRes = await fetchWithTimeout(
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(q)}&retmode=json&retmax=5`
        );
        if (!searchRes.ok) return { ok: false, error: `PubMed search HTTP ${searchRes.status}` };
        const sData: any = await searchRes.json();
        const ids: string[] = sData.esearchresult?.idlist || [];
        if (ids.length === 0) return { ok: true, data: { papers: [] } };
        const sumRes = await fetchWithTimeout(
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`
        );
        const sumData: any = sumRes.ok ? await sumRes.json() : {};
        const papers = ids.map((id) => {
          const item = sumData.result?.[id];
          return {
            pmid: id,
            title: item?.title,
            journal: item?.source,
            pubdate: item?.pubdate,
            url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          };
        });
        return {
          ok: true,
          data: { papers },
          sourceUrl: papers[0]?.url,
          sourceTitle: papers[0]?.title || `PubMed: ${q}`,
        };
      },
    });

    const uniprotDecl: FunctionDeclaration = {
      name: 'science_search_uniprot',
      description: 'Look up protein sequence metadata and AlphaFold references from UniProtKB.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING, description: 'Protein or gene name' },
        },
        required: ['query'],
      },
    };
    declarations.push(uniprotDecl);
    executors.set(uniprotDecl.name!, {
      connectorId: scienceConn.id,
      connectorName: scienceConn.name,
      mentionTag: scienceConn.mentionTag,
      execute: async (args) => {
        const q = String(args.query || '').trim();
        const res = await fetchWithTimeout(
          `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(q)}&size=4&format=json`
        );
        if (!res.ok) return { ok: false, error: `UniProt HTTP ${res.status}` };
        const json: any = await res.json();
        const results = (json.results || []).map((item: any) => ({
          accession: item.primaryAccession,
          gene: item.genes?.[0]?.geneName?.value || 'N/A',
          proteinName: item.proteinDescription?.recommendedName?.fullName?.value || item.uniProtkbId,
          organism: item.organism?.scientificName || 'N/A',
          length: item.sequence?.length,
          alphaFoldUrl: `https://alphafold.ebi.ac.uk/entry/${item.primaryAccession}`,
        }));
        return {
          ok: true,
          data: { proteins: results },
          sourceUrl: results[0]?.alphaFoldUrl,
          sourceTitle: results[0]?.proteinName || `UniProt: ${q}`,
        };
      },
    });
  }

  // 3. Safe URL Inspection Tool when URL is present or Security/Web connectors active
  const urlConn = findConnector(['codex-security', 'malwarebytes', 'exa', 'google-search']);
  const promptHasUrl = /https?:\/\/[^\s]+/i.test(lastUserText);
  if (urlConn && (promptHasUrl || isMentioned(urlConn))) {
    const inspectDecl: FunctionDeclaration = {
      name: 'connector_inspect_url',
      description: 'Safely fetch public webpage title, HTTP status, security headers, and readable text summary.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          url: { type: Type.STRING, description: 'Public https:// or http:// URL to inspect' },
        },
        required: ['url'],
      },
    };
    declarations.push(inspectDecl);
    executors.set(inspectDecl.name!, {
      connectorId: urlConn.id,
      connectorName: urlConn.name,
      mentionTag: urlConn.mentionTag,
      execute: async (args) => {
        const safeUrl = validateSafeRemoteUrl(String(args.url || ''));
        const res = await fetchWithTimeout(safeUrl.toString(), {
          method: 'GET',
          headers: {
            'User-Agent': 'MariaAI-ConnectorEngine/1.0',
            Accept: 'text/html,application/json,text/plain',
          },
        });
        const contentType = res.headers.get('content-type') || '';
        const text = (await res.text().catch(() => '')).slice(0, 18000);
        const titleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const plain = text
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 3500);

        return {
          ok: res.ok,
          data: {
            url: safeUrl.toString(),
            status: res.status,
            contentType,
            title: titleMatch?.[1]?.trim(),
            headers: {
              strictTransportSecurity: res.headers.get('strict-transport-security'),
              contentSecurityPolicy: res.headers.get('content-security-policy'),
              xFrameOptions: res.headers.get('x-frame-options'),
            },
            excerpt: plain,
          },
          sourceUrl: safeUrl.toString(),
          sourceTitle: titleMatch?.[1]?.trim() || safeUrl.hostname,
        };
      },
    });
  }

  // 4. Custom Remote MCP / REST Connectors
  const customConnectors = activeConnectors.filter((c) => c.source === 'custom' && c.mcpUrl);
  for (const conn of customConnectors) {
    // Trigger if explicitly @mentioned OR if user has <= 3 enabled custom connectors
    const shouldInclude = isMentioned(conn) || customConnectors.length <= 3;
    if (!shouldInclude || !conn.mcpUrl) continue;

    activeLabels.push(`${conn.name} (${conn.mentionTag} -> ${conn.mcpUrl})`);

    const toolEntries: DiscoveredMcpTool[] =
      conn.discoveredTools && conn.discoveredTools.length > 0
        ? conn.discoveredTools.slice(0, 6)
        : (conn.tools && conn.tools.length > 0 ? conn.tools.slice(0, 4) : ['execute_tool']).map(
            (name) => ({ name })
          );

    const connSlug = sanitizeToolIdentifier(conn.mentionTag.replace(/^@/, '') || conn.name).slice(0, 20);

    for (const toolDef of toolEntries) {
      const toolSlug = sanitizeToolIdentifier(toolDef.name).slice(0, 36);
      const fnName = `mcp_${connSlug}_${toolSlug}`.slice(0, 63);
      if (executors.has(fnName)) continue;

      const decl: FunctionDeclaration = {
        name: fnName,
        description:
          toolDef.description ||
          `Invoke tool "${toolDef.name}" on custom connector ${conn.name} (${conn.mentionTag}).`,
        parameters: convertSchemaToGeminiParameters(toolDef.inputSchema),
      };

      declarations.push(decl);
      executors.set(fnName, {
        connectorId: conn.id,
        connectorName: conn.name,
        mentionTag: conn.mentionTag,
        execute: async (args) => {
          const safeUrl = validateSafeRemoteUrl(conn.mcpUrl!);
          const authHeaders = buildAuthHeaders(conn);

          let resolvedArgs: Record<string, any> = { ...args };
          if (typeof args.paramsJson === 'string' && args.paramsJson.trim()) {
            try {
              const parsed = JSON.parse(args.paramsJson);
              if (parsed && typeof parsed === 'object') {
                resolvedArgs = { ...parsed, ...resolvedArgs };
                delete resolvedArgs.paramsJson;
              }
            } catch {}
          }

          // Try MCP JSON-RPC tools/call first
          const rpcRes = await fetchWithTimeout(safeUrl.toString(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json, text/event-stream',
              'User-Agent': 'MariaAI-ConnectorEngine/1.0',
              ...authHeaders,
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: Date.now(),
              method: 'tools/call',
              params: {
                name: toolDef.name,
                arguments: resolvedArgs,
              },
            }),
          });

          const rawBody = await rpcRes.text().catch(() => '');
          const parsedBody = parseJsonOrSsePayload(rawBody);

          if (rpcRes.ok && parsedBody) {
            if (parsedBody.error) {
              return {
                ok: false,
                error: parsedBody.error?.message || JSON.stringify(parsedBody.error),
              };
            }
            return {
              ok: true,
              data: truncatePayload(parsedBody.result ?? parsedBody),
              sourceUrl: safeUrl.toString(),
              sourceTitle: `${conn.name} · ${toolDef.name}`,
            };
          }

          // Fallback for plain REST endpoints that return raw text or reject JSON-RPC body
          if (rpcRes.ok) {
            return {
              ok: true,
              data: { text: rawBody.slice(0, 12000) },
              sourceUrl: safeUrl.toString(),
              sourceTitle: `${conn.name} · ${toolDef.name}`,
            };
          }

          if (rpcRes.status === 405) {
            const queryUrl = new URL(safeUrl.toString());
            if (resolvedArgs.query) queryUrl.searchParams.set('q', String(resolvedArgs.query));
            const getRes = await fetchWithTimeout(queryUrl.toString(), {
              method: 'GET',
              headers: {
                Accept: 'application/json, text/plain',
                'User-Agent': 'MariaAI-ConnectorEngine/1.0',
                ...authHeaders,
              },
            });
            const getBody = await getRes.text().catch(() => '');
            const getJson = parseJsonOrSsePayload(getBody);
            return {
              ok: getRes.ok,
              data: truncatePayload(getJson ?? { text: getBody.slice(0, 12000) }),
              error: getRes.ok ? undefined : `Endpoint returned HTTP ${getRes.status}`,
              sourceUrl: queryUrl.toString(),
              sourceTitle: `${conn.name} · ${toolDef.name}`,
            };
          }

          return {
            ok: false,
            error: `Connector ${conn.name} returned HTTP ${rpcRes.status}`,
          };
        },
      });
    }
  }

  // Inform system instruction only about connectors with active callable functions
  const systemAddendum =
    declarations.length > 0
      ? `\n\n=== KONEKTOR ENGINE AKTIF (FUNCTION CALLING NYATA) ===\nKonektor terpasang & siap dieksekusi: ${activeLabels.join(', ')}.\nApabila pengguna meminta data atau aksi terkait konektor tersebut (atau memanggil tag @mention), PANGGIL function tool yang sesuai terlebih dahulu untuk mengambil data aktual, lalu rangkum hasilnya dengan akurat.`
      : hasId('google-maps') && forceMapsMode
      ? '\n\nPengguna memanggil @GoogleMaps: gunakan Google Maps grounding untuk menjawab informasi lokasi dan tempat secara akurat.'
      : '';

  return {
    declarations: declarations.slice(0, 16),
    executors,
    systemAddendum,
    forceMapsMode,
    forceWebSearch,
  };
}

export async function executeFunctionCallsBatch(
  functionCalls: Array<{ id?: string; name?: string; args?: any }>,
  executors: Map<string, ConnectorToolExecutor>
): Promise<{
  responseParts: Array<{ functionResponse: { id?: string; name: string; response: any } }>;
  links: Array<{ title?: string; uri: string }>;
}> {
  const links: Array<{ title?: string; uri: string }> = [];

  const responseParts = await Promise.all(
    functionCalls.map(async (call) => {
      const fnName = call.name || 'unknown_tool';
      const executor = executors.get(fnName);
      if (!executor) {
        return {
          functionResponse: {
            ...(call.id ? { id: call.id } : {}),
            name: fnName,
            response: { ok: false, error: `Tool "${fnName}" is not registered.` },
          },
        };
      }

      try {
        const result = await executor.execute(
          call.args && typeof call.args === 'object' ? call.args : {}
        );
        if (result.sourceUrl && !links.some((l) => l.uri === result.sourceUrl)) {
          links.push({
            title: result.sourceTitle || executor.connectorName,
            uri: result.sourceUrl,
          });
        }
        return {
          functionResponse: {
            ...(call.id ? { id: call.id } : {}),
            name: fnName,
            response: {
              connector: executor.connectorName,
              ok: result.ok,
              ...(result.data !== undefined ? { data: result.data } : {}),
              ...(result.error ? { error: result.error } : {}),
            },
          },
        };
      } catch (err: any) {
        return {
          functionResponse: {
            ...(call.id ? { id: call.id } : {}),
            name: fnName,
            response: {
              connector: executor.connectorName,
              ok: false,
              error: err?.message || 'Connector execution failed.',
            },
          },
        };
      }
    })
  );

  return { responseParts, links };
}
