import type { ReactNode } from "react";

export function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-lg border border-border bg-surface-1 p-4">
      <h2 className="font-semibold">{title}</h2>
      {subtitle && <p className="text-sm text-secondary">{subtitle}</p>}
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  );
}
