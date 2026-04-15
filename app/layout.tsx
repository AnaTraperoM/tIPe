import type { Metadata } from "next";
import localFont from "next/font/local";
import { DM_Mono } from "next/font/google";
import "./globals.css";

const inter = localFont({
  src: [
    { path: "./fonts/InterVariable.ttf", style: "normal" },
    { path: "./fonts/InterVariable-Italic.ttf", style: "italic" },
  ],
  variable: "--font-sans",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "tIPe — IP Data Visualization",
  description: "Explore, visualize, and interpret patent data using AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmMono.variable} h-full`}>
      <body className="h-full flex flex-col antialiased" style={{ background: "var(--background)", color: "var(--foreground)" }}>
        {children}
      </body>
    </html>
  );
}
