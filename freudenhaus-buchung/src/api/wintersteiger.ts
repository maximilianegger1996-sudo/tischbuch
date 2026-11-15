import { easyrest, type ReservableArticle } from "./easyrest";
import type {
  BookingDraft,
  BookingProvider,
  Category,
  CreateReservationResult,
  Location,
  Money,
  PriceQuote,
  Product,
  ProductModel,
  SiteSettings,
  WintersteigerExport,
} from "./types";
import { rentBuddyProvider } from "./rentbuddy";
import { BRANCH_META, ONLINE_BRANCH_ORDER, SITE_DEFAULT, SPECIALS_DEFAULT } from "./mapping";
import { enrichCategoriesWithMedia } from "./product-media";

function euros(n: number): Money {
  return { amountCents: Math.round(n * 100), currency: "EUR" };
}

function buildCatalog(articles: ReservableArticle[]): Category[] {
  const byEquip = new Map<string, Map<number, { name: string; models: Map<number, ProductModel>; sizes: Set<string> }>>();

  for (const a of articles) {
    if (a.rentalgrouptype !== "R") continue;
    const equip = a.typeofequipmentname || "Sonstige";
    if (!byEquip.has(equip)) byEquip.set(equip, new Map());
    const groups = byEquip.get(equip)!;
    if (!groups.has(a.er_rentalgroupid)) {
      groups.set(a.er_rentalgroupid, {
        name: a.rentalgroupname,
        models: new Map(),
        sizes: new Set(),
      });
    }
    const g = groups.get(a.er_rentalgroupid)!;
    if (a.property1) g.sizes.add(a.property1);
    if (a.er_modelid) {
      const existing = g.models.get(a.er_modelid) || {
        id: String(a.er_modelid),
        title: a.modelname || `Model ${a.er_modelid}`,
        brand: a.modelbrand,
        variants: [],
      };
      if (a.property1 && !existing.variants.some((v) => v.property1 === a.property1)) {
        existing.variants.push({ property1: a.property1 });
      }
      g.models.set(a.er_modelid, existing);
    }
  }

  const categories: Category[] = [];
  let catIdx = 0;
  for (const [equip, groups] of byEquip) {
    catIdx += 1;
    const catId = String(catIdx);
    const products: Product[] = [];
    for (const [rgId, g] of groups) {
      products.push({
        id: String(rgId),
        externalKey: String(rgId),
        title: g.name,
        subtitle: equip,
        categoryId: catId,
        categoryTitle: equip,
        modelRequired: false,
        bullets: [],
        displayDaily: {},
        accessories: [],
        models: [...g.models.values()],
      });
    }
    categories.push({ id: catId, title: equip, products });
  }
  return categories;
}

function toInsertPayload(draft: BookingDraft) {
  const persons = draft.persons.map((p, i) => ({
    firstname: p.firstName || `Gast${i + 1}`,
    lastname: p.lastName || "Online",
    email: p.email || (i === 0 ? undefined : undefined),
    telephone: p.phone,
    age: p.age,
    mainperson: i === 0,
    heightcm: p.height,
    weightkg: p.weight,
    bootsize: p.shoeSize != null ? String(p.shoeSize) : undefined,
    coverage: p.coverage,
    marketingactivate: draft.newsletter,
    remark: draft.remark || undefined,
    article: p.lines.map((l) => ({
      articletype: "R" as const,
      er_rentalgroupid: Number(l.productId),
      rentalgroupname: l.title,
      property1: l.property1 || undefined,
      er_modelid: l.modelId ? Number(l.modelId) : undefined,
      modelname: l.modelTitle || undefined,
      quantity: l.count || 1,
    })),
  }));
  if (persons[0] && draft.persons[0]?.email) persons[0].email = draft.persons[0].email;

  return {
    reservation: {
      reservationextid: `FH-${Date.now()}`,
      origin: "rentfreudenhaus",
      datefrom: draft.from,
      dateto: draft.to,
      er_branchid: draft.locationId ? Number(draft.locationId) : undefined,
      pickuptime: draft.pickupDayBefore && draft.from ? `${draft.from}T15:00:00` : undefined,
      person: persons,
    },
  };
}

