import type { BookingProvider } from "./types";
import { demoProvider } from "./demo";
import { rentBuddyProvider } from "./rentbuddy";
import { wintersteigerProvider } from "./wintersteiger";

const mode = (import.meta.env.VITE_BOOKING_PROVIDER || "easyrent").toLowerCase();

export const provider: BookingProvider =
  mode === "demo"
    ? demoProvider
    : mode === "rentbuddy"
      ? rentBuddyProvider
      : wintersteigerProvider;

export * from "./types";
export { demoProvider, demoQuote } from "./demo";
