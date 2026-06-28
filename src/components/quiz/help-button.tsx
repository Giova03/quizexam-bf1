"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  HelpCircle,
  BookOpen,
  MessageSquare,
  Keyboard,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Mail,
  Info,
  RefreshCw,
} from "lucide-react";
import { useQuizStore } from "@/lib/quiz-store";
import { restartOnboarding } from "./onboarding-tour";

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: "Comment créer un compte ?",
    a: "Sur la page d'accueil, cliquez sur « Se connecter / S'inscrire ». Vous pouvez créer un compte avec votre email, ou utiliser un compte visiteur gratuit en un clic (sans email).",
  },
  {
    q: "Comment fonctionne le mode correction ?",
    a: "Mode 1 (immédiat) : vous voyez la bonne réponse et l'explication juste après chaque question. Mode 2 (final) : toutes les corrections sont regroupées à la fin de la session, comme dans un vrai examen.",
  },
  {
    q: "Comment utiliser la révision espacée ?",
    a: "La révision espacée utilise l'algorithme SM-2. Marquez une question pour révision depuis la page de résultats. Les cartes réapparaissent à intervalles optimisés (1, 3, 7, 16 jours…). Le tableau de bord affiche les cartes dues aujourd'hui.",
  },
  {
    q: "Comment participer à une compétition ?",
    a: "Cliquez sur « Compétition » dans le menu Plus. Créez une salle (choisissez une banque et le nombre de questions) ou rejoignez une salle existante avec un code à 6 caractères. Le classement se met à jour en temps réel !",
  },
  {
    q: "Comment gagner des badges ?",
    a: "Les badges se débloquent en atteignant des objectifs : terminer votre première session, obtenir 100%, répondre à 50 questions, maintenir une série de 7 jours, etc. Consultez la page « Succès » pour voir votre progression.",
  },
  {
    q: "Comment uploader un PDF ?",
    a: "Si vous êtes administrateur ou contributeur, ouvrez le panneau Admin → onglet « Banques ». Cliquez sur « Uploader un PDF » pour générer automatiquement une banque de questions à partir d'un document.",
  },
  {
    q: "Comment exporter vers Anki ?",
    a: "Ouvrez une banque de questions, puis cliquez sur « Exporter Anki ». Le fichier .txt au format Anki est téléchargé. Importez-le dans Anki Desktop via « Fichier → Importer ».",
  },
  {
    q: "Le mode hors ligne fonctionne comment ?",
    a: "L'application est installable comme une PWA. Une fois installée, les banques de questions et les pages consultées sont mises en cache. Vos actions hors ligne (sessions, réponses) sont synchronisées automatiquement à la reconnexion.",
  },
];

interface Shortcut {
  keys: string[];
  description: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ["Ctrl", "K"], description: "Ouvrir la recherche globale" },
  { keys: ["Esc"], description: "Fermer les dialogues / Passer le tour" },
  { keys: ["→"], description: "Étape suivante (durant le tour guidé)" },
  { keys: ["←"], description: "Étape précédente (durant le tour guidé)" },
  { keys: ["Tab"], description: "Naviguer entre les éléments focusables" },
  { keys: ["Enter"], description: "Valider / Sélectionner l'élément focusé" },
];

interface GuideStep {
  num: number;
  title: string;
  description: string;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    num: 1,
    title: "Connectez-vous",
    description:
      "Créez un compte avec votre email ou un compte visiteur gratuit pour accéder à toutes les fonctionnalités.",
  },
  {
    num: 2,
    title: "Choisissez une banque",
    description:
      "Parcourez les banques de questions par matière (Histoire, Économie, Culture générale BF, etc.) et cliquez pour voir les détails.",
  },
  {
    num: 3,
    title: "Lancez un quiz",
    description:
      "Choisissez le mode de correction (immédiat ou final), le nombre de questions et la difficulté, puis démarrez la session.",
  },
  {
    num: 4,
    title: "Consultez vos résultats",
    description:
      "À la fin de la session, accédez à votre score, aux corrections détaillées et aux explications. Marquez les questions difficiles pour la révision espacée.",
  },
  {
    num: 5,
    title: "Suivez votre progression",
    description:
      "Le tableau de bord affiche vos statistiques, votre série de jours consécutifs, et les cartes dues pour la révision.",
  },
  {
    num: 6,
    title: "Échangez avec la communauté",
    description:
      "Participez au forum par matière, défiez d'autres candidats en compétition, et grimpez au classement général.",
  },
];

