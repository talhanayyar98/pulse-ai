import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { AmbientBackground } from "@/components/shell/AmbientBackground";
import { AppProviders } from "@/components/providers/AppProviders";
import { palette } from "@/lib/theme";
import "./globals.css";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const sans = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  applicationName: "Pulse",
  title: { default: "Pulse", template: "%s · Pulse" },
  description: "A keyboard-first task manager: Kanban board, week planner and month calendar.",
  appleWebApp: { capable: true, title: "Pulse", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: palette.base,
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <AmbientBackground />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
