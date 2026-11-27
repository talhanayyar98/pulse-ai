import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty/EmptyState";
import { OfflineIllustration } from "@/components/empty/illustrations";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center">
      <EmptyState
        illustration={<OfflineIllustration />}
        title="You're offline"
        body="This page isn't saved on this device yet. Your board, week and month views still work."
        action={
          <Link
            href="/board"
            className="inline-flex items-center rounded-xl bg-neon px-4 py-2.5 text-sm font-semibold text-on-neon transition-shadow hover:shadow-glow-neon"
          >
            Back to the board
          </Link>
        }
      />
    </main>
  );
}
