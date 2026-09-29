"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession, signIn, signOut } from "next-auth/react";
import { useQuizStore } from "@/shared/stores/quiz-store";
import { GoogleButton } from "@/components/quiz/google-button";
import {
  LogIn,
  UserPlus,
  LogOut,
  Mail,
  Lock,
  User,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Gift,
  UserCircle,
  Eye,
  EyeOff,
  Sparkles,
  Trophy,
  WifiOff,
  CheckCircle2,
} from "lucide-react";

/**
 * AuthDialog (V4 redesign) — animated login/signup dialog.
 *
 * Design: brand gradient header with floating shapes, a sliding-pill
 * login/signup switcher (framer-motion layoutId), icon inputs with a
 * password visibility toggle and a shimmering gradient submit button.
 * All authentication logic is unchanged: credentials signup + signIn,
 * referral pre-fill, Google OAuth via the shared GoogleButton.
 */

type AuthMode = "login" | "signup";

/**
 * Shown when next-auth returns no result at all — i.e. the credentials
 * callback crashed server-side (typically: database unreachable or schema
 * out of sync). Much more actionable than the former "Réponse
 * d'authentification vide."
 */
const SERVER_AUTH_ERROR =
  "Erreur côté serveur pendant l'authentification (base de données). Rechargez la page ; si le problème persiste, l'administrateur doit synchroniser la base (GET /api/admin/db-migrate).";

