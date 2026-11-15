const BASE = (process.env.EASYREST_BASE_URL || "").replace(/\/$/, "");
const ACCESS = process.env.EASYREST_ACCESS_ID || "";

if (process.env.EASYREST_TLS_INSECURE === "1") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export async function easyrest(path, { method = "GET", body, query } = {}) {
  if (!BASE) throw new Error("EASYREST_BASE_URL missing");
  const url = new URL(BASE + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v != null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...(ACCESS ? { accessId: ACCESS } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    const err = new Error(`EasyRest ${path} → ${res.status}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}
