"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { ErrorAlert } from "@/components/error-alert";
import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/actions/auth";
import { loginSchema, type LoginValues } from "@/lib/login-schema";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      try {
        // On success the action sets the cookie and redirects, so it only returns on failure.
        const result = await login(values);
        if (result && !result.ok) setError(result.message);
      } catch {
        setError("Can't reach the server. Check your connection and try again.");
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {error && <ErrorAlert title="Couldn't sign you in" message={error} />}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className="h-11 text-base"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby="email-error"
          {...form.register("email")}
        />
        <FieldError id="email-error" message={errors.email?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          className="h-11 text-base"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby="password-error"
          {...form.register("password")}
        />
        <FieldError id="password-error" message={errors.password?.message} />
      </div>

      <Button type="submit" className="h-11 w-full" disabled={isPending} aria-busy={isPending}>
        {isPending ? (
          <>
            <LoaderCircle aria-hidden="true" className="animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
