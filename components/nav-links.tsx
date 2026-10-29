"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transfers/new", label: "Send money" },
] as const;

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main">
      <ul className="flex items-center gap-1">
        {LINKS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center rounded-lg px-2.5 text-sm font-medium whitespace-nowrap sm:px-3 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
