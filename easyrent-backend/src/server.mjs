import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { BRANCHES, RENTAL_GROUPS } from "./mapping.mjs";
import { easyrest } from "./easyrest.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
  }
}

const PORT = Number(process.env.PORT || 8787);

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return null;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const site = {
  name: "Rentfreudenhaus",
  shopName: "FREUDENHAUS Rent",
  logo: "https://freudenhaus.rentbuddy.solutions/media/cache/favicon/images/logo-freudenhaus-rent-64f1e5eec6cd4854116644.png",
  logoInverted: "",
  bgImage: "https://www.skirent-obertauern.at/img/hero-video-poster.jpg",
  youthAge: 11,
  adultAge: 17,
  maxPersons: 20,
  pickupTime: "15:00",
  coverageDefault: true,
  colors: { font: "#1c1c1c", button: "#2b2b2b", highlight: "#7fa88c" },
  paymentBrands: [],
  seasonStart: "2026-11-20",
  seasonEnd: "2027-04-14",
};

createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return json(res, 204, {});

    const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
    const path = url.pathname.replace(/\/$/, "") || "/";

    if (path === "/health") return json(res, 200, { ok: true, service: "easyrent-backend" });

    if (path === "/api/booking/site" && req.method === "GET") return json(res, 200, site);

    if (path === "/api/booking/locations" && req.method === "GET") {
      try {
        const branches = await easyrest("/branches", { query: { top: 50 } });
        const byId = new Map((branches || []).map((b) => [String(b.branchId), b]));
        return json(
          res,
          200,
          BRANCHES.map((b) => {
            const live = byId.get(b.id);
            return {
              id: b.id,
              title: live?.name || b.title,
              highlight: b.highlight || null,
              closedRanges: [],
            };
          }),
        );
      } catch {
        return json(
          res,
          200,
          BRANCHES.map((b) => ({ id: b.id, title: b.title, highlight: b.highlight || null, closedRanges: [] })),
        );
      }
    }

    if (path === "/api/booking/specials" && req.method === "GET") {
      return json(res, 200, [
        {
          id: "1",
          type: 1,
          title: "Versicherung",
          textHtml: "Schutz gegen Diebstahl & Bruch. Kein Selbstbehalt mit Versicherung.",
        },
        {
          id: "2",
          type: 0,
          title: "Test & Buy",
          textHtml: "Beim Kauf von Ski werden dir maximal zwei Tage der Leihgebühr gutgeschrieben.",
        },
      ]);
    }

    if (path === "/api/booking/catalog" && req.method === "GET") {
      return json(res, 200, {
        products: RENTAL_GROUPS.map((g) => ({
          id: g.id,
          title: g.title,
          categoryTitle: "Ausrüstung",
        })),
      });
    }

    if (path === "/api/booking/quote" && req.method === "POST") {
      const draft = await readBody(req);
      if (!draft?.from || !draft?.to || !draft?.locationId) {
        return json(res, 400, { error: "from, to, locationId required" });
      }
      const persons = (draft.persons || [])
        .filter((p) => (p.lines || []).length)
        .map((p) => ({
          personid: p.id,
          age: p.age ?? (p.kind === "adult" ? 30 : p.kind === "youth" ? 14 : 8),
          articles: (p.lines || []).map((l, idx) => ({
            lineid: `${p.id}-${idx}`,
            datefrom: draft.from,
            dateto: draft.to,
            er_rentalgroupid: Number(l.productId),
          })),
        }));

      if (!persons.length) {
        return json(res, 200, {
          categories: [
            {
              id: "1",
              title: "Ausrüstung",
              products: RENTAL_GROUPS.map((g) => ({
                id: g.id,
                title: g.title,
                categoryId: "1",
                categoryTitle: "Ausrüstung",
                modelRequired: false,
                bullets: [],
                displayDaily: {},
                accessories: [],
                models: [],
              })),
            },
          ],
          cartTotal: null,
        });
      }

      const priced = await easyrest("/reservation/calculateprices", {
        method: "POST",
        body: { branchid: Number(draft.locationId), persons },
      });
      let sum = 0;
      for (const person of priced.persons || []) {
        for (const art of person.articles || []) sum += art.price || 0;
      }
      return json(res, 200, {
        categories: [
          {
            id: "1",
            title: "Ausrüstung",
            products: RENTAL_GROUPS.map((g) => ({
              id: g.id,
              title: g.title,
              categoryId: "1",
              categoryTitle: "Ausrüstung",
              modelRequired: false,
              bullets: [],
              displayDaily: {},
              accessories: [],
              models: [],
            })),
          },
        ],
        cartTotal: { amountCents: Math.round(sum * 100), currency: priced.currency || "EUR" },
        raw: priced,
      });
    }

    if (path === "/api/booking/reservations" && req.method === "POST") {
      const draft = await readBody(req);
      const payload = {
        reservation: {
          reservationextid: `RFH-${Date.now()}`,
          origin: "rentfreudenhaus",
          datefrom: draft.from,
          dateto: draft.to,
          er_branchid: draft.locationId ? Number(draft.locationId) : undefined,
          pickuptime:
            draft.pickupDayBefore && draft.from ? `${draft.from}T15:00:00` : undefined,
          person: (draft.persons || []).map((p, i) => ({
            firstname: p.firstName || `Gast${i + 1}`,
            lastname: p.lastName || "Online",
            email: p.email,
            telephone: p.phone,
            age: p.age,
            mainperson: i === 0,
            heightcm: p.height,
            weightkg: p.weight,
            coverage: p.coverage,
            marketingactivate: draft.newsletter,
            remark: draft.remark || undefined,
            article: (p.lines || []).map((l) => ({
              articletype: "R",
              er_rentalgroupid: Number(l.productId),
              rentalgroupname: l.title,
              property1: l.property1 || undefined,
              er_modelid: l.modelId ? Number(l.modelId) : undefined,
              quantity: l.count || 1,
            })),
          })),
        },
      };

      if (process.env.EASYREST_LIVE_BOOK !== "1") {
        return json(res, 200, {
          ok: true,
          status: "dry-run",
          bookingId: payload.reservation.reservationextid,
          payload,
        });
      }
      const raw = await easyrest("/reservation/insertupdatereservation", {
        method: "POST",
        body: payload,
      });
      return json(res, 200, { ok: true, status: "created", bookingId: payload.reservation.reservationextid, raw });
    }

    json(res, 404, { error: "not found", path });
  } catch (e) {
    console.error(e);
    json(res, e.status || 500, { error: e.message || "server error", body: e.body });
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`easyrent-backend listening on http://127.0.0.1:${PORT}`);
});
