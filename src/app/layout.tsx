import type { Metadata } from "next";
import { Outfit, Source_Sans_3 } from "next/font/google";
import { brand } from "@/lib/brand";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const source = Source_Sans_3({ subsets: ["latin"], variable: "--font-source" });

export const metadata: Metadata = {
  metadataBase: new URL(brand.url),
  title: {
    default: `${brand.name} | Urgent courier and hotshot delivery`,
    template: `%s | ${brand.name}`,
  },
  description: brand.supporting,
  alternates: { canonical: "/" },
  openGraph: {
    title: brand.heroHeadline,
    description: brand.heroDescription,
    images: ["/images/hero-night-dispatch.jpg"],
    locale: "en_AU",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={`${outfit.variable} ${source.variable} h-full`}>
      <body className="min-h-full antialiased">
        <a className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-3 focus:py-2" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
