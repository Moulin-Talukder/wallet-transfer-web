"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";

/** A real <form> posting to the logout action, so it also works before JavaScript loads. */
export function LogoutButton() {
  return (
    <form action={logout}>
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" className="h-9 gap-2 px-2.5" disabled={pending} aria-busy={pending}>
      {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <LogOut aria-hidden="true" />}
      <span className="sr-only sm:not-sr-only">Log out</span>
    </Button>
  );
}
