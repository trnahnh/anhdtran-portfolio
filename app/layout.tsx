import type { Metadata } from "next";
import { Archivo, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import GradientBlobs from "@/components/GradientBlobs";
import InstrumentMatrix from "@/components/matrix/InstrumentMatrix";
import MatrixScore from "@/components/matrix/MatrixScore";
import MotionGate from "@/components/MotionGate";
import PageTransition from "@/components/PageTransition";
import ScrollToTop from "@/components/ScrollToTop";
import PagePeel from "@/components/PagePeel";
import TerminalShortcut from "@/components/TerminalShortcut";
import SmoothScroll from "@/components/SmoothScroll";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";

// Display. Variable width axis (wdth 62–125) — the one aesthetic risk, spent
// once on the name during calibration and nowhere else.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

// Body prose.
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

// Every number, label, readout and terminal on the site. Previously
// --font-mono pointed at a Geist Mono that was never loaded, so all mono
// fell back to the browser default.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://anhdtrn.com"),
  title: "Anh Tran",
  description:
    "Full-stack Developer and Powerlifting Enthusiast. Explore my space now.",
  keywords: [
    "Anh Tran",
    "Full-stack Developer",
    "Software Engineer",
    "Portfolio",
    "React",
    "Next.js",
    "TypeScript",
  ],
  authors: [{ name: "Anh Tran" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/metadata/icon.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/metadata/icon.png",
  },
  openGraph: {
    title: "Anh Tran",
    description:
      "Full-stack Developer and Powerlifting Enthusiast. Explore my space now.",
    type: "website",
    url: "https://anhdtrn.com",
    siteName: "Anh Tran",
    images: [{ url: "/profile/portrait.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${archivo.variable} ${instrumentSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <MotionGate />
        <SmoothScroll />
        <GradientBlobs />
        <InstrumentMatrix />
        <MatrixScore />
        <PageTransition>{children}</PageTransition>
        <ScrollToTop />
        <PagePeel />
        <TerminalShortcut />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
