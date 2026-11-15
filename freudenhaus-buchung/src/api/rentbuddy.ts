import type {
  BookingDraft,
  BookingPerson,
  BookingProvider,
  CalendarRate,
  Category,
  CreateReservationResult,
  Location,
  Money,
  PersonKind,
  PriceQuote,
  Product,
  SiteSettings,
  Special,
  WintersteigerExport,
} from "./types";

const HOST = "https://freudenhaus.rentbuddy.solutions";
const LANG = "de";

function money(raw?: { amount?: string | number; currency?: string } | null): Money | null {
  if (!raw || raw.amount == null) return null;
  return {
    amountCents: Math.round(Number(raw.amount)),
    currency: raw.currency || "EUR",
  };
}

function kindToRbType(kind: PersonKind): number {
  if (kind === "youth") return 2;
  if (kind === "kid") return 3;
  return 1;
}

function personPayload(p: BookingPerson) {
  return {
    id: p.id,
    mainperson: false,
    type: kindToRbType(p.kind),
    label: "",
    firstname: p.firstName || "",
    lastname: p.lastName || "",
    country: "",
    address: "",
    zip: "",
    city: "",
    email: p.email || "",
    phone: p.phone || "",
    age: p.age ?? undefined,
    birthday: p.birthday || undefined,
    weight: p.weight ?? undefined,
    height: p.height ?? undefined,
    shoesize: p.shoeSize ?? undefined,
    skills: p.skills ?? undefined,
    coverage: p.coverage,
    products: p.lines.map((l) => ({
      id: Number(l.productId),
      count: l.count,
      modelId: l.modelId ? Number(l.modelId) : undefined,
      property1: l.property1,
    })),
  };
}

