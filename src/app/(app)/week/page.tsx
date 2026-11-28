import type { Metadata } from "next";
import { ViewHeader } from "@/components/shell/ViewHeader";
import { WeekView } from "@/components/week/WeekView";

export const metadata: Metadata = { title: "Week" };

export default function WeekPage() {
  return (
    <>
      <ViewHeader
        title="Week"
        tagline="Seven days, one plan. Drag a task onto a day to give it a date."
      />
      <WeekView />
    </>
  );
}
