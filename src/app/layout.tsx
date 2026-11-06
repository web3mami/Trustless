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

const themeBootScript = `
(() => {
  try {
    let theme = localStorage.getItem("trustless-theme") || "day";
    if (theme === "night") theme = "moonlit";
    const valid = ["day", "blue-hour", "moonlit", "system"];
    if (!valid.includes(theme)) theme = "day";
    const resolved =
      theme === "system"
        ? (matchMedia("(prefers-color-scheme: dark)").matches ? "moonlit" : "day")
        : theme;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.resolvedTheme = resolved;
  } catch {
    document.documentElement.dataset.theme = "day";
    document.documentElement.dataset.resolvedTheme = "day";
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${opening.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
