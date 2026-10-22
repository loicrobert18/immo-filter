const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});
const shortDay = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

export function formatPrice(value: number | null): string {
  return value == null ? "Prix NC" : euro.format(value);
}

export function formatNumber(value: number | null): string {
  return value == null ? "—" : integer.format(value);
}

export function formatPricePerM2(price: number | null, surface: number | null): string | null {
  if (price == null || surface == null || surface <= 0) return null;
  return `${integer.format(price / surface)} €/m²`;
}

export function formatDateTime(value: Date): string {
  return dateTime.format(value);
}

// Input is a YYYY-MM-DD calendar day
export function formatShortDay(day: string): string {
  return shortDay.format(new Date(`${day}T00:00:00Z`));
}
