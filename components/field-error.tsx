/**
 * Always rendered (empty when valid), so it works as a live region: screen readers
 * announce a message when it appears, which they may miss if the element is inserted.
 */
export function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p id={id} aria-live="polite" className="text-sm text-destructive empty:hidden">
      {message}
    </p>
  );
}
