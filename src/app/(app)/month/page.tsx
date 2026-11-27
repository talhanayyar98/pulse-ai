import type { Metadata } from "next";
import { EmptyState } from "@/components/empty/EmptyState";
import { MonthIllustration } from "@/components/empty/illustrations";
import { ViewHeader } from "@/components/shell/ViewHeader";

export const metadata: Metadata = { title: "Month" };

export default function MonthPage() {
  return (
    <>
      <ViewHeader title="Month" tagline="The long view, a month at a time." />
      <EmptyState
        illustration={<MonthIllustration />}
        title="A blank month"
        body="Thirty-ish days of pure potential."
      />
    </>
  );
}
