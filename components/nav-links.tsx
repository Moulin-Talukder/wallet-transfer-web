"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transfers/new", label: "Send money" },
  { href: "/transfers", label: "History" },
] as const;

/** On phones the nav wraps onto its own row of equal-width tabs (see the app layout). */
export function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className={className}>
      <ul className="grid grid-cols-3 gap-1 sm:flex sm:items-center">
        {LINKS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 w-full items-center justify-center rounded-lg px-2.5 text-sm font-medium whitespace-nowrap sm:px-3 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
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