function bookingBody(draft: BookingDraft) {
  const persons = draft.persons.map(personPayload);
  if (persons[0]) persons[0].mainperson = true;
  const body: Record<string, unknown> = {
    language: LANG,
    date: {
      from: draft.from || undefined,
      to: draft.to || undefined,
    },
    location: draft.locationId ? Number(draft.locationId) : undefined,
    persons,
    remark: draft.remark || "",
    newsletter: draft.newsletter,
    termsAccepted: draft.termsAccepted,
    createUser: false,
    pickupDayBefore: draft.pickupDayBefore,
    wl: "",
    specials: draft.specialIds.map(Number),
    dc: draft.discountCode || "",
    tz: "Europe/Vienna",
  };
  if (draft.accommodationId) body.accommodation = Number(draft.accommodationId);
  return body;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${HOST}/${LANG}${path}`);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown, baseUrl = `${HOST}/${LANG}`): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} → ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

function mapProduct(raw: any, categoryId: string, categoryTitle: string): Product {
  const displayDaily: Product["displayDaily"] = {};
  const dp = raw.displayPrices || {};
  for (const [k, v] of Object.entries(dp) as [string, any][]) {
    const m = money(v?.daily);
    if (m) displayDaily[k] = m;
  }
  return {
    id: String(raw.id),
    externalKey: String(raw.id),
    title: raw.title,
    subtitle: raw.subtitle || "",
    categoryId,
    categoryTitle,
    image: raw.image,
    highlight: raw.highlight,
    modelRequired: !!raw.modelRequired,
    bullets: (raw.pcList || []).map((row: any) => (Array.isArray(row) ? row[1] : row)).filter(Boolean),
    displayDaily,
    accessories: (raw.accesories || raw.accessories || []).map((a: any) => String(a.id)),
    models: (raw.models || []).map((m: any) => ({
      id: String(m.id),
      title: m.title,
      subtitle: m.subtitle,
      brand: m.brand,
      image: m.image,
      variants: (m.variants || []).map((v: any) => ({
        property1: String(v.property1),
        stock: v.stock,
        disabled: v.disabled,
      })),
    })),
    stock: raw.stock,
  };
}

export const rentBuddyProvider: BookingProvider = {
  id: "rentbuddy",
  label: "Rent Buddy (Übergangs-API)",

  async loadSite() {
    const data = await getJson<{ settings: any; seasons?: any[] }>(`/api/site`);
    const s = data.settings;
    const seasons = data.seasons || [];
    const active = seasons.find((x: any) => x.active) || seasons[seasons.length - 1];
    return {
      name: s.name,
      shopName: s.shopname || s.name,
      logo: s.logo?.startsWith("http") ? s.logo : `${HOST}${s.logo}`,
      logoInverted: s.logoInverted?.startsWith("http")
        ? s.logoInverted
        : `${HOST}${s.logoInverted || s.logo}`,
      bgImage: s.bgImage,
      youthAge: s.youthAge ?? 11,
      adultAge: s.adultAge ?? 17,
      maxPersons: s.maxPersons ?? 20,
      pickupTime: s.pickuptime || "15:00",
      coverageDefault: !!s.coveragePerDefault,
      colors: {
        font: s.colorFont || "#4D4D4D",
        button: s.colorButton || "#4D4D4D",
        highlight: s.colorHighlight || "#93BAA2",
      },
      paymentBrands: s.paymentBrands || [],
      seasonStart: active?.from || active?.starting,
      seasonEnd: active?.to || active?.ending,
    } satisfies SiteSettings;
  },

  async loadLocations() {
    const data = await getJson<{ locations: any[] }>(`/api/locations`);
    return data.locations.map(
      (L): Location => ({
        id: String(L.id),
        externalKey: String(L.id),
        title: L.title,
        highlight: L.highlight,
        addressHtml: L.details || L.text,
        lat: L.position?.lat ?? Number(L.lat),
        lng: L.position?.lng ?? Number(L.lng),
        image: L.image,
        closedRanges: (L.closed || []).map((c: any) => ({
          start: c.start,
          end: c.end,
        })),
        businessHours: L.businesshours,
      }),
    );
  },

  async loadSpecials() {
    const data = await getJson<{ specials: any[] }>(`/api/specials`);
    return data.specials.map(
      (s): Special => ({
        id: String(s.id),
        type: s.type,
        title: s.title,
        textHtml: s.text,
      }),
    );
  },

  async loadCalendar(draft) {
    if (!draft.from || !draft.to) return [];
    const data = await postJson<{ rates: any[] }>(`/api/calendar`, bookingBody(draft));
    return (data.rates || []).map(
      (r): CalendarRate => ({
        starting: r.starting,
        ending: r.ending ?? null,
        percent: r.percent,
      }),
    );
  },

  async quote(draft) {
    if (!draft.from || !draft.to) {
      return { categories: [], rate: null, rates: [], cartTotal: null, cartList: null, cartDiscount: null };
    }
    const data = await postJson<any>(`/api/prices`, bookingBody(draft));
    const categories: Category[] = (data.categories || []).map((c: any) => ({
      id: String(c.id),
      title: c.title,
      products: (c.products || []).map((p: any) => mapProduct(p, String(c.id), c.title)),
    }));
    return {
      categories,
      rate: data.rate
        ? {
            id: String(data.rate),
            title: (data.rates || []).find((r: any) => r.id === data.rate)?.title || "",
            description: (data.rates || []).find((r: any) => r.id === data.rate)?.description,
            cancellation: (data.rates || []).find((r: any) => r.id === data.rate)?.cancellation,
          }
        : data.rates?.[0]
          ? {
              id: String(data.rates[0].id),
              title: data.rates[0].title,
              description: data.rates[0].description,
              cancellation: data.rates[0].cancellation,
            }
          : null,
      rates: (data.rates || []).map((r: any) => ({
        id: String(r.id),
        title: r.title,
        description: r.description,
        cancellation: r.cancellation,
      })),
      cartTotal: money(data.cart?.price),
      cartList: money(data.cart?.listprice),
      cartDiscount: money(data.cart?.discount),
      errorCode: data.errorcode,
    } satisfies PriceQuote;
  },

  async loadStock(draft) {
    if (!draft.from || !draft.to || !draft.locationId) return [];
    const data = await postJson<{ stock: any[] }>(
      `/api/stock`,
      {
        date: { from: draft.from, to: draft.to },
        location: Number(draft.locationId),
        pickupDayBefore: draft.pickupDayBefore,
      },
      HOST,
    );
    return (data.stock || []).map((s: any) => ({
      id: String(s.id),
      stock: s.stock,
      models: (s.models || []).map((m: any) => ({
        id: String(m.id),
        property1: String(m.property1),
        stock: m.stock,
      })),
    }));
  },

  async createReservation(draft): Promise<CreateReservationResult> {
    try {
      const data = await postJson<any>(`/api/reservation`, bookingBody(draft), HOST);
      if (data.error) {
        return { ok: false, message: String(data.error), raw: data };
      }
      return {
        ok: true,
        bookingId: String(data.bookingId || data.id || data.reservationId || ""),
        paymentUrl: data.paymentUrl || data.redirect || undefined,
        raw: data,
      };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Reservierung fehlgeschlagen" };
    }
  },

  toWintersteigerExport(draft, products) {
    const byId = new Map(products.map((p) => [p.id, p]));
    return {
      shop: "FREUDENHAUS",
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
        items: p.lines.map((l) => {
          const prod = byId.get(l.productId);
          const model = prod?.models.find((m) => m.id === l.modelId);
          return {
            rentalGroup: prod?.title || l.title,
            model: model?.title || l.modelTitle,
            size: l.property1,
            qty: l.count,
          };
        }),
      })),
      remark: draft.remark,
      discountCode: draft.discountCode,
    } satisfies WintersteigerExport;
  },
};
