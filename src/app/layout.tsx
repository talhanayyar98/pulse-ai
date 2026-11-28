import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { AmbientBackground } from "@/components/shell/AmbientBackground";
import { AppProviders } from "@/components/providers/AppProviders";
import { palette } from "@/lib/theme";
import "./globals.css";

// opsz lets the browser pick Fraunces's optical size: crisper small titles, finer large headings.
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["normal", "italic"],
  axes: ["opsz"],
});
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
  // Matches the navy top bar on phones and the sidebar on desktop.
  themeColor: palette.nav,
  colorScheme: "light",
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
