/** Offline demo catalog — used when live APIs are unreachable (e.g. GitHub Pages). */

import type {
  BookingDraft,
  BookingProvider,
  Category,
  CreateReservationResult,
  Location,
  Money,
  PriceQuote,
  Product,
  SiteSettings,
  WintersteigerExport,
} from "./types";
import { BRANCH_META, ONLINE_BRANCH_ORDER, SITE_DEFAULT, SPECIALS_DEFAULT } from "./mapping";
import { assetUrl } from "./assets";
import { enrichCategoriesWithMedia } from "./product-media";

function euros(n: number): Money {
  return { amountCents: Math.round(n * 100), currency: "EUR" };
}

const DEMO_DAILY: Record<string, number> = {
  "1": 49,
  "2": 39,
  "3": 29,
  "6": 19,
  "18": 35,
  "21": 18,
  "35": 12,
};

function demoCategories(): Category[] {
  const skiProducts: Product[] = [
    {
      id: "1",
      externalKey: "1",
      title: "Ski Platin",
      subtitle: "Demo · Top-Modelle",
      categoryId: "1",
      categoryTitle: "Ski",
      modelRequired: false,
      bullets: ["Demo-Daten (offline)", "Atomic · Stöckli · AK"],
      displayDaily: { "1": euros(49), "2": euros(39), "3": euros(29) },
      accessories: ["6"],
      models: [
        { id: "1710", title: "CLOUD Q14 RVSK S", brand: "Atomic", variants: [{ property1: "168" }] },
        { id: "1676", title: "MONTERO AX", brand: "STÖCKLI", variants: [{ property1: "170" }] },
      ],
    },
    {
      id: "2",
      externalKey: "2",
      title: "Ski Gold",
      subtitle: "Demo",
      categoryId: "1",
      categoryTitle: "Ski",
      modelRequired: false,
      bullets: ["Demo-Daten (offline)"],
      displayDaily: { "1": euros(39), "2": euros(31), "3": euros(23) },
      accessories: ["6"],
      models: [
        { id: "1634", title: "CLOUD C9 RVSK LIGHT", brand: "Atomic", variants: [{ property1: "158" }] },
      ],
    },
    {
      id: "3",
      externalKey: "3",
      title: "Ski Silber",
      subtitle: "Demo",
      categoryId: "1",
      categoryTitle: "Ski",
      modelRequired: false,
      bullets: ["Demo-Daten (offline)"],
      displayDaily: { "1": euros(29), "2": euros(23), "3": euros(17) },
      accessories: ["6"],
      models: [],
    },
  ];

  const boot: Product = {
    id: "6",
    externalKey: "6",
    title: "Skischuh",
    subtitle: "Demo",
    categoryId: "2",
    categoryTitle: "Skischuh",
    modelRequired: false,
    bullets: ["Demo-Daten (offline)"],
    displayDaily: { "1": euros(19), "2": euros(15), "3": euros(12) },
    accessories: [],
    models: [
      { id: "1706", title: "SPEEDMACHINE 3 110 R BOA", brand: "Nordica", variants: [{ property1: "27.5" }] },
    ],
  };

  const board: Product[] = [
    {
      id: "18",
      externalKey: "18",
      title: "Snowboard",
      subtitle: "Demo",
      categoryId: "3",
      categoryTitle: "Snowboard",
      modelRequired: false,
      bullets: ["Demo-Daten (offline)"],
      displayDaily: { "1": euros(35), "2": euros(28), "3": euros(22) },
      accessories: ["21"],
      models: [{ id: "1735", title: "SUPER 8 RTL", brand: "Salomon", variants: [{ property1: "155" }] }],
    },
    {
      id: "21",
      externalKey: "21",
      title: "Snowboard Boot",
      subtitle: "Demo",
      categoryId: "4",
      categoryTitle: "SB Boots",
      modelRequired: false,
      bullets: ["Demo-Daten (offline)"],
      displayDaily: { "1": euros(18), "2": euros(14), "3": euros(12) },
      accessories: [],
      models: [],
    },
  ];

  const helm: Product = {
    id: "35",
    externalKey: "35",
    title: "Skihelm",
    subtitle: "Demo",
    categoryId: "5",
    categoryTitle: "Helm",
    modelRequired: false,
    bullets: ["Unter 16 oft gratis"],
    displayDaily: { "1": euros(12), "2": euros(10), "3": euros(0) },
    accessories: [],
    models: [],
  };

  return enrichCategoriesWithMedia([
    { id: "1", title: "Ski", products: skiProducts },
    { id: "2", title: "Skischuh", products: [boot] },
    { id: "3", title: "Snowboard", products: [board[0]] },
    { id: "4", title: "SB Boots", products: [board[1]] },
    { id: "5", title: "Helm", products: [helm] },
  ]);
}

