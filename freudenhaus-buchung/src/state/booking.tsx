import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { provider, type BookingDraft, type BookingPerson, type Category, type Location, type PersonKind, type PriceQuote, type Product, type SiteSettings, type Special } from "../api";
import { uid } from "../lib/id";
import { isPackageProductId, type RentalPackage } from "../lib/packages";

export type StepId =
  | "people"
  | "dates"
  | "location"
  | "products"
  | "details"
  | "review";

const STEPS: StepId[] = ["people", "dates", "location", "products", "details", "review"];

function emptyPerson(kind: PersonKind, coverage: boolean): BookingPerson {
  return {
    id: uid(),
    kind,
    firstName: "",
    lastName: "",
    coverage,
    lines: [],
  };
}

type Ctx = {
  step: StepId;
  steps: StepId[];
  setStep: (s: StepId) => void;
  next: () => void;
  back: () => void;
  site: SiteSettings | null;
  locations: Location[];
  specials: Special[];
  quote: PriceQuote | null;
  quoteLoading: boolean;
  draft: BookingDraft;
  products: Product[];
  setAdults: (n: number) => void;
  setKids: (ages: number[]) => void;
  setDates: (from: string | null, to: string | null) => void;
  setLocation: (id: string) => void;
  setPickupDayBefore: (v: boolean) => void;
  toggleProduct: (personId: string, product: Product) => void;
  setModel: (
    personId: string,
    productId: string,
    modelId: string,
    property1: string,
    modelTitle: string,
    modelImage?: string,
  ) => void;
  clearModel: (personId: string, productId: string) => void;
  applyPackage: (personId: string, pack: RentalPackage, products: Product[]) => void;
  clearPackage: (personId: string) => void;
  updatePerson: (personId: string, patch: Partial<BookingPerson>) => void;
  resetBooking: () => void;
  setRemark: (v: string) => void;
  setDiscount: (v: string) => void;
  setTerms: (v: boolean) => void;
  setNewsletter: (v: boolean) => void;
  refreshQuote: () => Promise<void>;
  submit: () => Promise<{ ok: boolean; message: string; bookingId?: string; raw?: unknown }>;
  submitting: boolean;
  providerLabel: string;
};

