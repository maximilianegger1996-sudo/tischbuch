import type {
  BookingDraft,
  BookingProvider,
  CreateReservationResult,
  PriceQuote,
  Product,
  SiteSettings,
  WintersteigerExport,
} from "./types";
import { rentBuddyProvider } from "./rentbuddy";

/**
 * Wintersteiger Easyrent / Easyreservation provider.
 * Until the shop is cut over, catalog & quotes still read from Rent Buddy
 * so the new UI can be built and tested. createReservation is prepared
 * for Easyreservation import instead of Oppwa/Rent Buddy payment.
 */
export const wintersteigerProvider: BookingProvider = {
  id: "wintersteiger",
  label: "Wintersteiger Easyrent (Ziel-System)",

  loadSite: () => rentBuddyProvider.loadSite(),
  loadLocations: () => rentBuddyProvider.loadLocations(),
  loadSpecials: () => rentBuddyProvider.loadSpecials(),
  loadCalendar: (d) => rentBuddyProvider.loadCalendar(d),
  quote: (d) => rentBuddyProvider.quote(d),
  loadStock: (d) => rentBuddyProvider.loadStock(d),

  async createReservation(draft: BookingDraft): Promise<CreateReservationResult> {
    const quote: PriceQuote = await rentBuddyProvider.quote(draft);
    const products: Product[] = quote.categories.flatMap((c) => c.products);
    const payload = rentBuddyProvider.toWintersteigerExport(draft, products);

    // Placeholder until Easyreservation endpoint / credentials are wired.
    // Export is stored client-side for handoff / QA during migration.
    try {
      localStorage.setItem(
        "fh.wintersteiger.export",
        JSON.stringify({ at: new Date().toISOString(), payload }),
      );
    } catch {
      /* ignore */
    }

    return {
      ok: true,
      bookingId: `WS-EXPORT-${Date.now()}`,
      raw: {
        mode: "wintersteiger-export",
        message:
          "Reservierung als Wintersteiger-Export vorbereitet (noch kein Live-Import). Katalog weiterhin aus Rent Buddy.",
        payload,
      },
    };
  },

  toWintersteigerExport(draft, products): WintersteigerExport {
    return rentBuddyProvider.toWintersteigerExport(draft, products);
  },
};

export async function loadSiteBranding(): Promise<SiteSettings> {
  return rentBuddyProvider.loadSite();
}
