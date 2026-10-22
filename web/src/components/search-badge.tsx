export function SearchBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
      {label}
    </span>
  );
}
