import type { Metadata } from "next";
import { Suspense } from "react";
import { BoardView } from "@/components/board/BoardView";
import { NewTaskFromUrl } from "@/components/board/NewTaskFromUrl";
import { ViewHeader } from "@/components/shell/ViewHeader";

export const metadata: Metadata = { title: "Board" };

export default function BoardPage() {
  return (
    <>
      <ViewHeader title="Board" tagline="Everything in flight, one drag away." />
      <Suspense>
        <NewTaskFromUrl />
      </Suspense>
      <BoardView />
    </>
  );
}
