import type { Metadata } from "next";
import { Big_Shoulders, Figtree, Instrument_Serif } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
});

const sans = Figtree({
  subsets: ["latin"],
  variable: "--font-sans",
});

const opening = Big_Shoulders({
  subsets: ["latin"],
  weight: "800",
  variable: "--font-opening",
});

export const metadata: Metadata = {
  title: "Trustless",
  description: "Trust no one. Verify everything.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${opening.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
