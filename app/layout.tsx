import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host}`;
  return {
    metadataBase: new URL(baseUrl),
    title: "Raumplaner · Wohnung",
    description: "Interaktive 2D- und 3D-Möblierungsplanung für Zimmer 1 und Vorraum.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Raumplaner · Wohnung",
      description: "Zimmer 1 und Vorraum in 2D und 3D möblieren.",
      images: [{ url: `${baseUrl}/og.png`, width: 1536, height: 1024, alt: "Interaktiver 2D- und 3D-Raumplaner" }],
    },
    twitter: { card: "summary_large_image", images: [`${baseUrl}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
