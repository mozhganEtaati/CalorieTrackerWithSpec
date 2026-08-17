import type { Metadata } from "next";
import { Bricolage_Grotesque, Karla } from "next/font/google";
import "./globals.css";

// Bricolage Grotesque carries the personality: a variable width axis lets the
// day's one big number be set narrow and tight without a second typeface.
// Karla stays out of its way for everything that is read as a sentence.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-display",
  display: "swap",
});

const body = Karla({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Calorie Tracker",
  description: "Log what you ate. See how much room is left in the day.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      {/*
        Browser extensions (Grammarly and friends) add their own attributes to
        <body> before React hydrates, which React reports as a mismatch. This
        suppresses the diff for this one element's attributes only; children
        still hydrate normally.
      */}
      <body className="min-h-screen font-body" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
