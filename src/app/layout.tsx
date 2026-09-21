import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Literata } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";

const literata = Literata({ subsets: ["latin"], variable: "--font-literata", display: "swap" });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Marginalia", template: "%s · Marginalia" },
  description: "Read Scripture and record spoken commentary beside the verses you're studying.",
};

export const viewport: Viewport = {
  themeColor: "#0e1330",
  width: "device-width",
  initialScale: 1,
};

// Sets the saved theme before first paint so there's no flash.
const themeScript = `(function(){try{var p=JSON.parse(localStorage.getItem("marginalia:prefs")||"{}");document.documentElement.dataset.theme=p.theme==="light"?"light":"dark";}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${literata.variable} ${instrument.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <Providers>
          <Header />
          <main>{children}</main>
          <footer className="mx-auto max-w-5xl px-6 pb-28 pt-10 text-sm text-muted">
            Scripture and lexicon data come from open Bible APIs (getBible and Bolls). Your recordings stay in this browser.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
