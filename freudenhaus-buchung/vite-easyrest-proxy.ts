import type { Plugin } from "vite";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(root: string) {
  const path = resolve(root, ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

/**
 * Dev/preview middleware: SPA calls /api/easyrest/* without seeing the accessId.
 * Forwards to HTTPS EasyRest and injects accessId server-side.
 */
export function easyrestProxy(): Plugin {
  return {
    name: "easyrest-proxy",
    configureServer(server) {
      loadEnv(server.config.root);
      server.middlewares.use(createMiddleware());
    },
    configurePreviewServer(server) {
      loadEnv(server.config.root);
      server.middlewares.use(createMiddleware());
    },
  };
}

function createMiddleware() {
  return async (req: any, res: any, next: any) => {
    if (!req.url?.startsWith("/api/easyrest")) return next();

    const base = (process.env.EASYREST_BASE_URL || "").replace(/\/$/, "");
    const accessId = process.env.EASYREST_ACCESS_ID || "";
    const insecure = process.env.EASYREST_TLS_INSECURE === "1";
    const liveBook = process.env.EASYREST_LIVE_BOOK === "1";

    if (!base || !accessId) {
      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "EasyRest not configured (EASYREST_BASE_URL / EASYREST_ACCESS_ID)" }));
      return;
    }
    if (base.startsWith("http://")) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Refusing cleartext HTTP EasyRest base URL" }));
      return;
    }

    try {
      const incoming = new URL(req.url, "http://localhost");
      const sub = incoming.pathname.replace(/^\/api\/easyrest/, "") || "/";
      const target = new URL(base + sub);
      incoming.searchParams.forEach((v, k) => {
        if (k !== "accessId") target.searchParams.set(k, v);
      });
      target.searchParams.set("accessId", accessId);

      if (sub === "/reservation/insertupdatereservation" && req.method === "POST" && !liveBook) {
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const body = Buffer.concat(chunks).toString("utf8");
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            dryRun: true,
            message: "EASYREST_LIVE_BOOK≠1 — Reservierung nicht an Easyrent gesendet",
            wouldPostTo: target.pathname,
            payload: body ? JSON.parse(body) : null,
          }),
        );
        return;
      }

      const chunks: Buffer[] = [];
      if (req.method !== "GET" && req.method !== "HEAD") {
        for await (const c of req) chunks.push(c as Buffer);
      }
      const body = chunks.length ? Buffer.concat(chunks) : undefined;

      if (insecure) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

      const upstream = await fetch(target, {
        method: req.method,
        headers: {
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body,
      });
      const text = await upstream.text();
      res.statusCode = upstream.status;
      res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
      res.end(text);
    } catch (e) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: e instanceof Error ? e.message : "proxy error" }));
    }
  };
}
