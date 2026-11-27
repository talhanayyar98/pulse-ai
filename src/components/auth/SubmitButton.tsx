"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/Button";

/** Submit button that shows a pending state while its form's server action runs. */
export function SubmitButton({
  children,
  variant,
}: Readonly<{ children: ReactNode; variant: ButtonProps["variant"] }>) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending}
      aria-busy={pending}
      className="w-full"
    >
      {pending ? "Signing in…" : children}
    </Button>
  );
}
