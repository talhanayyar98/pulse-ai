"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/cn";
import { springs } from "@/lib/motion";

const VARIANTS = {
  /** Neon: the one primary action on screen. */
  primary: "bg-neon text-on-neon font-semibold hover:shadow-glow-neon",
  /** Neutral surface button. */
  secondary:
    "border border-line-strong bg-surface-raised text-fg hover:border-brand/60 hover:shadow-glow-brand",
  ghost: "text-fg-secondary hover:bg-white/5 hover:text-fg",
} as const;

const SIZES = {
  sm: "h-8 gap-1.5 rounded-lg px-2.5 text-xs",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  icon: "size-8 rounded-lg",
} as const;

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.96 }}
      transition={springs.press}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-medium transition-[color,background-color,border-color,box-shadow] disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
