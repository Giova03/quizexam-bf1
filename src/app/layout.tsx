import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "QuizExam BF — Plateforme de Quiz & Examens Blancs",
  description:
    "Plateforme de préparation aux concours du Burkina Faso : banques de questions QCM et examens blancs.",
  keywords: ["quiz", "examen blanc", "QCM", "concours", "Burkina Faso", "préparation"],
  authors: [{ name: "BAMOGO Pingdwendé Giovanni" }],
  icons: { icon: "/logo-quizexam.svg" },
  manifest: "/manifest.json",
  openGraph: {
    title: "QuizExam BF — Plateforme de Quiz & Examens Blancs",
    description: "Préparation aux concours du Burkina Faso.",
    siteName: "QuizExam BF",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
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
