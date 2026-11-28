"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/lib/hooks/use-is-client";

/** Renders into <body>, so no scrolling or transformed ancestor can clip it (drag overlays). */
export function BodyPortal({ children }: Readonly<{ children: ReactNode }>) {
  const isClient = useIsClient();
  return isClient ? createPortal(children, document.body) : null;
}
