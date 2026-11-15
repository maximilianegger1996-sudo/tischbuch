/** Filial-Metadaten für smarte Abholort-UI */

export type BranchInfo = {
  id: string;
  title: string;
  short: string;
  highlight?: string;
  image?: string;
  address: string;
  phone?: string;
  hours: string;
  opensFrom?: string;
};

export const BRANCHES: BranchInfo[] = [
  {
    id: "1",
    title: "Hauptfiliale",
    short: "Ringstraße 74",
    highlight: "Test & Buy",
    image:
      "https://freudenhaus.rentbuddy.solutions/media/cache/square800/images/locations/standort-fh-hauptfiliale-64f1eab481573185168276.jpg",
    address: "Ringstraße 74 · 5562 Obertauern",
    phone: "+43 6456 72009-12",
    hours: "So–Do 08:30–18:00 · Fr–Sa bis 18:30",
    opensFrom: "ab 20. Nov 2026",
  },
  {
    id: "6",
    title: "Edelweiss",
    short: "Römerstraße 75",
    image:
      "https://freudenhaus.rentbuddy.solutions/media/cache/square800/images/locations/standort-fh-edelweiss-64f1e4a675927472273175.jpg",
    address: "Römerstraße 75 · 5562 Obertauern",
    phone: "+43 6456 72009-43",
    hours: "So–Do 08:30–12:30 & 13:15–17:00",
    opensFrom: "ab 26. Nov 2026",
  },
  {
    id: "4",
    title: "Schaidberg",
    short: "Alpenstraße 1a",
    image:
      "https://freudenhaus.rentbuddy.solutions/media/cache/square800/images/locations/standort-fh-schaidberg-64f1e46518db6021059398.jpg",
    address: "Alpenstraße 1a · 5562 Obertauern",
    phone: "+43 6456 72009-25",
    hours: "Mo–Mi bis 16:30 · Do–So bis 17:00",
    opensFrom: "ab 20. Nov 2026",
  },
  {
    id: "9",
    title: "Kohlmayr",
    short: "Ringstraße 5",
    image:
      "https://freudenhaus.rentbuddy.solutions/media/cache/square800/images/locations/standort-fh-kohlmayr-64f1e45970313541835674.jpg",
    address: "Ringstraße 5 · 5562 Obertauern",
    phone: "+43 6456 72009-41",
    hours: "täglich 08:30–12:00 & 13:00–17:30",
    opensFrom: "ab 20. Nov 2026",
  },
  {
    id: "10",
    title: "Valamar Places",
    short: "Ringstraße 8",
    image:
      "https://freudenhaus.rentbuddy.solutions/media/cache/square800/images/locations/standort-fh-marietta-64f1e49c7d1a3589671256.jpg",
    address: "Ringstraße 8 · 5562 Obertauern",
    phone: "+43 6456 72009-42",
    hours: "täglich 08:30–12:30 & 13:15–17:30",
    opensFrom: "ab 26. Nov 2026",
  },
];
