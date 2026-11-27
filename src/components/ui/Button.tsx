"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { type PointerEvent, type ReactNode, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { springs } from "@/lib/motion";

const VARIANTS = {
  /** The one primary action on screen: violet → fuchsia, with a light sweep on hover. */
  primary:
    "bg-cta sheen text-on-brand font-semibold shadow-cta hover:-translate-y-px hover:shadow-cta-hover",
  /** Neutral surface button. */
  secondary:
    "border border-line-strong bg-surface-raised text-fg hover:-translate-y-px hover:border-brand/60 hover:bg-brand/10 hover:shadow-glow-brand",
  ghost: "text-fg-secondary hover:bg-white/6 hover:text-fg",
  /** Destructive confirmation (e.g. "Click again to delete"). */
  danger:
    "border border-danger/50 bg-danger/12 text-danger hover:bg-danger/20 hover:shadow-glow-danger",
} as const;

const RIPPLE: Record<keyof typeof VARIANTS, string> = {
  primary: "bg-white/40",
  secondary: "bg-brand/40",
  ghost: "bg-white/15",
  danger: "bg-danger/35",
};

const SIZES = {
  sm: "h-8 gap-1.5 rounded-lg px-2.5 text-xs",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  icon: "size-8 rounded-lg",
} as const;

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  children?: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  onPointerDown,
  children,
  ...props
}: ButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextRipple = useRef(0);

  function addRipple(event: PointerEvent<HTMLButtonElement>) {
    onPointerDown?.(event);
    const rect = event.currentTarget.getBoundingClientRect();
    const size = Math.hypot(rect.width, rect.height) * 2;
    const ripple = {
      id: nextRipple.current++,
      x: event.clientX - rect.left - size / 2,
      y: event.clientY - rect.top - size / 2,
      size,
    };
    setRipples((current) => [...current, ripple]);
  }

  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.95 }}
      transition={springs.press}
      onPointerDown={addRipple}
      className={cn(
        // isolate: the ripple and sheen paint above the background but below the label.
        "relative isolate inline-flex shrink-0 items-center justify-center overflow-hidden font-medium transition-[color,background-color,background-position,border-color,box-shadow,translate] duration-300 disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          aria-hidden
          className={cn("pointer-events-none absolute -z-10 ripple rounded-full", RIPPLE[variant])}
          style={{ left: ripple.x, top: ripple.y, width: ripple.size, height: ripple.size }}
          onAnimationEnd={() =>
            setRipples((current) => current.filter((item) => item.id !== ripple.id))
          }
        />
      ))}
      {children}
    </motion.button>
  );
}
