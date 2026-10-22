export const SORT_OPTIONS = {
  recent: "Plus récentes",
  "price-asc": "Prix croissant",
  "price-desc": "Prix décroissant",
  "surface-desc": "Surface décroissante",
  "price-per-m2-asc": "Prix au m² croissant",
} as const;

export const PERIOD_OPTIONS = {
  all: "Toutes",
  "7d": "7 derniers jours",
  "30d": "30 derniers jours",
} as const;

// Value of the "search" filter for listings linked to no search; "_" can't appear in a tag
export const UNCLASSIFIED_SEARCH = "_none";

export type SortOption = keyof typeof SORT_OPTIONS;
export type PeriodOption = keyof typeof PERIOD_OPTIONS;

export const PLATFORM_LABELS: Record<string, string> = {
  seloger: "SeLoger",
  leboncoin: "Leboncoin",
  bienici: "Bien'ici",
  pap: "PAP",
};

// Fixed slot per platform so a filter never repaints the survivors (values in globals.css)
const PLATFORM_SLOTS: Record<string, number> = {
  seloger: 1,
  leboncoin: 2,
  bienici: 3,
  pap: 4,
};

export function platformLabel(platform: string): string {
  return PLATFORM_LABELS[platform] ?? platform;
}

export function platformColor(platform: string): string {
  const slot = PLATFORM_SLOTS[platform];
  return slot ? `var(--series-${slot})` : "var(--series-other)";
}
