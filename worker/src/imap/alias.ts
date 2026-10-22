const ADDRESS_PATTERN = /[^\s<>"',;]+@[^\s<>"',;]+/g;

// Finds the "+tag" alias of baseAddress among the recipients: "me+lyon@gmail.com" → "lyon"
export function extractAlias(recipients: string[], baseAddress: string): string | null {
  const [baseLocal, baseDomain] = baseAddress.trim().toLowerCase().split("@");
  if (!baseLocal || !baseDomain) return null;

  for (const recipient of recipients) {
    for (const address of recipient.toLowerCase().match(ADDRESS_PATTERN) ?? []) {
      const [local, domain] = address.split("@");
      if (!local || domain !== baseDomain) continue;

      const plus = local.indexOf("+");
      if (plus === -1 || local.slice(0, plus) !== baseLocal) continue;

      const tag = local.slice(plus + 1);
      if (tag) return tag;
    }
  }

  return null;
}
