import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Fraunces } from "next/font/google";
import Link from "next/link";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { CALL_911, NOT_GOVERNMENT, NO_GUARANTEE } from "@/lib/copy";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";

const sans = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
});

const serif = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: { default: "DisasterNear", template: "%s · DisasterNear" },
  description: "Check official National Weather Service alerts, USGS earthquakes, and FEMA disaster declarations for a U.S. location.",
  manifest: "/manifest.webmanifest",
  applicationName: "DisasterNear",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <ServiceWorkerRegister />
        <a className="skip-link" href="#main">Skip to content</a>
        <div className="bg-clay px-4 py-2 text-center text-sm font-bold text-white">{CALL_911}</div>
        <div className="bg-amber px-4 py-2 text-center text-sm">{NOT_GOVERNMENT}</div>
        <header className="border-b border-line bg-card">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
            <Link href="/" className="group flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-pine text-card" aria-hidden="true">
                <svg viewBox="0 0 32 32" className="h-7 w-7">
                  <path fill="currentColor" d="M16 3.5 6 8v7.2c0 6.2 4.1 10.4 10 12.3 5.9-1.9 10-6.1 10-12.3V8L16 3.5zm0 4.2 7.2 3.2V15c0 4.4-2.8 7.6-7.2 9.2C11.6 22.6 8.8 19.4 8.8 15v-4.1L16 7.7z"/>
                </svg>
              </span>
              <span>
                <span className="block font-serif text-2xl font-semibold leading-none tracking-tight">DisasterNear</span>
                <span className="text-sm text-ink/70">Know hazards around your location</span>
              </span>
            </Link>
            <nav className="flex gap-2 text-sm font-bold" aria-label="Primary">
              <Link className="rounded-full px-3 py-2 hover:bg-moss" href="/">Check hazards</Link>
              <Link className="rounded-full px-3 py-2 hover:bg-moss" href="/sources">Sources</Link>
              <Link className="rounded-full px-3 py-2 hover:bg-moss" href="/about">About</Link>
            </nav>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="mt-16 border-t border-line px-4 py-8 text-center text-sm">
          <p className="font-bold">
            Powered by <a className="text-sea underline underline-offset-2" href="https://codyza.com" target="_blank" rel="noopener noreferrer">Codyza</a>
          </p>
          <p className="mx-auto mt-2 max-w-3xl text-ink/80">{NO_GUARANTEE}</p>
        </footer>
      </body>
    </html>
  );
}
