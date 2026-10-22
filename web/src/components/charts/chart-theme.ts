export const axisTick = { fill: "var(--text-secondary)", fontSize: 12 };

export const tooltipStyle = {
  contentStyle: {
    background: "var(--surface-1)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--text-primary)",
  },
  labelStyle: { color: "var(--text-primary)", fontWeight: 600 },
  itemStyle: { color: "var(--text-secondary)" },
  cursor: { fill: "var(--grid)" },
};

const groupedNumber = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export function formatValue(value: number): string {
  return groupedNumber.format(value);
}
