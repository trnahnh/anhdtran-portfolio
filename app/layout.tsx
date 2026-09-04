import type { Metadata } from "next";
import { Archivo, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import GradientBlobs from "@/components/GradientBlobs";
import InstrumentMatrix from "@/components/matrix/InstrumentMatrix";
import MatrixScore from "@/components/matrix/MatrixScore";
import MotionGate from "@/components/MotionGate";
// LoadBar (the scroll progress column) is unmounted at the user's request;
// the component stays in components/ per the nothing-deleted rule.
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
    // A 70 KB 1200x630 JPEG cut from the portrait. The 13 MB source used to
    // be the preview image, and most link unfurlers give up on it.
    images: [{ url: "/metadata/og.jpg", width: 1200, height: 630, alt: "Anh Tran" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Anh Tran",
    description:
      "Full-stack Developer and Powerlifting Enthusiast. Explore my space now.",
    images: ["/metadata/og.jpg"],
  },
};

// Mirrors the gate in components/PortraitScan.tsx; keep the two in step.
const SCAN_GATE =
  "try{if(location.pathname==='/'&&localStorage.getItem('portrait-scanned')!=='true'&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('scanning')}catch(e){}";

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
        {/* Runs while the HTML is still parsing, before anything has painted,
            so the page's arrival animations are held before they start. The
            component that owns the scan releases it, or never lets it run. */}
        <script dangerouslySetInnerHTML={{ __html: SCAN_GATE }} />
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
