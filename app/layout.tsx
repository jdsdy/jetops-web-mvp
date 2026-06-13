import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"

import "./globals.css";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jet Operations",
  description:
    "Upload flight plans, extract route details, and review analysed NOTAMs for your organisation.",
  icons: {
    icon: "/logo_square.png",
    apple: "/logo_square.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${publicSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white font-sans text-neutral-900">
        <NextTopLoader />
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
