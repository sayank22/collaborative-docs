import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Footer } from "@/src/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    "https://collaborative-docs-sayankundu.vercel.app"
  ),

  title: {
    default: "Collaborative Docs",
    template: "%s | Collaborative Docs",
  },

  description:
    "A local-first collaborative document editor with real-time collaboration, offline editing, version history, and AI-powered writing assistance.",

  keywords: [
    "Collaborative Docs",
    "Next.js",
    "Supabase",
    "TipTap",
    "Yjs",
    "CRDT",
    "Offline First",
    "AI Editor",
    "Real-Time Collaboration",
    "Document Editor",
    "PostgreSQL",
  ],

  authors: [
    {
      name: "Sayan Kundu",
      url: "https://github.com/sayank22",
    },
  ],

  creator: "Sayan Kundu",
  publisher: "Sayan Kundu",
  applicationName: "Collaborative Docs",

  openGraph: {
    title: "Collaborative Docs",
    description:
      "A local-first collaborative document editor with real-time collaboration, offline editing, version history, and AI-powered writing assistance.",
    url: "https://collaborative-docs-sayankundu.vercel.app",
    siteName: "Collaborative Docs",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Collaborative Docs",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Collaborative Docs",
    description:
      "Local-first collaborative document editor powered by Next.js, Supabase, TipTap, Yjs, and AI.",
    images: ["/og-image.png"],
  },

  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="bottom-right" richColors />
        <Footer />
      </body>
    </html>
  );
}