"use client";

import { useEffect, useState } from "react";

export function SplashScreen() {
  const [hidden, setHidden] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1200);
    const hideTimer = setTimeout(() => setHidden(true), 1800);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (hidden) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 transition-opacity duration-500 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-2xl bg-white/30" />
        <img
          src="/logo-quizexam.svg"
          alt="QuizExam BF"
          className="relative h-24 w-24 animate-bounce rounded-2xl"
          width={96}
          height={96}
        />
      </div>
      <h1 className="mt-6 animate-pulse text-2xl font-bold text-white">
        QuizExam BF
      </h1>
      <p className="mt-1 text-sm text-white/80">
        Préparation Concours Burkina Faso
      </p>
      <div className="mt-6 flex gap-2">
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-white [animation-delay:-0.3s]" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-white [animation-delay:-0.15s]" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-white" />
      </div>
    </div>
  );
}
