import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type ErrorAlertProps = {
  title: string;
  message: string;
  /** Optional recovery control, e.g. a "Try again" button. */
  action?: ReactNode;
  className?: string;
};

/**
 * Error message announced by screen readers as soon as it appears
 * (role="alert" implies aria-live="assertive").
 */
export function ErrorAlert({ title, message, action, className }: ErrorAlertProps) {
  return (
    <Alert variant="destructive" aria-live="assertive" aria-atomic="true" className={cn("border-destructive/30 bg-destructive/5 px-3 py-3", className)}>
      <CircleAlert aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="text-destructive/90">
        <p>{message}</p>
        {action && <div className="mt-3">{action}</div>}
      </AlertDescription>
    </Alert>
  );
}
