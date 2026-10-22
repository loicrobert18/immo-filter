"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { axisTick, formatValue, tooltipStyle } from "./chart-theme";

export interface RankingRow {
  label: string;
  value: number;
}

interface RankingChartProps {
  rows: RankingRow[];
  valueName: string;
  unit?: string;
}

const ROW_HEIGHT = 36;

// Single-series horizontal bars: one hue, value at the bar tip
export function RankingChart({ rows, valueName, unit = "" }: RankingChartProps) {
  const format = (value: number) => `${formatValue(value)}${unit}`;

  return (
    <ResponsiveContainer width="100%" height={Math.max(rows.length * ROW_HEIGHT, 80)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 88, bottom: 0, left: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={110} tick={axisTick} tickLine={false} axisLine={false} />
        <Tooltip {...tooltipStyle} formatter={(value) => [format(Number(value)), valueName]} />
        <Bar
          dataKey="value"
          name={valueName}
          fill="var(--accent)"
          maxBarSize={20}
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="value"
            position="right"
            formatter={(value: unknown) => format(Number(value))}
            style={{ fill: "var(--text-secondary)", fontSize: 12 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
