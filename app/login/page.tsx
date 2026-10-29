import { Suspense } from "react";
import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Brand />
        </div>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>
              <h1 className="text-xl font-semibold">Sign in</h1>
            </CardTitle>
            <CardDescription>Send money to anyone with a wallet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Suspense>
              <SessionExpiredNotice searchParams={searchParams} />
            </Suspense>
            <LoginForm />
          </CardContent>
        </Card>
        <p className="mt-4 rounded-lg border border-dashed px-3 py-2 text-center text-xs text-muted-foreground">
          Demo accounts: <span className="font-medium text-foreground">alice@example.com</span> or{" "}
          <span className="font-medium text-foreground">bob@example.com</span>, password{" "}
          <span className="font-medium text-foreground">password</span>
        </p>
      </div>
    </main>
  );
}

async function SessionExpiredNotice({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { expired } = await searchParams;
  if (expired !== "1") return null;

  return (
    <p role="status" className="rounded-lg bg-muted px-3 py-2 text-sm">
      Your session has expired. Please sign in again.
    </p>
  );
}