export const wintersteigerProvider: BookingProvider = {
  id: "wintersteiger",
  label: "Rentfreudenhaus · Easyrent",

  async loadSite(): Promise<SiteSettings> {
    return { ...SITE_DEFAULT };
  },

  async loadLocations(): Promise<Location[]> {
    try {
      const branches = await easyrest.branches(50);
      const byId = new Map(branches.map((b) => [String(b.branchId), b]));
      return ONLINE_BRANCH_ORDER.map((id) => {
        const live = byId.get(id);
        const meta = BRANCH_META[id];
        return {
          id,
          externalKey: live?.branchIdExternal || live?.branchCode || id,
          title: meta?.title || live?.name || id,
          highlight: meta?.highlight || null,
          addressHtml: meta?.addressHtml,
          image: meta?.image,
          closedRanges: [],
        } satisfies Location;
      });
    } catch (e) {
      console.warn("EasyRest branches failed, using mapped offline list", e);
      return ONLINE_BRANCH_ORDER.map((id) => {
        const meta = BRANCH_META[id];
        return {
          id,
          title: meta.title,
          highlight: meta.highlight || null,
          addressHtml: meta.addressHtml,
          image: meta.image,
          closedRanges: [],
        } satisfies Location;
      });
    }
  },

  async loadSpecials() {
    return SPECIALS_DEFAULT.map((s) => ({ ...s }));
  },

  async loadCalendar() {
    return [];
  },

  async quote(draft: BookingDraft): Promise<PriceQuote> {
    if (!draft.from || !draft.to) {
      return { categories: [], rate: null, rates: [], cartTotal: null, cartList: null, cartDiscount: null };
    }
    try {
      const { reservablearticle } = await easyrest.reservableArticles();
      const categories = enrichCategoriesWithMedia(buildCatalog(reservablearticle));

      let cartTotal: Money | null = null;
      if (draft.locationId && draft.persons.some((p) => p.lines.length)) {
        const priced = await easyrest.calculatePrices({
          branchid: Number(draft.locationId),
          persons: draft.persons.map((p) => ({
            personid: p.id,
            age: p.age ?? (p.kind === "adult" ? 30 : p.kind === "youth" ? 14 : 8),
            articles: p.lines.map((l, idx) => ({
              lineid: `${p.id}-${idx}`,
              datefrom: draft.from!,
              dateto: draft.to!,
              er_rentalgroupid: Number(l.productId),
            })),
          })),
        });
        let sum = 0;
        const days =
          (new Date(draft.to).getTime() - new Date(draft.from).getTime()) / 86400000 + 1 || 1;
        for (const person of priced.persons || []) {
          for (const art of person.articles || []) {
            sum += art.price || 0;
            const line = draft.persons
              .find((p) => p.id === person.personid)
              ?.lines.find((_, i) => `${person.personid}-${i}` === art.lineid);
            if (!line) continue;
            for (const c of categories) {
              const p = c.products.find((x) => x.id === line.productId);
              if (p) p.displayDaily["1"] = euros((art.price || 0) / days);
            }
          }
        }
        cartTotal = euros(sum);
      }

      return {
        categories,
        rate: null,
        rates: [],
        cartTotal,
        cartList: null,
        cartDiscount: null,
      };
    } catch (e) {
      console.warn("EasyRest quote failed, fallback Rent Buddy", e);
      return rentBuddyProvider.quote(draft);
    }
  },

  async loadStock(draft) {
    if (!draft.from || !draft.to || !draft.locationId) return [];
    try {
      const groups = [
        ...new Set(
          draft.persons.flatMap((p) => p.lines.map((l) => Number(l.productId))).filter(Boolean),
        ),
      ];
      if (!groups.length) {
        // probe main ski groups
        groups.push(1, 2, 3, 6);
      }
      const res = await easyrest.getAvailCount(
        groups.map((id) => ({
          er_rentalgroupid: id,
          datefrom: draft.from,
          dateto: draft.to,
          er_branchid: Number(draft.locationId),
        })),
      );
      return (res.getavailresult || []).map((r) => ({
        id: String(r.er_rentalgroupid),
        stock: r.availcount,
      }));
    } catch (e) {
      console.warn("EasyRest stock failed", e);
      return [];
    }
  },

  async createReservation(draft: BookingDraft): Promise<CreateReservationResult> {
    const payload = toInsertPayload(draft);
    try {
      const raw = await easyrest.insertUpdateReservation(payload);
      const dry = raw && typeof raw === "object" && "dryRun" in (raw as object);
      return {
        ok: true,
        bookingId: payload.reservation.reservationextid,
        raw,
        ...(dry
          ? {}
          : {}),
      };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : "EasyRest Reservierung fehlgeschlagen",
        raw: payload,
      };
    }
  },

  toWintersteigerExport(draft, products): WintersteigerExport {
    return rentBuddyProvider.toWintersteigerExport(draft, products);
  },
};

export async function loadSiteBranding(): Promise<SiteSettings> {
  return rentBuddyProvider.loadSite();
}
