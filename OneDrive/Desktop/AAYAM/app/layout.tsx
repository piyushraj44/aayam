import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { site } from "@/content/site";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} ${site.year} · ${site.institute}`,
    template: `%s · ${site.name} ${site.year}`,
  },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} ${site.year} · ${site.institute}`,
    description: site.shortDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} ${site.year} · ${site.institute}`,
    description: site.shortDescription,
  },
};

export const viewport: Viewport = {
  themeColor: "#050608",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

/**
 * Scroll-reveal targets (components/home/Reveal.tsx) start hidden in the
 * server HTML; without JavaScript they must stay visible. A <style> inside
 * <noscript> is only valid in <head>, so the rule lives here.
 */
const NO_JS_REVEAL =
  "[data-reveal]{opacity:1!important;transform:none!important}" +
  // the pinned Touch hero can't run without JS: show its settled state, unpinned
  "[data-touch-scene]{--hero-t:1!important;height:100svh!important}";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${jetbrains.variable}`}
      data-scroll-behavior="smooth"
    >
      <head>
        <noscript>
          <style>{NO_JS_REVEAL}</style>
        </noscript>
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
      </body>
    </html>
  );
}
