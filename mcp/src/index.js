#!/usr/bin/env node
/**
 * Tischbuch guest MCP — stdio server (Claude Desktop / Cursor local).
 * Only guest public_* Supabase RPCs (anon/publishable key). No staff/admin tools.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createGuestServer } from './create-server.js';

const server = createGuestServer();
const transport = new StdioServerTransport();
await server.connect(transport);
