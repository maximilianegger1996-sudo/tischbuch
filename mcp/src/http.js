#!/usr/bin/env node
/**
 * Remote guest MCP + REST API (Streamable HTTP).
 *
 * Host with Docker / any Node host. Guests connect Claude/Cursor to
 *   https://YOUR_HOST/mcp
 * ChatGPT Custom GPT Actions use /api/* (see openapi/guest-booking.openapi.yaml).
 *
 * Optional shared bearer: TISCHBUCH_MCP_TOKEN (Authorization: Bearer …).
 * Env: TISCHBUCH_SUPA_URL, TISCHBUCH_SUPA_ANON_KEY, PORT, HOST, ALLOWED_HOSTS
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { createGuestServer, SERVER_NAME, SERVER_VERSION } from './create-server.js';
import { mountRestRoutes } from './rest.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || process.env.MCP_PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';
const TOKEN = (process.env.TISCHBUCH_MCP_TOKEN || '').trim();
const allowedHosts = (process.env.ALLOWED_HOSTS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const app = createMcpExpressApp({
  host: HOST,
  ...(allowedHosts.length ? { allowedHosts } : {}),
});

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, mcp-session-id, Last-Event-ID, mcp-protocol-version',
  );
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id, mcp-protocol-version');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

if (TOKEN) {
  app.use((req, res, next) => {
    if (req.path === '/health') return next();
    const hdr = String(req.headers.authorization || '');
    const ok = hdr === `Bearer ${TOKEN}` || hdr === `bearer ${TOKEN}`;
    if (!ok) {
      res.status(401).json({ ok: false, error: 'Unauthorized — set Authorization: Bearer <TISCHBUCH_MCP_TOKEN>' });
      return;
    }
    next();
  });
}

mountRestRoutes(app);

app.get('/openapi.yaml', (_req, res) => {
  try {
    const path = join(__dirname, '..', 'openapi', 'guest-booking.openapi.yaml');
    const body = readFileSync(path, 'utf8');
    res.type('text/yaml').send(body);
  } catch {
    res.status(404).json({ ok: false, error: 'openapi not found' });
  }
});

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: SERVER_NAME,
    version: SERVER_VERSION,
    mcp: '/mcp',
    health: '/health',
    openapi: '/openapi.yaml',
    rest: '/api/venues',
    howto: '/howto?lang=de|en',
    auth: TOKEN ? 'bearer' : 'none (anon guest RPCs only)',
  });
});

/** Stateless Streamable HTTP MCP — one server+transport per POST (works for Claude/Cursor remote). */
app.post('/mcp', async (req, res) => {
  const server = createGuestServer();
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on('close', () => {
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error('MCP error', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});

app.get('/mcp', (_req, res) => {
  res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed. Use POST /mcp (stateless streamable HTTP).' },
    id: null,
  });
});

app.delete('/mcp', (_req, res) => {
  res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed (stateless).' },
    id: null,
  });
});

app.listen(PORT, HOST, () => {
  console.error(`${SERVER_NAME} v${SERVER_VERSION} listening on http://${HOST}:${PORT}`);
  console.error(`  MCP:     POST http://${HOST}:${PORT}/mcp`);
  console.error(`  REST:    http://${HOST}:${PORT}/api/venues`);
  console.error(`  OpenAPI: http://${HOST}:${PORT}/openapi.yaml`);
  console.error(`  Auth:    ${TOKEN ? 'Bearer token required' : 'open (anon guest RPCs)'}`);
});
