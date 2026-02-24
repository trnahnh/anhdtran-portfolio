import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ConditionalSplashCursor from "@/components/ConditionalSplashCursor";
import GradientBlobs from "@/components/GradientBlobs";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import PageTransition from "@/components/PageTransition";
import ScrollToTop from "@/components/ScrollToTop";
import PagePeel from "@/components/PagePeel";
import TerminalShortcut from "@/components/TerminalShortcut";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"], weight: ["200", "300", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://anhdtrn.com"),
  title: "Anh Tran | Full-stack Developer",
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
    title: "Anh Tran | Full-stack Developer",
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
      <body className={`${inter.className} antialiased`}>
        <ErrorBoundary>
          <ConditionalSplashCursor />
        </ErrorBoundary>
        <GradientBlobs />
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
