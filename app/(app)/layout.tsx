import { Suspense } from "react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { LogoutButton } from "@/components/logout-button";
import { NavLinks } from "@/components/nav-links";
import { getCurrentUser } from "@/lib/dal";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-background px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:ring-3 focus:ring-ring/50"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
          <Link href="/dashboard" className="mr-auto rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:mr-4">
            <Brand />
          </Link>
          <NavLinks />
          <div className="flex items-center gap-1 sm:ml-auto">
            <Suspense>
              <UserName />
            </Suspense>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-10">
        {children}
      </main>
    </>
  );
}

async function UserName() {
  const user = await getCurrentUser();
  return (
    <span className="hidden max-w-48 truncate text-sm text-muted-foreground md:inline" title={user.email}>
      {user.name}
    </span>
  );
}
