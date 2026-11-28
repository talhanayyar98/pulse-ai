import type { Metadata } from "next";
import { Suspense } from "react";
import { BoardView } from "@/components/board/BoardView";
import { BoardUrlActions } from "@/components/board/BoardUrlActions";
import { OverdueBadge } from "@/components/shell/OverdueBadge";
import { ViewHeader } from "@/components/shell/ViewHeader";

export const metadata: Metadata = { title: "Board" };

export default function BoardPage() {
  return (
    <>
      <ViewHeader
        title="Board"
        tagline="Everything in flight, one drag away."
        aside={<OverdueBadge variant="pill" />}
      />
      <Suspense>
        <BoardUrlActions />
      </Suspense>
      <BoardView />
    </>
  );
}
