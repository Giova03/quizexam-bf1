"use client";

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
  Award,
  Languages,
  WifiOff,
  Bell,
  Sparkles,
} from "lucide-react";

const FEATURES = [
  { icon: Brain, title: "Intelligence adaptative", description: "Moteur IA qui ajuste la difficulté et génère des parcours personnalisés.", color: "text-violet-600 bg-violet-50 dark:bg-violet-950/40" },
  { icon: BarChart3, title: "Tableaux de bord analytiques", description: "Statistiques détaillées, progression, taux de réussite. Export PDF.", color: "text-sky-600 bg-sky-50 dark:bg-sky-950/40" },
  { icon: Trophy, title: "Gamification", description: "Badges, classements, challenges hebdomadaires, XP et séries de jours.", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" },
  { icon: BookOpen, title: "Intégration pédagogique", description: "Fiches explicatives, vidéos, podcasts et API avec universités.", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
  { icon: Users, title: "Collaboration", description: "Groupes d'étude virtuels, création et partage de quiz entre pairs.", color: "text-rose-600 bg-rose-50 dark:bg-rose-950/40" },
  { icon: Globe2, title: "Accessibilité & Multilingue", description: "Français, mooré, dioula, anglais. Mode hors ligne, options malvoyants.", color: "text-teal-600 bg-teal-50 dark:bg-teal-950/40" },
  { icon: ShieldCheck, title: "Intelligence collective", description: "Co-création de contenus validés par un comité académique.", color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40" },
  { icon: Bell, title: "Notifications mail", description: "Envoi automatique des résultats, rappels d'examens et alertes.", color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40" },
  { icon: WifiOff, title: "Mode hors ligne", description: "Accédez aux quiz même sans connexion. Synchronisation automatique.", color: "text-orange-600 bg-orange-50 dark:bg-orange-950/40" },
];

const VISION_POINTS = [
  "Devenir le référentiel national pour la préparation aux concours au Burkina Faso",
  "S'étendre en hub régional en Afrique de l'Ouest",
  "Réduire le taux d'échec aux concours par un apprentissage adaptatif",
  "Construire la plus grande banque de questions validées",
  "Favoriser l'inclusion via le multilinguisme et l'accessibilité",
];

export function AboutView() {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-8 text-white shadow-lg md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <Badge className="border-white/30 bg-white/15 text-white backdrop-blur">
            <Sparkles className="mr-1 h-3 w-3" /> À propos
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            QuizExam BF
          </h1>
          <p className="text-base text-white/90 md:text-lg">
            La plateforme intelligente de préparation aux concours du Burkina
            Faso. Banques de questions QCM, examens blancs, suivi analytique et
            gamification — pensée pour la réussite de chaque candidat.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-emerald-600" />
          <h2 className="text-xl font-semibold">Vision stratégique</h2>
        </div>
        <Card className="p-6">
          <div className="grid gap-3 md:grid-cols-2">
            {VISION_POINTS.map((point, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {point}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600" />
          <h2 className="text-xl font-semibold">Fonctionnalités</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="p-5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${f.color}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {f.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-600" />
          <h2 className="text-xl font-semibold">Créateur</h2>
        </div>
        <Card className="overflow-hidden">
          <div className="grid gap-0 md:grid-cols-3">
            <div className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-center text-white">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-2xl font-bold backdrop-blur">
                BP
              </div>
              <p className="font-semibold">BAMOGO Pingdwendé Giovanni</p>
              <Badge className="border-white/30 bg-white/15 text-white">
                Développeur Fullstack
              </Badge>
            </div>
            <div className="space-y-3 p-6 md:col-span-2">
              <div className="flex items-start gap-3">
                <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-medium">BAMOGO Pingdwendé Giovanni</p>
                  <p className="text-sm text-muted-foreground">
                    Développeur fullstack, concepteur et architecte de la
                    plateforme QuizExam BF. Passionné par l&apos;éducation
                    numérique et l&apos;inclusion en Afrique de l&apos;Ouest.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t pt-3">
                <a href="mailto:giobamos03@gmail.com" className="flex items-center gap-2 text-sm transition-colors hover:text-emerald-600">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  giobamos03@gmail.com
                </a>
                <a href="tel:+22670698070" className="flex items-center gap-2 text-sm transition-colors hover:text-emerald-600">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  +226 70 69 80 70
                </a>
                <a href="tel:+22676456762" className="flex items-center gap-2 text-sm transition-colors hover:text-emerald-600">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  +226 76 45 67 62
                </a>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Ouagadougou, Burkina Faso
                </p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <Card className="p-6 text-center">
        <p className="text-sm text-muted-foreground">
          QuizExam BF — Conçu avec{" "}
          <Heart className="inline h-3.5 w-3.5 text-rose-500" /> pour les
          candidats aux concours du Burkina Faso
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          © {new Date().getFullYear()} — Tous droits réservés
        </p>
      </Card>
    </div>
  );
}
