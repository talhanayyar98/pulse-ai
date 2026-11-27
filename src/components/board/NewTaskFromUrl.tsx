"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useUi } from "@/lib/stores/ui";

/** Handles the "New task" app shortcut (/board?new=1): opens quick add, then cleans the URL. */
export function NewTaskFromUrl() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const openPalette = useUi((state) => state.openPalette);
  const requested = searchParams.get("new") === "1";

  useEffect(() => {
    if (!requested) return;
    openPalette("create");
    router.replace("/board");
  }, [requested, openPalette, router]);

  return null;
}
