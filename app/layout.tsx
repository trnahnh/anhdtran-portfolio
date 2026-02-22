import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ConditionalSplashCursor from "@/components/ConditionalSplashCursor";
import GradientBlobs from "@/components/GradientBlobs";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import PageTransition from "@/components/PageTransition";
import ScrollToTop from "@/components/ScrollToTop";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"], weight: ["200", "300", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://anhdtrn.com"),
  title: "Anh Tran",
  description:
    "Full-stack Developer and Powerlifting Enthusiast. Building innovative solutions with AI and modern web technologies.",
  keywords: [
    "Anh Tran",
    "Full-stack Developer",
    "Software Engineer",
    "React",
    "Next.js",
    "TypeScript",
  ],
  authors: [{ name: "Anh Tran" }],
  openGraph: {
    title: "Anh Tran",
    description:
      "Full-stack Developer and Powerlifting Enthusiast. Building innovative solutions with AI and modern web technologies.",
    type: "website",
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
        className={`${inter.className} antialiased`}
      >
        <ErrorBoundary>
          <ConditionalSplashCursor />
        </ErrorBoundary>
        <GradientBlobs />
        <PageTransition>{children}</PageTransition>
        <ScrollToTop />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
