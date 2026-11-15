import type { BookingProvider } from "./types";
import { rentBuddyProvider } from "./rentbuddy";
import { wintersteigerProvider } from "./wintersteiger";
import { demoProvider } from "./demo";

const mode = (import.meta.env.VITE_BOOKING_PROVIDER || "easyrent").toLowerCase();

export const provider: BookingProvider =
  mode === "rentbuddy"
    ? rentBuddyProvider
    : mode === "demo"
      ? demoProvider
      : wintersteigerProvider;

export * from "./types";
