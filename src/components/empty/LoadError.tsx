import { Button } from "@/components/ui/Button";

/** Shown in place of a view when tasks fail to load. */
export function LoadError({ onRetry }: Readonly<{ onRetry: () => void }>) {
  return (
    <div className="mx-5 flex animate-fade-up items-center justify-between gap-4 rounded-2xl border border-danger/30 bg-danger/8 p-4 md:mx-8">
      <p className="text-sm text-fg-secondary">Couldn&apos;t load your tasks.</p>
      <Button size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