export function HelpButton() {
  const [open, setOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const openForum = useQuizStore((s) => s.openForum);
  const openAbout = useQuizStore((s) => s.openAbout);

  function handleOpenForum() {
    setOpen(false);
    openForum();
  }

  function handleOpenAbout() {
    setOpen(false);
    openAbout();
  }

  function handleRestartTour() {
    setOpen(false);
    restartOnboarding();
  }

  return (
    <>
      {/* Floating button — opposite to the chatbot (bottom-left) */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg transition-all hover:scale-110 hover:shadow-xl"
        aria-label="Aide"
      >
        <HelpCircle className="h-6 w-6 text-emerald-600" />
        <span className="sr-only">Ouvrir l'aide</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b px-4 py-3 sm:px-6">
            <DialogTitle className="flex items-center gap-2 text-base">
              <HelpCircle className="h-4 w-4 text-emerald-600" />
              Centre d&apos;aide
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="guide" className="flex min-h-0 flex-1 flex-col gap-0">
            <div className="border-b px-4 sm:px-6">
              <TabsList className="h-auto bg-transparent p-0">
                <TabsTrigger
                  value="guide"
                  className="gap-1.5 data-[state=active]:bg-muted"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Guide
                </TabsTrigger>
                <TabsTrigger
                  value="faq"
                  className="gap-1.5 data-[state=active]:bg-muted"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  FAQ
                </TabsTrigger>
                <TabsTrigger
                  value="shortcuts"
                  className="gap-1.5 data-[state=active]:bg-muted"
                >
                  <Keyboard className="h-3.5 w-3.5" />
                  Raccourcis
                </TabsTrigger>
              </TabsList>
            </div>

            {/* GUIDE TAB */}
            <TabsContent
              value="guide"
              className="mt-0 max-h-[60vh] overflow-y-auto p-4 sm:p-6"
            >
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold">Démarrage rapide</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Suivez ces étapes pour bien commencer avec QuizExam BF.
                  </p>
                </div>

                <ol className="space-y-3">
                  {GUIDE_STEPS.map((s) => (
                    <li
                      key={s.num}
                      className="flex gap-3 rounded-lg border bg-card p-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">
                        {s.num}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{s.title}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {s.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
                  <p className="text-sm text-emerald-800 dark:text-emerald-200">
                    <span className="font-semibold">Astuce :</span> Vous pouvez
                    relancer le tour guidé à tout moment via le bouton ci-dessous.
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRestartTour}
                  className="gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Relancer le tour guidé
                </Button>
              </div>
            </TabsContent>

            {/* FAQ TAB */}
            <TabsContent
              value="faq"
              className="mt-0 max-h-[60vh] overflow-y-auto p-4 sm:p-6"
            >
              <div className="space-y-2">
                {FAQ_ITEMS.map((item, i) => {
                  const isOpen = openFaq === i;
                  return (
                    <div
                      key={i}
                      className="overflow-hidden rounded-lg border bg-card"
                    >
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : i)}
                        className="flex w-full items-center justify-between gap-2 p-3 text-left transition-colors hover:bg-muted/50"
                        aria-expanded={isOpen}
                      >
                        <span className="text-sm font-medium">{item.q}</span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="border-t bg-muted/30 p-3">
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {item.a}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* SHORTCUTS TAB */}
            <TabsContent
              value="shortcuts"
              className="mt-0 max-h-[60vh] overflow-y-auto p-4 sm:p-6"
            >
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-semibold">
                    Raccourcis clavier
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Gagnez du temps avec ces raccourcis disponibles partout dans
                    l&apos;application.
                  </p>
                </div>

                <ul className="space-y-2">
                  {SHORTCUTS.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
                    >
                      <span className="text-sm">{s.description}</span>
                      <div className="flex items-center gap-1">
                        {s.keys.map((k, j) => (
                          <span key={j}>
                            {j > 0 && (
                              <span className="mx-0.5 text-xs text-muted-foreground">
                                +
                              </span>
                            )}
                            <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium shadow-[0_1px_0] shadow-border">
                              {k}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer links */}
          <div className="border-t bg-muted/30 px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <button
                onClick={handleOpenForum}
                className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-emerald-600"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Forum
                <ChevronRight className="h-3 w-3" />
              </button>
              <a
                href="mailto:giobamos03@gmail.com"
                className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-emerald-600"
              >
                <Mail className="h-3.5 w-3.5" />
                Contact
                <ExternalLink className="h-3 w-3" />
              </a>
              <button
                onClick={handleOpenAbout}
                className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-emerald-600"
              >
                <Info className="h-3.5 w-3.5" />
                À propos
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
