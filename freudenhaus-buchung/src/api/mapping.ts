/** Festes Shop-Mapping Obertauern → Easyrent + Anzeige-Assets (FH-CI). */

export const BRANCH_META: Record<
  string,
  { title: string; rentBuddyId: number; highlight?: string; image?: string; addressHtml?: string }
> = {
  "1": {
    title: "Hauptfiliale",
    rentBuddyId: 1,
    highlight: "Test & Buy",
    image:
      "https://freudenhaus.rentbuddy.solutions/media/cache/square800/images/locations/standort-fh-hauptfiliale-64f1eab481573185168276.jpg",
    addressHtml: "<p>Ringstraße 74</p><p>5562 Obertauern</p>",
  },
  "6": {
    title: "RENT EDELWEISS",
    rentBuddyId: 2,
    image:
      "https://freudenhaus.rentbuddy.solutions/media/cache/square800/images/locations/standort-fh-edelweiss-64f1e4a675927472273175.jpg",
    addressHtml: "<p>Römerstraße 75</p><p>5562 Obertauern</p>",
  },
  "4": {
    title: "RENT Schaidberg",
    rentBuddyId: 3,
    image:
      "https://freudenhaus.rentbuddy.solutions/media/cache/square800/images/locations/standort-fh-schaidberg-64f1e46518db6021059398.jpg",
    addressHtml: "<p>Alpenstraße 1A</p><p>5562 Obertauern</p>",
  },
  "9": {
    title: "RENT Kohlmayr",
    rentBuddyId: 4,
    image:
      "https://freudenhaus.rentbuddy.solutions/media/cache/square800/images/locations/standort-fh-kohlmayr-64f1e45970313541835674.jpg",
    addressHtml: "<p>Ringstraße 5</p><p>5562 Obertauern</p>",
  },
  "10": {
    title: "RENT VALAMAR PLACES",
    rentBuddyId: 5,
    image:
      "https://freudenhaus.rentbuddy.solutions/media/cache/square800/images/locations/standort-fh-marietta-64f1e49c7d1a3589671256.jpg",
    addressHtml: "<p>Ringstraße 8</p><p>5562 Obertauern</p>",
  },
};

export const ONLINE_BRANCH_ORDER = ["1", "6", "4", "9", "10"];

export const SITE_DEFAULT = {
  name: "Rentfreudenhaus",
  shopName: "FREUDENHAUS RENT",
  logo: "/brand/logo-mark.svg",
  logoInverted: "/brand/logo-white.svg",
  bgImage: "https://www.skirent-obertauern.at/img/hero-video-poster.jpg",
  youthAge: 11,
  adultAge: 17,
  maxPersons: 20,
  pickupTime: "15:00",
  coverageDefault: true,
  colors: {
    font: "#0a0a0a",
    button: "#0a0a0a",
    highlight: "#e6007e",
  },
  paymentBrands: ["MASTER", "VISA", "PAYPAL", "AMEX", "APPLEPAY"],
  seasonStart: "2026-11-20",
  seasonEnd: "2027-04-14",
};

export const SPECIALS_DEFAULT = [
  {
    id: "1",
    type: 1,
    title: "Versicherung",
    textHtml:
      "Schutz gegen Diebstahl & Bruch. Kein Selbstbehalt mit Versicherung. Mutwillige Beschädigung ausgenommen.",
  },
  {
    id: "2",
    type: 0,
    title: "Test & Buy",
    textHtml:
      "Beim Kauf von Ski werden dir maximal zwei Tage der Leihgebühr gutgeschrieben.",
  },
];
