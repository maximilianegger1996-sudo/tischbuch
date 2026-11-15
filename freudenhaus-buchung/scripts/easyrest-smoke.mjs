#!/usr/bin/env node
/**
 * Wintersteiger EasyRest smoke test.
 * Reads EASYREST_BASE_URL + EASYREST_ACCESS_ID from env.
 * Refuses to send the accessId over plain http://
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const base = (process.env.EASYREST_BASE_URL || "").replace(/\/$/, "");
const accessId = process.env.EASYREST_ACCESS_ID || "";
const insecure = process.env.EASYREST_TLS_INSECURE === "1";

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!base) fail("EASYREST_BASE_URL fehlt");
if (!accessId) fail("EASYREST_ACCESS_ID fehlt");
if (base.startsWith("http://")) {
  fail(
    "EASYREST_BASE_URL ist HTTP ohne TLS — Access-ID wird nicht gesendet. Bitte https://…:11133/easyrest/rest/easyrest verwenden.",
  );
}
if (!base.startsWith("https://")) fail("EASYREST_BASE_URL muss mit https:// beginnen");

if (insecure) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  console.warn("⚠ EASYREST_TLS_INSECURE=1 — Zertifikatsprüfung aus (nur Übergang).");
}

async function get(path, query = {}) {
  const url = new URL(base + path);
  url.searchParams.set("accessId", accessId);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json, bytes: text.length };
}

const checks = [
  ["GET /aliveserver", () => get("/aliveserver")],
  ["GET /branches?top=5", () => get("/branches", { top: 5 })],
  ["GET /hotels?top=2", () => get("/hotels", { top: 2 })],
  ["GET /customers?top=1", () => get("/customers", { top: 1 })],
];

let failed = 0;
for (const [label, fn] of checks) {
  try {
    const r = await fn();
    const ok = r.status >= 200 && r.status < 300;
    const preview = JSON.stringify(r.json)?.slice(0, 160) || "(empty)";
    console.log(`${ok ? "✓" : "✗"} ${label} → ${r.status} (${r.bytes}b) ${preview}`);
    if (!ok) failed++;
  } catch (e) {
    console.log(`✗ ${label} → ${e.message}`);
    failed++;
  }
}

if (failed) fail(`${failed} Check(s) fehlgeschlagen`);
console.log("✓ EasyRest smoke OK");
