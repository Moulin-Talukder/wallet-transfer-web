"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, Info, LoaderCircle } from "lucide-react";
import { AmountInput } from "@/components/amount-input";
import { ErrorAlert } from "@/components/error-alert";
import { FieldError } from "@/components/field-error";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreateTransferResult } from "@/lib/actions/transfers";
import type { ApiFailure, Transfer } from "@/lib/api/types";
import { describeFailure, transferFieldErrors, type UserMessage } from "@/lib/errors";
import { createIdempotencyKeyStore, type IdempotencyKeyStore } from "@/lib/idempotency";
import { formatPaisa } from "@/lib/money";
import {
  toTransferPayload,
  transferFormSchema,
  type TransferFormValues,
  type TransferPayload,
} from "@/lib/transfer-schema";
import { cn } from "@/lib/utils";

export type SendTransfer = (values: TransferFormValues, idempotencyKey: string) => Promise<CreateTransferResult>;

type TransferFormProps = {
  /** The createTransfer server action; injected so tests can pass a fake. */
  sendTransfer: SendTransfer;
  /** Balance in paisa, used to show the balance after the transfer on the review step. */
  balance?: number;
  /** For tests: deterministic idempotency keys. */
  keyStore?: IdempotencyKeyStore;
};

type Step =
  | { name: "edit" }
  | { name: "review"; values: TransferFormValues; payload: TransferPayload }
  | { name: "success"; payload: TransferPayload; transfer: Transfer; replayed: boolean };

const EMPTY_VALUES: TransferFormValues = { receiverEmail: "", amount: "" };

