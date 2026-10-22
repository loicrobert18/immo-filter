"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/listings", label: "Annonces" },
  { href: "/stats", label: "Statistiques" },
  { href: "/searches", label: "Recherches" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 text-sm">
      {LINKS.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 ${
              active ? "bg-surface-0 font-medium text-primary" : "text-secondary hover:text-primary"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
