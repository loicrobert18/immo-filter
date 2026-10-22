"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { platformColor, platformLabel } from "@/lib/filter-options";
import { axisTick, tooltipStyle } from "./chart-theme";

export interface DailyChartRow {
  label: string;
  [platform: string]: string | number;
}

interface DailyChartProps {
  rows: DailyChartRow[];
  platforms: string[];
}

export function DailyChart({ rows, platforms }: DailyChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: "var(--border)" }} minTickGap={16} />
        <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
        <Tooltip {...tooltipStyle} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12 }}
          formatter={(value: string) => <span style={{ color: "var(--text-secondary)" }}>{value}</span>}
        />
        {platforms.map((platform, index) => (
          <Bar
            key={platform}
            dataKey={platform}
            name={platformLabel(platform)}
            stackId="day"
            fill={platformColor(platform)}
            stroke="var(--surface-1)"
            strokeWidth={2}
            maxBarSize={24}
            radius={index === platforms.length - 1 ? [4, 4, 0, 0] : 0}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
