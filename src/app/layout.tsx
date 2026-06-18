import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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
    "Plateforme de préparation aux concours du Burkina Faso : banques de questions QCM et examens blancs générés à partir de vos documents de cours.",
  keywords: [
    "quiz",
    "examen blanc",
    "QCM",
    "concours",
    "Burkina Faso",
    "préparation",
    "culture générale",
  ],
  authors: [{ name: "QuizExam BF" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "QuizExam BF — Plateforme de Quiz & Examens Blancs",
    description:
      "Préparation aux concours du Burkina Faso avec banques de questions QCM et examens blancs.",
    siteName: "QuizExam BF",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "QuizExam BF — Plateforme de Quiz & Examens Blancs",
    description:
      "Préparation aux concours du Burkina Faso avec banques de questions QCM et examens blancs.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
