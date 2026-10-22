import { platformColor, platformLabel } from "@/lib/filter-options";

export function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary">
      <span aria-hidden className="size-2 rounded-full" style={{ background: platformColor(platform) }} />
      {platformLabel(platform)}
    </span>
  );
}
