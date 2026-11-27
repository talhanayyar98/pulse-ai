import type { Metadata } from "next";
import { EmptyState } from "@/components/empty/EmptyState";
import { WeekIllustration } from "@/components/empty/illustrations";
import { ViewHeader } from "@/components/shell/ViewHeader";

export const metadata: Metadata = { title: "Week" };

export default function WeekPage() {
  return (
    <>
      <ViewHeader title="Week" tagline="Seven days, one plan." />
      <EmptyState
        illustration={<WeekIllustration />}
        title="A wide-open week"
        body="Nothing planned yet. Enjoy it while it lasts."
      />
    </>
  );
}
