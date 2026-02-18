import type { Metadata } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { SplashCursor } from "@/components/SplashCursor";
import GradientBlobs from "@/components/GradientBlobs";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
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
        className={`${playfair.variable} ${sourceSans.variable} antialiased`}
        style={{
          fontFamily: "var(--font-source-sans), system-ui, sans-serif",
        }}
      >
        <ErrorBoundary>
          <SplashCursor />
        </ErrorBoundary>
        <GradientBlobs />
        {children}
      </body>
    </html>
  );
}
