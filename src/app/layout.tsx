import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// V3 — display face for headings (landing, view heroes, marketing cards).
const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "QuizExam BF — Plateforme de Quiz & Examens Blancs",
  description:
    "Plateforme de préparation aux concours du Burkina Faso : banques de questions QCM et examens blancs.",
  keywords: ["quiz", "examen blanc", "QCM", "concours", "Burkina Faso", "préparation"],
  authors: [{ name: "BAMOGO Pingdwendé Giovanni" }],
  icons: {
    icon: [
      { url: "/logo-quizexam.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  // iOS — application web installable via Safari (« Sur l'écran d'accueil »)
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "QuizExam BF",
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: "QuizExam BF — Plateforme de Quiz & Examens Blancs",
    description:
      "Préparez vos concours et examens au Burkina Faso : banques de questions QCM, examens blancs, correction immédiate et suivi intelligent.",
    siteName: "QuizExam BF",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1226" },
  ],
  // (iOS appleWebApp + formatDetection déclarés dans metadata)
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
          <SonnerToaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
