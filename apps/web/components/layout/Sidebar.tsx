"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/matches", label: "Meciuri", icon: "⚽" },
  { href: "/accumulator", label: "Generator Acumulator", icon: "\u{1F3AF}" },
  { href: "/performance", label: "Performanță", icon: "\u{1F4C8}" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 md:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-series-1 text-lg font-bold text-white">V</div>
        <span className="text-lg font-semibold tracking-tight">VeyraPro</span>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-series-1/10 text-series-1" : "text-ink-secondary hover:bg-ink-primary/5 hover:text-ink-primary",
              )}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-card border border-border px-3 py-3 text-xs text-ink-muted">
        Predicțiile AI sunt estimări statistice, nu garanții. Pariază responsabil.
      </div>
    </aside>
  );
}
