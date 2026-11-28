import type { Metadata } from "next";
import { MonthView } from "@/components/month/MonthView";
import { ViewHeader } from "@/components/shell/ViewHeader";

export const metadata: Metadata = { title: "Month" };

export default function MonthPage() {
  return (
    <>
      <ViewHeader title="Month" tagline="The long view, a month at a time." />
      <MonthView />
    </>
  );
}
