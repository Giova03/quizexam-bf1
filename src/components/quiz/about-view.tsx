"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  Target,
  Brain,
  BarChart3,
  Trophy,
  BookOpen,
  Users,
  Globe2,
  Mail,
  Phone,
  MapPin,
  Heart,
  ShieldCheck,
  Languages,
  WifiOff,
  Bell,
  Sparkles,
  Code2,
  Github,
  ServerCog,
  Bot,
  Wallet,
  Rocket,
  Building2,
  ShoppingCart,
  CheckCircle2,
} from "lucide-react";
import { useTranslation } from "@/lib/use-translation";

const FEATURES = [
  { icon: Brain, titleKey: "about.f1.title", descKey: "about.f1.desc", color: "text-violet-600 bg-violet-50 dark:bg-violet-950/40" },
  { icon: BarChart3, titleKey: "about.f2.title", descKey: "about.f2.desc", color: "text-sky-600 bg-sky-50 dark:bg-sky-950/40" },
  { icon: Trophy, titleKey: "about.f3.title", descKey: "about.f3.desc", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" },
  { icon: BookOpen, titleKey: "about.f4.title", descKey: "about.f4.desc", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
  { icon: Users, titleKey: "about.f5.title", descKey: "about.f5.desc", color: "text-rose-600 bg-rose-50 dark:bg-rose-950/40" },
  { icon: Globe2, titleKey: "about.f6.title", descKey: "about.f6.desc", color: "text-teal-600 bg-teal-50 dark:bg-teal-950/40" },
  { icon: ShieldCheck, titleKey: "about.f7.title", descKey: "about.f7.desc", color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40" },
  { icon: Bell, titleKey: "about.f8.title", descKey: "about.f8.desc", color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40" },
  { icon: WifiOff, titleKey: "about.f9.title", descKey: "about.f9.desc", color: "text-orange-600 bg-orange-50 dark:bg-orange-950/40" },
];

const VISION_POINTS = [
  "about.vision.1",
  "about.vision.2",
  "about.vision.3",
  "about.vision.4",
  "about.vision.5",
];

/** Chemin de la photo du développeur (remplacer le fichier pour mettre à jour). */
const DEV_PHOTO = "/dev/giovanni-bamos.webp";

const SKILLS = [
  "Next.js",
  "React",
  "TypeScript",
  "Node.js",
  "Prisma ORM",
  "PostgreSQL",
  "Supabase",
  "Tailwind CSS",
  "Framer Motion",
  "NextAuth",
  "IA — GLM",
  "Vercel",
  "Git / GitHub",
];

/**
 * V9 — Carte « profil du développeur » de la plateforme.
 * Photo (fallback initial + anneau orbital animé), bio consistante,
 * projets lourds, compétences et contacts directs.
 */
function DeveloperProfile() {
  const { t } = useTranslation();
  const [photoOk, setPhotoOk] = useState(true);

  return (
    <section id="developpeur" className="space-y-4 scroll-mt-24">
      <div className="flex items-center gap-2">
        <Code2 className="h-5 w-5 text-amber-600" />
        <h2 className="text-xl font-semibold">{t("about.dev.title")}</h2>
      </div>

      <Card className="overflow-hidden">
        <div className="grid gap-0 md:grid-cols-3">
          {/* ---- Colonne identité ---- */}
          <div className="relative flex flex-col items-center justify-center gap-3 overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-6 text-center text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_55%)]" />
            {/* Photo + anneau orbital animé (fallback : initiales) */}
            <div className="relative z-10">
              <motion.span
                aria-hidden="true"
                className="absolute -inset-2 rounded-full border-2 border-dashed border-white/50"
                animate={{ rotate: 360 }}
                transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
              />
              {photoOk ? (
                <img
                  src={DEV_PHOTO}
                  alt="BAMOGO Pingdwendé Giovanni"
                  width={96}
                  height={96}
                  onError={() => setPhotoOk(false)}
                  className="relative h-24 w-24 rounded-full object-cover ring-4 ring-white/40"
                />
              ) : (
                <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white/20 text-2xl font-black backdrop-blur ring-4 ring-white/40">
                  BG
                </span>
              )}
            </div>
            <div className="relative z-10 space-y-1">
              <p className="text-base font-bold leading-tight">
                BAMOGO Pingdwendé Giovanni
              </p>
              <Badge className="border-white/30 bg-white/15 text-white backdrop-blur">
                {t("about.dev.role")}
              </Badge>
              <p className="flex items-center justify-center gap-1.5 text-xs text-white/85">
                <MapPin className="h-3 w-3" />
                Ouagadougou, Burkina Faso
              </p>
            </div>
          </div>

          {/* ---- Colonne bio + contacts ---- */}
          <div className="space-y-4 p-6 md:col-span-2">
            <div className="flex items-start gap-3">
              <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium">{t("about.dev.bioTitle")}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {t("about.dev.bio1")}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t("about.dev.bio2")}
                </p>
              </div>
            </div>

            {/* Contacts */}
            <div className="flex flex-col gap-2 border-t pt-3">
              <a
                href="mailto:giobamos03@gmail.com"
                className="flex items-center gap-2 text-sm transition-colors hover:text-amber-600"
              >
                <Mail className="h-4 w-4 text-muted-foreground" />
                giobamos03@gmail.com
              </a>
              <a
                href="https://github.com/Giova03"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm transition-colors hover:text-amber-600"
              >
                <Github className="h-4 w-4 text-muted-foreground" />
                github.com/Giova03
              </a>
              <a href="tel:+22670698070" className="flex items-center gap-2 text-sm transition-colors hover:text-amber-600">
                <Phone className="h-4 w-4 text-muted-foreground" />
                +226 70 69 80 70
              </a>
              <a href="tel:+22676456762" className="flex items-center gap-2 text-sm transition-colors hover:text-amber-600">
                <Phone className="h-4 w-4 text-muted-foreground" />
                +226 76 45 67 62
              </a>
            </div>

            {/* Compétences */}
            <div className="border-t pt-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("about.dev.skills")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SKILLS.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border bg-muted/60 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-amber-300 hover:text-amber-700 dark:hover:text-amber-300"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ---- Projets lourds ---- */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex flex-col p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">
            <Rocket className="h-5 w-5" />
          </div>
          <h3 className="mt-3 font-semibold">{t("about.dev.p1.title")}</h3>
          <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">
            {t("about.dev.p1.desc")}
          </p>
          <ul className="mt-3 space-y-1">
            {["about.dev.p1.k1", "about.dev.p1.k2", "about.dev.p1.k3"].map((k) => (
              <li key={k} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                {t(k)}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="flex flex-col p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
            <Building2 className="h-5 w-5" />
          </div>
          <h3 className="mt-3 font-semibold">{t("about.dev.p2.title")}</h3>
          <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">
            {t("about.dev.p2.desc")}
          </p>
          <ul className="mt-3 space-y-1">
            {["about.dev.p2.k1", "about.dev.p2.k2", "about.dev.p2.k3"].map((k) => (
              <li key={k} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                {t(k)}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="flex flex-col p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/40">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <h3 className="mt-3 font-semibold">{t("about.dev.p3.title")}</h3>
          <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">
            {t("about.dev.p3.desc")}
          </p>
          <ul className="mt-3 space-y-1">
            {["about.dev.p3.k1", "about.dev.p3.k2", "about.dev.p3.k3"].map((k) => (
              <li key={k} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                {t(k)}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ---- Bandeau chiffres de la plateforme phare ---- */}
      <Card className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
        {[
          { icon: ServerCog, value: "40+", label: t("about.dev.stat.api") },
          { icon: Languages, value: "3", label: t("about.dev.stat.langs") },
          { icon: Bot, value: "IA", label: t("about.dev.stat.ai") },
          { icon: Wallet, value: "100%", label: t("about.dev.stat.pay") },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1 text-center">
            <s.icon className="h-5 w-5 text-amber-600" />
            <p className="text-xl font-black">{s.value}</p>
            <p className="text-[11px] leading-tight text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </Card>
    </section>
  );
}

export function AboutView() {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-8 text-white shadow-lg md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <Badge className="border-white/30 bg-white/15 text-white backdrop-blur">
            <Sparkles className="mr-1 h-3 w-3" /> {t("menu.about")}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            QuizExam BF
          </h1>
          <p className="text-base text-white/90 md:text-lg">
            {t("about.hero.desc")}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-emerald-600" />
          <h2 className="text-xl font-semibold">{t("about.vision")}</h2>
        </div>
        <Card className="p-6">
          <div className="grid gap-3 md:grid-cols-2">
            {VISION_POINTS.map((point, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t(point)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600" />
          <h2 className="text-xl font-semibold">{t("land.nav.features")}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.titleKey} className="p-5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${f.color}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-semibold">{t(f.titleKey)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(f.descKey)}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <DeveloperProfile />

      <Card className="p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {t("about.footer.pre")}{" "}
          <Heart className="inline h-3.5 w-3.5 text-rose-500" />{" "}
          {t("about.footer.post")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          © {new Date().getFullYear()} — {t("about.rights")}
        </p>
      </Card>
    </div>
  );
}
