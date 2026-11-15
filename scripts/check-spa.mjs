#!/usr/bin/env node
/**
 * Static SPA checks for Tischbuch (no browser): HTML shell + script syntax + key UI markers.
 * Exit 0 on success; prints FAIL lines and exit 1 on error.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(root, 'index.html');
let failed = 0;
const fail = (msg) => {
  console.error('FAIL', msg);
  failed++;
};
const ok = (msg) => console.log('OK', msg);

if (!fs.existsSync(indexPath)) {
  fail('index.html missing');
  process.exit(1);
}
const html = fs.readFileSync(indexPath, 'utf8');
ok(`index.html ${html.length} bytes`);

for (const needle of [
  '<!doctype html>',
  'family=Jost',
  'STAFF_FONT_VARS',
  'id="staff-drawer"',
  'data-act="menu"',
  'id="v-dash"',
  'id="designdlg"',
  'renderDashboard',
  'loadFloorDesign',
  'floorDesign',
  'Mehrtisch-Reservierungen',
  'Gastro wechseln',
  'Nachrichten-Fehler',
  'Low-End-Modus',
]) {
  if (!html.includes(needle)) fail(`missing marker: ${needle}`);
  else ok(`marker ${needle}`);
}

const scriptMatch = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/i);
if (!scriptMatch) fail('inline <script> before </body> not found');
else {
  try {
    // eslint-disable-next-line no-new-func
    new Function(scriptMatch[1]);
    ok(`script syntax (${scriptMatch[1].length} chars)`);
  } catch (e) {
    fail(`script syntax: ${e.message}`);
  }
}

const styleOpen = (html.match(/<style\b/gi) || []).length;
const styleClose = (html.match(/<\/style>/gi) || []).length;
if (styleOpen !== styleClose) fail(`style tag imbalance open=${styleOpen} close=${styleClose}`);
else ok(`style tags ${styleOpen}`);

for (const rel of ['embeds/lue.html', 'embeds/steinbock.html', 'embeds/mundwerk.html', 'mcp/package.json', 'mcp/src/smoke.js']) {
  if (!fs.existsSync(path.join(root, rel))) fail(`missing ${rel}`);
  else ok(rel);
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nSPA checks passed.');
