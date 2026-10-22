"use client";

import { useState } from "react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API needs a secure context; the address stays selectable
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-md border border-border px-2 py-0.5 text-xs text-secondary hover:text-primary"
    >
      {copied ? "Copié" : "Copier"}
    </button>
  );
}
