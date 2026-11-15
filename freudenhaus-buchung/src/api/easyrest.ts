/** Browser client — talks only to same-origin /api/easyrest (Vite proxy injects accessId). */

const ROOT = "/api/easyrest";

async function api<T>(path: string, init?: RequestInit & { query?: Record<string, string | number | boolean | undefined> }): Promise<T> {
  const url = new URL(ROOT + path, window.location.origin);
  if (init?.query) {
    for (const [k, v] of Object.entries(init.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  const { query: _q, ...rest } = init || {};
  const res = await fetch(url, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...rest.headers,
    },
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    throw new Error(`EasyRest ${path} → ${res.status}: ${typeof json === "string" ? json : JSON.stringify(json)}`);
  }
  return json as T;
}

export type EasyRestBranch = {
  branchId: number;
  branchCode: string;
  branchIdExternal?: string;
  name: string;
};

export type ReservableArticle = {
  er_rentalgroupid: number;
  rentalgroupname: string;
  rentalgrouptype: "R" | "D";
  typeofequipmentname: string;
  property1?: string;
  er_modelid?: number;
  modelname?: string;
  modelyear?: string;
  modelbrand?: string;
};

export const easyrest = {
  branches: (top = 50) => api<EasyRestBranch[]>("/branches", { query: { top } }),
  reservableArticles: () =>
    api<{ reservablearticle: ReservableArticle[] }>("/reservation/reservablearticles"),
  getAvailCount: (getavail: Array<Record<string, unknown>>) =>
    api<{ getavailresult: Array<{ er_rentalgroupid: number; availcount: number; property1?: string; er_modelid?: number }> }>(
      "/reservation/getavailcount",
      { method: "POST", body: JSON.stringify({ getavail }) },
    ),
  calculatePrices: (payload: {
    branchid: number;
    persons: Array<{
      personid: string;
      age?: number;
      dateofbirth?: string;
      articles: Array<{
        lineid: string;
        datefrom: string;
        dateto: string;
        er_rentalgroupid: number;
      }>;
    }>;
  }) =>
    api<{
      branchid: number;
      currency: string;
      persons: Array<{
        personid: string;
        articles: Array<{ lineid: string; price: number; er_pricelistid?: number; ispackageprice?: boolean }>;
      }>;
    }>("/reservation/calculateprices", { method: "POST", body: JSON.stringify(payload) }),
  insertUpdateReservation: (payload: unknown) =>
    api<unknown>("/reservation/insertupdatereservation", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