function demoLocations(): Location[] {
  return ONLINE_BRANCH_ORDER.map((id) => {
    const meta = BRANCH_META[id];
    return {
      id,
      title: meta.title,
      highlight: meta.highlight || null,
      addressHtml: meta.addressHtml,
      image: meta.image,
      closedRanges: [],
    };
  });
}

function daysInDraft(draft: BookingDraft): number {
  if (!draft.from || !draft.to) return 1;
  const ms = new Date(draft.to).getTime() - new Date(draft.from).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

function cartFromDraft(draft: BookingDraft): Money | null {
  let sum = 0;
  const days = daysInDraft(draft);
  for (const p of draft.persons) {
    for (const line of p.lines) {
      const daily = DEMO_DAILY[line.productId] ?? 25;
      sum += daily * days * (line.count || 1);
    }
  }
  return sum > 0 ? euros(sum) : null;
}

export function demoQuote(draft: BookingDraft): PriceQuote {
  if (!draft.from || !draft.to) {
    return { categories: [], rate: null, rates: [], cartTotal: null, cartList: null, cartDiscount: null };
  }
  return {
    categories: demoCategories(),
    rate: {
      id: "demo",
      title: "Demo-Tarif (offline)",
      description: "Beispielpreise — keine Live-API.",
      cancellation: "Demo — keine echte Buchung.",
    },
    rates: [],
    cartTotal: cartFromDraft(draft),
    cartList: cartFromDraft(draft),
    cartDiscount: null,
  };
}

export const demoProvider: BookingProvider = {
  id: "demo",
  label: "Rentfreudenhaus · Demo (offline)",

  async loadSite(): Promise<SiteSettings> {
    return {
      ...SITE_DEFAULT,
      logo: assetUrl("brand/logo-mark.svg"),
      logoInverted: assetUrl("brand/logo-white.svg"),
    };
  },

  async loadLocations(): Promise<Location[]> {
    return demoLocations();
  },

  async loadSpecials() {
    return SPECIALS_DEFAULT.map((s) => ({ ...s }));
  },

  async loadCalendar() {
    return [];
  },

  async quote(draft: BookingDraft): Promise<PriceQuote> {
    return demoQuote(draft);
  },

  async loadStock() {
    return [];
  },

  async createReservation(draft: BookingDraft): Promise<CreateReservationResult> {
    return {
      ok: true,
      bookingId: `DEMO-${Date.now()}`,
      raw: {
        demo: true,
        message: "Demo-Modus: keine Live-Reservierung. Payload nur lokal simuliert.",
        persons: draft.persons.length,
        from: draft.from,
        to: draft.to,
        locationId: draft.locationId,
      },
    };
  },

  toWintersteigerExport(draft, products): WintersteigerExport {
    return {
      shop: "Rentfreudenhaus Demo",
      branchId: draft.locationId,
      from: draft.from,
      to: draft.to,
      pickupDayBefore: draft.pickupDayBefore,
      guests: draft.persons.map((p) => ({
        type: p.kind,
        firstName: p.firstName,
        lastName: p.lastName,
        age: p.age,
        email: p.email,
        phone: p.phone,
        height: p.height,
        weight: p.weight,
        shoeSize: p.shoeSize,
        insurance: p.coverage,
        items: p.lines.map((l) => ({
          rentalGroup: products.find((x) => x.id === l.productId)?.title || l.title,
          model: l.modelTitle,
          size: l.property1,
          qty: l.count,
        })),
      })),
      remark: draft.remark,
      discountCode: draft.discountCode,
    };
  },
};