export function TransferForm({ sendTransfer, balance, keyStore }: TransferFormProps) {
  const [step, setStep] = useState<Step>({ name: "edit" });
  const [error, setError] = useState<UserMessage | null>(null);
  const [isPending, startTransition] = useTransition();
  // A ref, not state: two clicks in the same frame both see `true` before React re-renders.
  const inFlight = useRef(false);
  const keys = useRef<IdempotencyKeyStore>(null);
  keys.current ??= keyStore ?? createIdempotencyKeyStore();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: EMPTY_VALUES,
    mode: "onTouched",
  });
  const { errors } = form.formState;

  // Move focus to the new step's heading so keyboard and screen reader users follow along.
  const stepName = step.name;
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [stepName]);

  const review = form.handleSubmit((values) => {
    const validated = toTransferPayload(values);
    if (!validated.ok) return;
    setError(null);
    setStep({ name: "review", values, payload: validated.payload });
  });

  function send() {
    if (step.name !== "review" || inFlight.current || !keys.current) return;
    inFlight.current = true;
    setError(null);

    // Same payload -> same key, so this is safe to call again after any failure.
    const idempotencyKey = keys.current.keyFor(step.payload);
    const { values, payload } = step;

    startTransition(async () => {
      try {
        const result = await sendTransfer(values, idempotencyKey);
        if (!result) return; // The action redirected (session expired).
        if (result.ok) {
          keys.current?.reset();
          setStep({ name: "success", payload, transfer: result.transfer, replayed: result.replayed });
        } else {
          handleFailure(result.error);
        }
      } catch {
        // The request to our own server failed (offline, server restart). The outcome is unknown.
        handleFailure({ kind: "network" });
      } finally {
        inFlight.current = false;
      }
    });
  }

  function handleFailure(failure: ApiFailure) {
    if (failure.kind === "business" && failure.code === "IDEMPOTENCY_KEY_REUSED") {
      keys.current?.reset();
    }

    const fieldErrors = transferFieldErrors(failure);
    const fields = Object.keys(fieldErrors) as (keyof TransferFormValues)[];
    if (fields.length > 0) {
      setStep({ name: "edit" });
      for (const field of fields) form.setError(field, { message: fieldErrors[field] });
      // After the edit step has rendered.
      setTimeout(() => form.setFocus(fields[0]), 0);
      return;
    }
    setError(describeFailure(failure));
  }

  function startOver() {
    form.reset(EMPTY_VALUES);
    setError(null);
    setStep({ name: "edit" });
  }

  if (step.name === "success") {
    return (
      <div className="flex flex-col items-center text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-positive-soft">
          <CircleCheck aria-hidden="true" className="size-7 text-positive" />
        </span>
        <h2 ref={headingRef} tabIndex={-1} className="mt-4 text-xl font-semibold outline-none">
          Transfer sent
        </h2>
        <p className="mt-1 text-muted-foreground">
          {formatPaisa(step.transfer.amount)} to {step.payload.receiverEmail}
        </p>
        {step.replayed && (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-left text-sm" role="status">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            This transfer had already gone through, so it was not sent again. You were charged only once.
          </p>
        )}
        <dl className="mt-6 w-full rounded-xl border bg-muted/40 p-4 text-left text-sm">
          <dt className="text-muted-foreground">Transfer reference</dt>
          <dd className="mt-1 font-mono text-sm break-all" data-testid="transfer-reference">
            {step.transfer.reference}
          </dd>
        </dl>
        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" className="h-11 flex-1" onClick={startOver}>
            Send another
          </Button>
          <Link href="/dashboard" className={cn(buttonVariants(), "h-11 flex-1")}>
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (step.name === "review") {
    const { payload } = step;
    const balanceAfter = balance === undefined ? undefined : balance - payload.amountPaisa;

    return (
      <div>
        <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
          Review transfer
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Check the details. Transfers can&apos;t be undone.</p>

        <dl className="mt-5 divide-y rounded-xl border text-sm">
          <div className="flex justify-between gap-4 p-4">
            <dt className="text-muted-foreground">To</dt>
            <dd className="min-w-0 font-medium break-all">{payload.receiverEmail}</dd>
          </div>
          <div className="flex justify-between gap-4 p-4">
            <dt className="text-muted-foreground">Amount</dt>
            <dd className="text-lg font-semibold tabular-nums">{formatPaisa(payload.amountPaisa)}</dd>
          </div>
          {balanceAfter !== undefined && (
            <div className="flex justify-between gap-4 p-4">
              <dt className="text-muted-foreground">Balance after</dt>
              <dd className={cn("tabular-nums", balanceAfter < 0 && "text-destructive")}>
                {balanceAfter < 0 ? "Not enough balance" : formatPaisa(balanceAfter)}
              </dd>
            </div>
          )}
        </dl>

        {error && <ErrorAlert className="mt-4" title={error.title} message={error.message} />}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1"
            disabled={isPending}
            onClick={() => {
              setError(null);
              setStep({ name: "edit" });
            }}
          >
            Edit details
          </Button>
          <Button
            type="button"
            className="h-11 flex-1"
            disabled={isPending}
            aria-busy={isPending}
            onClick={send}
          >
            {isPending ? (
              <>
                <LoaderCircle aria-hidden="true" className="animate-spin" />
                Sending…
              </>
            ) : error?.retryable ? (
              "Try again"
            ) : (
              `Send ${formatPaisa(payload.amountPaisa)}`
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={review} noValidate>
      <h2 ref={headingRef} tabIndex={-1} className="sr-only outline-none">
        Transfer details
      </h2>
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="receiverEmail">Receiver&apos;s email</Label>
          <Input
            id="receiverEmail"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="name@example.com"
            className="h-11 text-base"
            aria-invalid={errors.receiverEmail ? true : undefined}
            aria-describedby={errors.receiverEmail ? "receiverEmail-error" : undefined}
            {...form.register("receiverEmail")}
          />
          <FieldError id="receiverEmail-error" message={errors.receiverEmail?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount (BDT)</Label>
          <AmountInput
            id="amount"
            aria-invalid={errors.amount ? true : undefined}
            aria-describedby={errors.amount ? "amount-error amount-hint" : "amount-hint"}
            {...form.register("amount")}
          />
          <p id="amount-hint" className="text-xs text-muted-foreground">
            Between ৳1 and ৳50,000, up to 2 decimal places.
          </p>
          <FieldError id="amount-error" message={errors.amount?.message} />
        </div>
      </div>

      <Button type="submit" className="mt-6 h-11 w-full">
        Review transfer
      </Button>
    </form>
  );
}
