import { ChartCard } from "@/components/chart-card";
import { DailyChart, type DailyChartRow } from "@/components/charts/daily-chart";
import { RankingChart } from "@/components/charts/ranking-chart";
import { StatTile } from "@/components/stat-tile";
import { platformLabel } from "@/lib/filter-options";
import { formatNumber, formatPrice, formatShortDay } from "@/lib/format";
import { getCityPrices, getDailyCounts, getKpis, getPlatformCounts } from "@/lib/queries/stats";

export const dynamic = "force-dynamic";

const DAYS = 30;

// "Lyon 8ème arrondissement" → "Lyon 8ème" so city labels fit on one line
function shortCity(city: string): string {
  return city.replace(/\s+arrondissement$/i, "");
}

export default async function StatsPage() {
  const [kpis, daily, platforms, cities] = await Promise.all([
    getKpis(),
    getDailyCounts(DAYS),
    getPlatformCounts(),
    getCityPrices(10),
  ]);

  const platformKeys = platforms.map((row) => row.platform);
  const dailyRows: DailyChartRow[] = daily.map((entry) => ({
    label: formatShortDay(entry.day),
    ...Object.fromEntries(platformKeys.map((platform) => [platform, entry.byPlatform[platform] ?? 0])),
  }));
  const notifiedRate = kpis.total > 0 ? Math.round((kpis.notified / kpis.total) * 100) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Annonces en base" value={formatNumber(kpis.total)} />
        <StatTile label="Nouvelles sur 7 jours" value={formatNumber(kpis.last7Days)} />
        <StatTile label="Prix médian" value={formatPrice(kpis.medianPrice)} />
        <StatTile
          label="Prix médian au m²"
          value={kpis.medianPricePerM2 == null ? "—" : `${formatNumber(kpis.medianPricePerM2)} €/m²`}
          hint={notifiedRate == null ? undefined : `${notifiedRate} % des annonces notifiées par mail`}
        />
      </div>

      <ChartCard title="Nouvelles annonces par jour" subtitle={`${DAYS} derniers jours, par plateforme`}>
        {daily.every((entry) => entry.total === 0) ? (
          <p className="py-10 text-center text-sm text-secondary">Aucune nouvelle annonce sur cette période.</p>
        ) : (
          <DailyChart rows={dailyRows} platforms={platformKeys} />
        )}
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-secondary">Voir les données</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="tabular w-full text-left text-xs">
              <thead className="text-secondary">
                <tr>
                  <th className="py-1 pr-4 font-medium">Jour</th>
                  {platformKeys.map((platform) => (
                    <th key={platform} className="py-1 pr-4 font-medium">
                      {platformLabel(platform)}
                    </th>
                  ))}
                  <th className="py-1 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((entry) => (
                  <tr key={entry.day} className="border-t border-border">
                    <td className="py-1 pr-4">{formatShortDay(entry.day)}</td>
                    {platformKeys.map((platform) => (
                      <td key={platform} className="py-1 pr-4">
                        {entry.byPlatform[platform] ?? 0}
                      </td>
                    ))}
                    <td className="py-1 font-medium">{entry.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </ChartCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Annonces par plateforme" subtitle="Depuis le début">
          <RankingChart
            rows={platforms.map((row) => ({ label: platformLabel(row.platform), value: row.count }))}
            valueName="Annonces"
          />
        </ChartCard>
        <ChartCard title="Prix médian au m² par ville" subtitle="Les 10 villes avec le plus d'annonces">
          {cities.length === 0 ? (
            <p className="text-sm text-secondary">Pas encore assez de données.</p>
          ) : (
            <RankingChart
              rows={cities.map((row) => ({ label: shortCity(row.city), value: Math.round(row.medianPricePerM2) }))}
              valueName="Prix médian"
              unit=" €/m²"
            />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
