import type { Product } from "../api";
import { formatMoney } from "./money";

export type PackageTier = "platin" | "gold" | "silber" | "snowboard";

export type RentalPackage = {
  id: PackageTier;
  title: string;
  subtitle: string;
  skiProductId: string; // Easyrent rentalGroupId
  bootProductId: string;
  helmProductId: string;
  highlight?: string;
};

/** Default online packages (Ski/Board + Schuh + Helm). */
export const PACKAGES: RentalPackage[] = [
  {
    id: "platin",
    title: "Paket Platin",
    subtitle: "Top-Ski · Schuh · Helm",
    skiProductId: "1",
    bootProductId: "6",
    helmProductId: "35",
    highlight: "Bestseller",
  },
  {
    id: "gold",
    title: "Paket Gold",
    subtitle: "Allround-Ski · Schuh · Helm",
    skiProductId: "2",
    bootProductId: "6",
    helmProductId: "35",
  },
  {
    id: "silber",
    title: "Paket Silber",
    subtitle: "Einstieg · Schuh · Helm",
    skiProductId: "3",
    bootProductId: "6",
    helmProductId: "35",
  },
  {
    id: "snowboard",
    title: "Paket Snowboard",
    subtitle: "Board · Boot · Helm",
    skiProductId: "18",
    bootProductId: "21",
    helmProductId: "35",
  },
];

const PACKAGE_PRODUCT_IDS = new Set(
  PACKAGES.flatMap((p) => [p.skiProductId, p.bootProductId, p.helmProductId]),
);

export function isPackageProductId(id: string) {
  return PACKAGE_PRODUCT_IDS.has(id);
}

export function findPackageForLines(productIds: string[]): RentalPackage | null {
  for (const pack of PACKAGES) {
    if (
      productIds.includes(pack.skiProductId) &&
      productIds.includes(pack.bootProductId) &&
      productIds.includes(pack.helmProductId)
    ) {
      return pack;
    }
  }
  return null;
}

export function packageDailyLabel(
  pack: RentalPackage,
  products: Product[],
  kindCode: string,
): string {
  const ids = [pack.skiProductId, pack.bootProductId, pack.helmProductId];
  let cents = 0;
  let currency = "EUR";
  let ok = 0;
  for (const id of ids) {
    const p = products.find((x) => x.id === id);
    const m = p?.displayDaily[kindCode] || p?.displayDaily["1"];
    if (m) {
      cents += m.amountCents;
      currency = m.currency;
      ok += 1;
    }
  }
  if (!ok) return "Preis folgt";
  return `ab ${formatMoney({ amountCents: cents, currency })} / Tag`;
}
