"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const LINKS = [
  { href: "/today", label: "Aujourd'hui", icon: "☀️" },
  { href: "/table", label: "Tableau", icon: "📋" },
  { href: "/team", label: "Équipe", icon: "👥" },
  { href: "/kanban", label: "Kanban", icon: "🗂️" },
  { href: "/gantt", label: "Gantt", icon: "📅" },
  { href: "/materiel", label: "Matériel", icon: "🧰" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop top nav */}
      <header className="hidden md:flex items-center justify-between border-b border-line px-6 py-3 bg-paper sticky top-0 z-20">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] uppercase tracking-widest text-chantier border border-chantier rounded px-2 py-0.5 bg-white">
            Chantier
          </span>
          <h1 className="font-display font-bold text-lg">Rénovation</h1>
        </div>
        <nav className="flex gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                pathname === l.href
                  ? "bg-blueprint text-white"
                  : "text-ink/70 hover:bg-white hover:text-ink"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between border-b border-line px-4 py-3 bg-paper sticky top-0 z-20">
        <span className="font-mono text-[10px] uppercase tracking-widest text-chantier border border-chantier rounded px-1.5 py-0.5 bg-white">
          Chantier
        </span>
        <h1 className="font-display font-bold text-base">
          {LINKS.find((l) => l.href === pathname)?.label ?? "Rénovation"}
        </h1>
        <div className="w-14" />
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-line flex justify-around py-1.5">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={clsx(
              "flex flex-col items-center gap-0.5 px-2 py-1 rounded text-[10px] font-medium",
              pathname === l.href ? "text-blueprint" : "text-ink/50"
            )}
          >
            <span className="text-base leading-none">{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