export function AuthDialog({
  open,
  onOpenChange,
  initialReferralCode,
  initialMode,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Optional referral code to pre-fill the signup form (e.g. from ?ref=CODE). */
  initialReferralCode?: string;
  /** Optional tab to pre-select — used by the landing CTA buttons. */
  initialMode?: "login" | "signup";
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode ?? "login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState(initialReferralCode ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If a referral code is provided later (e.g. via URL param after mount),
  // update the field and switch to signup mode so the user can complete it.
  useEffect(() => {
    if (initialReferralCode) {
      setReferralCode(initialReferralCode.toUpperCase());
      setMode("signup");
    }
  }, [initialReferralCode]);

  // Landing CTA pre-selection: when the dialog opens with an explicit mode,
  // honour it (e.g. "Créer mon compte" opens directly on the signup tab).
  useEffect(() => {
    if (open && initialMode) setMode(initialMode);
  }, [open, initialMode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            name,
            password,
            referralCode: referralCode.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Échec de l'inscription.");
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (result?.error)
          throw new Error("Inscription réussie mais connexion échouée. Essayez de vous connecter manuellement.");
        if (!result)
          throw new Error(SERVER_AUTH_ERROR);
        onOpenChange(false);
        reset();
      } else {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (result?.error) {
          throw new Error("Email ou mot de passe incorrect.");
        }
        if (!result) {
          throw new Error(SERVER_AUTH_ERROR);
        }
        onOpenChange(false);
        reset();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setEmail("");
    setName("");
    setPassword("");
    setReferralCode("");
    setError(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-[95vw] gap-0 overflow-y-auto p-0 sm:max-w-md">
        <DialogTitle className="sr-only">
          {mode === "login" ? "Connexion à QuizExam BF" : "Créer un compte QuizExam BF"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Connectez-vous ou créez un compte gratuit pour accéder à la plateforme.
        </DialogDescription>

        {/* ---- Brand header (gradient band + floating shapes) ---- */}
        <div className="animate-gradient-x relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-emerald-500 px-6 pb-8 pt-7 text-white">
          <div className="dot-grid-light absolute inset-0 opacity-20" aria-hidden="true" />
          <div
            className="aurora-blob h-32 w-32 bg-white/20"
            style={{ top: "-40%", right: "-6%" }}
            aria-hidden="true"
          />
          <div
            className="aurora-blob h-28 w-28 bg-orange-400/30"
            style={{ bottom: "-50%", left: "10%", animationDelay: "-6s" }}
            aria-hidden="true"
          />
          <div className="relative">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 shadow-lg backdrop-blur-sm">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-base font-bold leading-tight">
                  QuizExam <span className="text-gradient-gold">BF</span>
                </p>
                <p className="text-[11px] text-blue-100/80">
                  {mode === "login"
                    ? "Content de vous revoir !"
                    : "Rejoignez la communauté 2026"}
                </p>
              </div>
            </div>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              <li className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-blue-50 backdrop-blur-sm">
                <Sparkles className="h-3 w-3 text-amber-300" />
                Examen IA
              </li>
              <li className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-blue-50 backdrop-blur-sm">
                <Trophy className="h-3 w-3 text-amber-300" />
                Classements
              </li>
              <li className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-blue-50 backdrop-blur-sm">
                <WifiOff className="h-3 w-3 text-amber-300" />
                Hors ligne
              </li>
            </ul>
          </div>
        </div>

        {/* ---- Sliding pill tabs ---- */}
        <div className="relative z-10 -mt-5 px-6">
          <div
            className="grid grid-cols-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-lg shadow-blue-900/5"
            role="tablist"
            aria-label="Connexion ou inscription"
          >
            {(
              [
                { value: "login", label: "Connexion", icon: LogIn },
                { value: "signup", label: "Inscription", icon: UserPlus },
              ] as const
            ).map((tab) => {
              const active = mode === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setMode(tab.value);
                    setError(null);
                  }}
                  className={`relative flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-colors ${
                    active ? "text-white" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="auth-tab-pill"
                      className="animate-gradient-x absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 shadow-md"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      aria-hidden="true"
                    />
                  )}
                  <tab.icon className="relative z-10 h-4 w-4" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ---- Forms ---- */}
        <div className="px-6 pb-6 pt-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: mode === "login" ? -18 : 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === "login" ? 18 : -18 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {mode === "login" ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <IconField
                    id="login-email"
                    label="Email"
                    icon={<Mail className="h-4 w-4" />}
                  >
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="vous@exemple.com"
                      className="border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </IconField>
                  <IconField
                    id="login-password"
                    label="Mot de passe"
                    icon={<Lock className="h-4 w-4" />}
                    suffix={
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((v) => !v)}
                        className="text-slate-400 transition-colors hover:text-slate-600"
                        aria-label={
                          showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
                        }
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  >
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </IconField>

                  {error && <ErrorAlert message={error} />}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="btn-shine h-11 w-full gap-2 animate-gradient-x bg-gradient-to-r from-blue-600 to-emerald-500 text-base font-semibold shadow-lg shadow-blue-500/25"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogIn className="h-4 w-4" />
                    )}
                    Se connecter
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <IconField
                    id="signup-name"
                    label="Nom complet"
                    icon={<User className="h-4 w-4" />}
                  >
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Votre nom"
                      className="border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </IconField>
                  <IconField
                    id="signup-email"
                    label="Email"
                    icon={<Mail className="h-4 w-4" />}
                  >
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="vous@exemple.com"
                      className="border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </IconField>
                  <IconField
                    id="signup-password"
                    label="Mot de passe"
                    icon={<Lock className="h-4 w-4" />}
                    suffix={
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((v) => !v)}
                        className="text-slate-400 transition-colors hover:text-slate-600"
                        aria-label={
                          showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
                        }
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  >
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 6 caractères"
                      className="border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </IconField>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="signup-referral"
                      className="flex items-center gap-1.5 text-xs text-slate-500"
                    >
                      <Gift className="h-3.5 w-3.5 text-orange-500" />
                      Code de parrainage <span className="font-normal">(optionnel)</span>
                    </Label>
                    <Input
                      id="signup-referral"
                      type="text"
                      placeholder="ABCD1234"
                      className="h-10 border-slate-200 font-mono tracking-widest focus-visible:ring-blue-400"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      maxLength={8}
                      autoComplete="off"
                    />
                  </div>

                  {error && <ErrorAlert message={error} />}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="btn-shine h-11 w-full gap-2 animate-gradient-x bg-gradient-to-r from-orange-500 to-amber-400 text-base font-semibold shadow-lg shadow-orange-500/25"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    Créer mon compte
                  </Button>
                </form>
              )}
            </motion.div>
          </AnimatePresence>

          {/* ---- Separator + Google ---- */}
          <div className="relative py-4" role="separator" aria-label="ou">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <span className="w-full border-t border-slate-200" />
            </div>
            <span className="relative flex justify-center">
              <span className="bg-white px-3 text-xs uppercase tracking-wider text-slate-400">
                ou
              </span>
            </span>
          </div>

          {mode === "login" ? (
            <GoogleButton onRedirectStart={() => onOpenChange(false)} />
          ) : (
            <GoogleButton label="S'inscrire avec Google" onRedirectStart={() => onOpenChange(false)} />
          )}

          <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400">
            {mode === "login" ? (
              <>
                Pas encore de compte ?{" "}
                <button
                  type="button"
                  className="font-semibold text-blue-600 hover:underline"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                >
                  Inscrivez-vous gratuitement
                </button>
              </>
            ) : (
              <>
                Déjà inscrit ?{" "}
                <button
                  type="button"
                  className="font-semibold text-blue-600 hover:underline"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                >
                  Connectez-vous
                </button>
              </>
            )}
          </p>

          <p className="mt-3 flex items-center justify-center gap-1 text-center text-[10px] text-slate-400">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            Gratuit · Sans carte bancaire · Vos données restent les vôtres
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Wrapper input: rounded field with an icon chip inside and optional suffix. */
function IconField({
  id,
  label,
  icon,
  suffix,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  suffix?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-slate-500">
        {label}
      </Label>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 pl-3 transition-all focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10">
        <span className="text-slate-400 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        <div className="min-w-0 flex-1">{children}</div>
        {suffix && <span className="pr-3">{suffix}</span>}
      </div>
    </div>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <Alert variant="destructive" className="py-2">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="text-xs">{message}</AlertDescription>
    </Alert>
  );
}

export function UserMenuButton() {
  const { data: session, status } = useSession();
  const [authOpen, setAuthOpen] = useState(false);
  const openProfile = useQuizStore((s) => s.openProfile);

  if (status === "loading") {
    return (
      <div className="flex h-9 w-9 items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <>
        <Button
          size="sm"
          className="btn-shine animate-gradient-x gap-1.5 bg-gradient-to-r from-blue-600 to-emerald-500 text-white shadow-md shadow-blue-500/25 hover:opacity-95"
          onClick={() => setAuthOpen(true)}
        >
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline">Connexion</span>
        </Button>
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      </>
    );
  }

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  const initial = (session.user.name ?? session.user.email ?? "?")
    .charAt(0)
    .toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            aria-label="Menu utilisateur"
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ${
                isAdmin
                  ? "bg-gradient-to-br from-amber-500 to-orange-600"
                  : "bg-gradient-to-br from-blue-500 to-emerald-500"
              }`}
            >
              {initial}
            </span>
            <span className="hidden max-w-[100px] truncate sm:inline">
              {session.user.name}
            </span>
            {isAdmin && (
              <span className="hidden rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300 md:inline">
                ADMIN
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${
                isAdmin
                  ? "bg-gradient-to-br from-amber-500 to-orange-600"
                  : "bg-gradient-to-br from-blue-500 to-emerald-500"
              }`}
            >
              {initial}
            </span>
            <span className="min-w-0 flex-1 truncate">{session.user.name}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 cursor-pointer"
            onClick={() => openProfile()}
          >
            <UserCircle className="h-4 w-4" />
            Mon profil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 cursor-pointer text-rose-600 focus:text-rose-700"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
