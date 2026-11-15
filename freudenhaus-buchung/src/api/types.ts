/** Domain model aligned to Easyrent concepts for the cutover. */

export type PersonKind = "adult" | "youth" | "kid";

export type Money = {
  amountCents: number;
  currency: string;
};

export type Location = {
  id: string;
  /** Easyrent Filiale */
  externalKey?: string;
  title: string;
  highlight?: string | null;
  addressHtml?: string;
  lat?: number;
  lng?: number;
  image?: string;
  closedRanges: { start: string; end: string }[];
  businessHours?: unknown;
};

export type ProductVariant = {
  property1: string;
  stock?: number;
  disabled?: boolean;
};

export type ProductModel = {
  id: string;
  title: string;
  subtitle?: string;
  brand?: string;
  image?: string;
  variants: ProductVariant[];
};

export type Product = {
  id: string;
  /** Easyrent Verleihgruppe / Geräteart mapping key */
  externalKey?: string;
  title: string;
  subtitle?: string;
  categoryId: string;
  categoryTitle: string;
  image?: string;
  highlight?: string | null;
  modelRequired: boolean;
  bullets: string[];
  /** daily display prices by person kind code 1=adult 2=youth 3=kid */
  displayDaily: Record<string, Money>;
  accessories: string[];
  models: ProductModel[];
  stock?: number;
};

export type Category = {
  id: string;
  title: string;
  products: Product[];
};

export type Special = {
  id: string;
  type: number;
  title: string;
  textHtml: string;
  active?: boolean;
};

export type Rate = {
  id: string;
  title: string;
  description?: string;
  cancellation?: string;
};

export type CartLine = {
  productId: string;
  modelId?: string;
  property1?: string;
  count: number;
  title: string;
  modelTitle?: string;
  modelImage?: string;
};

export type BookingPerson = {
  id: string;
  kind: PersonKind;
  /** Rent Buddy type: 1 adult, 2 youth?, 3 kid — mapped in adapter */
  age?: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  height?: number;
  weight?: number;
  shoeSize?: number;
  skills?: number;
  birthday?: string;
  coverage: boolean;
  lines: CartLine[];
};

export type BookingDraft = {
  from: string | null;
  to: string | null;
  locationId: string | null;
  pickupDayBefore: boolean;
  persons: BookingPerson[];
  specialIds: string[];
  discountCode: string;
  accommodationId: string | null;
  remark: string;
  newsletter: boolean;
  termsAccepted: boolean;
};

export type PriceQuote = {
  categories: Category[];
  rate: Rate | null;
  rates: Rate[];
  cartTotal: Money | null;
  cartList: Money | null;
  cartDiscount: Money | null;
  errorCode?: string | number | null;
};

export type CalendarRate = {
  starting: string;
  ending: string | null;
  percent: number;
};

export type SiteSettings = {
  name: string;
  shopName: string;
  logo: string;
  logoInverted: string;
  bgImage: string;
  youthAge: number;
  adultAge: number;
  maxPersons: number;
  pickupTime: string;
  coverageDefault: boolean;
  colors: {
    font: string;
    button: string;
    highlight: string;
  };
  paymentBrands: string[];
  seasonStart?: string;
  seasonEnd?: string;
};

export type CreateReservationResult =
  | { ok: true; bookingId: string; paymentUrl?: string; raw?: unknown }
  | { ok: false; message: string; raw?: unknown };

/** Payload shape prepared for Wintersteiger Easyreservation import. */
export type WintersteigerExport = {
  shop: string;
  branchId: string | null;
  from: string | null;
  to: string | null;
  pickupDayBefore: boolean;
  guests: Array<{
    type: PersonKind;
    firstName: string;
    lastName: string;
    age?: number;
    email?: string;
    phone?: string;
    height?: number;
    weight?: number;
    shoeSize?: number;
    insurance: boolean;
    items: Array<{
      rentalGroup: string;
      model?: string;
      size?: string;
      qty: number;
    }>;
  }>;
  remark: string;
  discountCode: string;
};

export interface BookingProvider {
  readonly id: "rentbuddy" | "wintersteiger";
  readonly label: string;
  loadSite(): Promise<SiteSettings>;
  loadLocations(): Promise<Location[]>;
  loadSpecials(): Promise<Special[]>;
  loadCalendar(draft: BookingDraft): Promise<CalendarRate[]>;
  quote(draft: BookingDraft): Promise<PriceQuote>;
  loadStock(
    draft: BookingDraft,
  ): Promise<Array<{ id: string; stock: number; models?: Array<{ id: string; property1: string; stock: number }> }>>;
  createReservation(draft: BookingDraft): Promise<CreateReservationResult>;
  toWintersteigerExport(draft: BookingDraft, products: Product[]): WintersteigerExport;
}
