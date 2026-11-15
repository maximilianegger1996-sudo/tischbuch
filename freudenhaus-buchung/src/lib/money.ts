import type { Money } from "../api/types";

export function formatMoney(m: Money | null | undefined): string {
  if (!m) return "–";
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: m.currency || "EUR",
  }).format(m.amountCents / 100);
}
