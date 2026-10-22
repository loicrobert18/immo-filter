import { z } from "zod";

// The tag is the "+alias" of the alert address, so it must stay plus-address safe
export const TAG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export const searchInputSchema = z.object({
  tag: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Le tag est obligatoire")
    .max(32, "32 caractères maximum")
    .regex(TAG_PATTERN, "Lettres minuscules, chiffres et tirets uniquement"),
  label: z.string().trim().min(1, "Le nom est obligatoire").max(100, "100 caractères maximum"),
});

export type SearchInput = z.infer<typeof searchInputSchema>;

// "me@gmail.com" + "lyon" → "me+lyon@gmail.com"
export function aliasAddress(baseAddress: string, tag: string): string | null {
  const at = baseAddress.lastIndexOf("@");
  if (at <= 0) return null;
  return `${baseAddress.slice(0, at)}+${tag}${baseAddress.slice(at)}`;
}