const BookingContext = createContext<Ctx | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<StepId>("people");
  const [site, setSite] = useState<SiteSettings | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [specials, setSpecials] = useState<Special[]>([]);
  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState<BookingDraft>({
    from: null,
    to: null,
    locationId: null,
    pickupDayBefore: false,
    persons: [emptyPerson("adult", true), emptyPerson("adult", true)],
    specialIds: [],
    discountCode: "",
    accommodationId: null,
    remark: "",
    newsletter: false,
    termsAccepted: false,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      const [sRes, locRes, specRes] = await Promise.allSettled([
        provider.loadSite(),
        provider.loadLocations(),
        provider.loadSpecials(),
      ]);
      if (!alive) return;
      const s = sRes.status === "fulfilled" ? sRes.value : null;
      const locs = locRes.status === "fulfilled" ? locRes.value : [];
      const specs = specRes.status === "fulfilled" ? specRes.value : [];
      if (sRes.status === "rejected") console.error(sRes.reason);
      if (locRes.status === "rejected") console.error(locRes.reason);
      if (specRes.status === "rejected") console.error(specRes.reason);
      if (s) setSite(s);
      setLocations(locs);
      setSpecials(specs);
      const coverage = s?.coverageDefault ?? true;
      setDraft((d) => ({
        ...d,
        persons: d.persons.map((p) => ({ ...p, coverage })),
        specialIds: coverage ? specs.filter((x) => x.type === 1).map((x) => x.id) : [],
      }));
    })().catch(console.error);
    return () => {
      alive = false;
    };
  }, []);

  const refreshQuote = useCallback(async () => {
    if (!draft.from || !draft.to) {
      setQuote(null);
      return;
    }
    setQuoteLoading(true);
    try {
      const q = await provider.quote(draft);
      setQuote(q);
      if (draft.locationId) {
        const stock = await provider.loadStock(draft);
        const stockMap = new Map(stock.map((s) => [s.id, s]));
        q.categories = q.categories.map((c) => ({
          ...c,
          products: c.products.map((p) => {
            const st = stockMap.get(p.id);
            if (!st) return p;
            return {
              ...p,
              stock: st.stock,
              models: p.models.map((m) => ({
                ...m,
                variants: m.variants.map((v) => {
                  const row = st.models?.find(
                    (x) => x.id === m.id && x.property1 === v.property1,
                  );
                  return {
                    ...v,
                    stock: row?.stock,
                    disabled: row ? row.stock <= 0 : v.disabled,
                  };
                }),
              })),
            };
          }),
        }));
        setQuote({ ...q });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setQuoteLoading(false);
    }
  }, [draft]);

  useEffect(() => {
    const t = setTimeout(() => {
      void refreshQuote();
    }, 250);
    return () => clearTimeout(t);
  }, [refreshQuote]);

  const products = useMemo(
    () => (quote?.categories || []).flatMap((c: Category) => c.products),
    [quote],
  );

  const setAdults = (n: number) => {
    setDraft((d) => {
      const kids = d.persons.filter((p) => p.kind !== "adult");
      const adults = d.persons.filter((p) => p.kind === "adult");
      const coverage = site?.coverageDefault ?? true;
      const nextAdults = [...adults];
      while (nextAdults.length < n) nextAdults.push(emptyPerson("adult", coverage));
      while (nextAdults.length > n) nextAdults.pop();
      return { ...d, persons: [...nextAdults, ...kids] };
    });
  };

  const setKids = (ages: number[]) => {
    setDraft((d) => {
      const adults = d.persons.filter((p) => p.kind === "adult");
      const coverage = site?.coverageDefault ?? true;
      const youthAge = site?.youthAge ?? 11;
      const kids = ages.map((age, i) => {
        const prev = d.persons.filter((p) => p.kind !== "adult")[i];
        const kind: PersonKind = age > youthAge ? "youth" : "kid";
        return prev
          ? { ...prev, age, kind }
          : { ...emptyPerson(kind, coverage), age };
      });
      return { ...d, persons: [...adults, ...kids] };
    });
  };

  const setDates = (from: string | null, to: string | null) =>
    setDraft((d) => ({ ...d, from, to }));

  const setLocation = (id: string) => setDraft((d) => ({ ...d, locationId: id }));

  const setPickupDayBefore = (v: boolean) =>
    setDraft((d) => ({ ...d, pickupDayBefore: v }));

  const toggleProduct = (personId: string, product: Product) => {
    setDraft((d) => ({
      ...d,
      persons: d.persons.map((p) => {
        if (p.id !== personId) return p;
        const exists = p.lines.find((l) => l.productId === product.id);
        if (exists) {
          return { ...p, lines: p.lines.filter((l) => l.productId !== product.id) };
        }
        return {
          ...p,
          lines: [
            ...p.lines,
            {
              productId: product.id,
              count: 1,
              title: product.title,
            },
          ],
        };
      }),
    }));
  };

  const setModel = (
    personId: string,
    productId: string,
    modelId: string,
    property1: string,
    modelTitle: string,
    modelImage?: string,
  ) => {
    setDraft((d) => ({
      ...d,
      persons: d.persons.map((p) => {
        if (p.id !== personId) return p;
        return {
          ...p,
          lines: p.lines.map((l) =>
            l.productId === productId
              ? { ...l, modelId, property1, modelTitle, modelImage }
              : l,
          ),
        };
      }),
    }));
  };

  const clearModel = (personId: string, productId: string) => {
    setDraft((d) => ({
      ...d,
      persons: d.persons.map((p) => {
        if (p.id !== personId) return p;
        return {
          ...p,
          lines: p.lines.map((l) =>
            l.productId === productId
              ? {
                  productId: l.productId,
                  count: l.count,
                  title: l.title,
                }
              : l,
          ),
        };
      }),
    }));
  };

  const applyPackage = (personId: string, pack: RentalPackage, catalog: Product[]) => {
    const ids = [pack.skiProductId, pack.bootProductId, pack.helmProductId];
    setDraft((d) => ({
      ...d,
      persons: d.persons.map((p) => {
        if (p.id !== personId) return p;
        const keep = p.lines.filter((l) => !isPackageProductId(l.productId));
        const packLines = ids.map((id) => {
          const prod = catalog.find((x) => x.id === id);
          return {
            productId: id,
            count: 1,
            title: prod?.title || id,
          };
        });
        return { ...p, lines: [...keep, ...packLines] };
      }),
    }));
  };

  const clearPackage = (personId: string) => {
    setDraft((d) => ({
      ...d,
      persons: d.persons.map((p) =>
        p.id === personId
          ? { ...p, lines: p.lines.filter((l) => !isPackageProductId(l.productId)) }
          : p,
      ),
    }));
  };

  const resetBooking = () => {
    const coverage = site?.coverageDefault ?? true;
    setDraft({
      from: null,
      to: null,
      locationId: null,
      pickupDayBefore: false,
      persons: [emptyPerson("adult", coverage), emptyPerson("adult", coverage)],
      specialIds: coverage ? specials.filter((s) => s.type === 1).map((s) => s.id) : [],
      discountCode: "",
      accommodationId: null,
      remark: "",
      newsletter: false,
      termsAccepted: false,
    });
    setStep("people");
  };

  const updatePerson = (personId: string, patch: Partial<BookingPerson>) => {
    setDraft((d) => ({
      ...d,
      persons: d.persons.map((p) => (p.id === personId ? { ...p, ...patch } : p)),
      specialIds:
        patch.coverage !== undefined
          ? patch.coverage
            ? Array.from(
                new Set([
                  ...d.specialIds,
                  ...specials.filter((s) => s.type === 1).map((s) => s.id),
                ]),
              )
            : d.specialIds.filter(
                (id) => !specials.find((s) => s.id === id && s.type === 1),
              )
          : d.specialIds,
    }));
  };

  const next = () => {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]);
  };
  const back = () => {
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await provider.createReservation(draft);
      if (!res.ok) return { ok: false, message: res.message, raw: res.raw };
      return {
        ok: true,
        message: "Reservierung vorbereitet",
        bookingId: res.bookingId,
        raw: res.raw,
      };
    } finally {
      setSubmitting(false);
    }
  };

  const value: Ctx = {
    step,
    steps: STEPS,
    setStep,
    next,
    back,
    site,
    locations,
    specials,
    quote,
    quoteLoading,
    draft,
    products,
    setAdults,
    setKids,
    setDates,
    setLocation,
    setPickupDayBefore,
    toggleProduct,
    setModel,
    clearModel,
    applyPackage,
    clearPackage,
    updatePerson,
    resetBooking,
    setRemark: (v) => setDraft((d) => ({ ...d, remark: v })),
    setDiscount: (v) => setDraft((d) => ({ ...d, discountCode: v })),
    setTerms: (v) => setDraft((d) => ({ ...d, termsAccepted: v })),
    setNewsletter: (v) => setDraft((d) => ({ ...d, newsletter: v })),
    refreshQuote,
    submit,
    submitting,
    providerLabel: provider.label,
  };

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking outside provider");
  return ctx;
}
