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
import { useTranslation } from "@/lib/use-translation";
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
  ExternalLink,
  MailCheck,
  KeyRound,
  ArrowLeft,
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

type AuthMode = "login" | "signup" | "forgot";

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
  // V7 — flux "mot de passe oublié" (mode forgot).
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [ownerLink, setOwnerLink] = useState<string | null>(null);
  const { t } = useTranslation();

  // Message when next-auth returns no result at all — i.e. the credentials
  // callback crashed server-side (database unreachable / schema out of sync).
  const SERVER_AUTH_ERROR = t("auth.error.server");

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
          throw new Error(data.error || t("auth.error.signupFailed"));
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (result?.error)
          throw new Error(t("auth.error.loginAfterSignup"));
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
          throw new Error(t("auth.error.invalid"));
        }
        if (!result) {
          throw new Error(SERVER_AUTH_ERROR);
        }
        onOpenChange(false);
        reset();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
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
    setForgotEmail("");
    setForgotSent(false);
    setOwnerLink(null);
  }

  /** V7 — demande de lien de réinitialisation (envoi Brevo côté serveur). */
  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    setError(null);
    setOwnerLink(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("auth.forgot.error"));
      setForgotSent(true);
      if (data.ownerLink) setOwnerLink(data.ownerLink);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setForgotLoading(false);
    }
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
          {mode === "login"
            ? t("auth.login.title")
            : mode === "signup"
              ? t("auth.signup.title")
              : t("auth.forgot.title")}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t("auth.dialog.desc")}
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
                  {mode === "login" ? t("auth.login.sub") : t("auth.signup.sub")}
                </p>
              </div>
            </div>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              <li className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-blue-50 backdrop-blur-sm">
                <Sparkles className="h-3 w-3 text-amber-300" />
                {t("auth.chip.ai")}
              </li>
              <li className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-blue-50 backdrop-blur-sm">
                <Trophy className="h-3 w-3 text-amber-300" />
                {t("auth.chip.boards")}
              </li>
              <li className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-blue-50 backdrop-blur-sm">
                <WifiOff className="h-3 w-3 text-amber-300" />
                {t("auth.chip.offline")}
              </li>
            </ul>
          </div>
        </div>

        {/* ---- Sliding pill tabs (masquées en mode forgot) ---- */}
        {mode !== "forgot" && (
        <div className="relative z-10 -mt-5 px-6">
          <div
            className="grid grid-cols-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-lg shadow-blue-900/5"
            role="tablist"
            aria-label={t("auth.tabs.aria")}
          >
            {(
              [
                { value: "login", label: t("auth.tab.login"), icon: LogIn },
                { value: "signup", label: t("auth.tab.signup"), icon: UserPlus },
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
        )}

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
                    label={t("auth.field.email")}
                    icon={<Mail className="h-4 w-4" />}
                  >
                    <Input
                      id="login-email"
                      type="email"
                      placeholder={t("auth.field.emailPlaceholder")}
                      className="border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </IconField>
                  <IconField
                    id="login-password"
                    label={t("auth.field.password")}
                    icon={<Lock className="h-4 w-4" />}
                    suffix={
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((v) => !v)}
                        className="text-slate-400 transition-colors hover:text-slate-600"
                        aria-label={
                          showPassword ? t("auth.hidePassword") : t("auth.showPassword")
                        }
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  >
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("auth.field.passwordPlaceholder")}
                      className="border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </IconField>

                  {error && <ErrorAlert message={error} showDiagnostic={error === SERVER_AUTH_ERROR} />}

                  {/* V7 — accès direct au flux "mot de passe oublié" */}
                  <button
                    type="button"
                    className="-mt-1 self-end text-xs font-semibold text-blue-600 transition-colors hover:text-blue-800 hover:underline dark:text-blue-300"
                    onClick={() => {
                      setMode("forgot");
                      setError(null);
                    }}
                  >
                    {t("auth.forgot.link")}
                  </button>

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
                    {t("auth.login.button")}
                  </Button>
                </form>
              ) : mode === "forgot" ? (
                /* ---------- V7 — Mot de passe oublié ---------- */
                <div>
                  {forgotSent ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center py-4 text-center"
                    >
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/60">
                        <MailCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-300" />
                      </span>
                      <h3 className="mt-4 font-display text-base font-bold text-foreground">
                        {t("auth.forgot.sentTitle")}
                      </h3>
                      <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
                        {t("auth.forgot.sentDesc")} {" "}
                        <span className="font-semibold text-foreground">{forgotEmail}</span>
                      </p>
                      {ownerLink && (
                        <a
                          href={ownerLink}
                          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md"
                        >
                          {t("auth.forgot.ownerLink")}
                        </a>
                      )}
                      <button
                        type="button"
                        className="mt-5 text-xs font-semibold text-blue-600 hover:underline"
                        onClick={() => {
                          setMode("login");
                          setError(null);
                        }}
                      >
                        {t("auth.forgot.backToLogin")}
                      </button>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleForgotSubmit} className="space-y-4">
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {t("auth.forgot.desc")}
                      </p>
                      <IconField
                        id="forgot-email"
                        label={t("auth.field.email")}
                        icon={<Mail className="h-4 w-4" />}
                      >
                        <Input
                          id="forgot-email"
                          type="email"
                          placeholder={t("auth.field.emailPlaceholder")}
                          className="border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                          autoComplete="email"
                        />
                      </IconField>

                      {error && <ErrorAlert message={error} />}

                      <Button
                        type="submit"
                        disabled={forgotLoading}
                        className="btn-shine h-11 w-full gap-2 animate-gradient-x bg-gradient-to-r from-blue-600 to-emerald-500 text-base font-semibold shadow-lg shadow-blue-500/25"
                      >
                        {forgotLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <KeyRound className="h-4 w-4" />
                        )}
                        {t("auth.forgot.submit")}
                      </Button>
                      <button
                        type="button"
                        className="mx-auto flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                        onClick={() => {
                          setMode("login");
                          setError(null);
                        }}
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        {t("auth.forgot.backToLogin")}
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <IconField
                    id="signup-name"
                    label={t("auth.field.name")}
                    icon={<User className="h-4 w-4" />}
                  >
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder={t("auth.field.namePlaceholder")}
                      className="border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </IconField>
                  <IconField
                    id="signup-email"
                    label={t("auth.field.email")}
                    icon={<Mail className="h-4 w-4" />}
                  >
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder={t("auth.field.emailPlaceholder")}
                      className="border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </IconField>
                  <IconField
                    id="signup-password"
                    label={t("auth.field.password")}
                    icon={<Lock className="h-4 w-4" />}
                    suffix={
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((v) => !v)}
                        className="text-slate-400 transition-colors hover:text-slate-600"
                        aria-label={
                          showPassword ? t("auth.hidePassword") : t("auth.showPassword")
                        }
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  >
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("auth.field.passwordMin")}
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
                      {t("auth.referral")} <span className="font-normal">{t("auth.referral.optional")}</span>
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

                  {error && <ErrorAlert message={error} showDiagnostic={error === SERVER_AUTH_ERROR} />}

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
                    {t("auth.signup.button")}
                  </Button>
                </form>
              )}
            </motion.div>
          </AnimatePresence>

          {/* ---- Separator + Google ---- */}
          <div className="relative py-4" role="separator" aria-label={t("auth.or")}>
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <span className="w-full border-t border-slate-200" />
            </div>
            <span className="relative flex justify-center">
              <span className="bg-white px-3 text-xs uppercase tracking-wider text-slate-400">
                {t("auth.or")}
              </span>
            </span>
          </div>

          {mode === "login" ? (
            <GoogleButton onRedirectStart={() => onOpenChange(false)} />
          ) : (
            <GoogleButton label={t("auth.google.signup")} onRedirectStart={() => onOpenChange(false)} />
          )}

          <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400">
            {mode === "login" ? (
              <>
                {t("auth.noAccount")}{" "}
                <button
                  type="button"
                  className="font-semibold text-blue-600 hover:underline"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                >
                  {t("auth.signup.free")}
                </button>
              </>
            ) : (
              <>
                {t("auth.hasAccount")}{" "}
                <button
                  type="button"
                  className="font-semibold text-blue-600 hover:underline"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                >
                  {t("auth.login.link")}
                </button>
              </>
            )}
          </p>

          <p className="mt-3 flex items-center justify-center gap-1 text-center text-[10px] text-slate-400">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            {t("auth.trust")}
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

function ErrorAlert({ message, showDiagnostic }: { message: string; showDiagnostic?: boolean }) {
  const { t } = useTranslation();
  // Erreur serveur (base manquante/hors service) → proposer le diagnostic.
  return (
    <Alert variant="destructive" className="py-2">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="text-xs">
        {message}
        {showDiagnostic && (
          <a
            href="/setup"
            target="_blank"
            rel="noreferrer"
            className="ml-1 inline-flex items-center gap-0.5 font-semibold underline underline-offset-2"
          >
            {t("auth.openDiagnostics")} <ExternalLink className="inline h-3 w-3" />
          </a>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function UserMenuButton() {
  const { data: session, status } = useSession();
  const [authOpen, setAuthOpen] = useState(false);
  const openProfile = useQuizStore((s) => s.openProfile);
  const { t } = useTranslation();

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
          <span className="hidden sm:inline">{t("user.loginCta")}</span>
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
            aria-label={t("user.menu")}
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
            {t("user.profile")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 cursor-pointer text-rose-600 focus:text-rose-700"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            {t("user.logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

/**
 * ResetPasswordDialog (V7) — formulaire de définition d'un nouveau mot de
 * passe après le clic sur le lien de l'email "mot de passe oublié"
 * (ouvert via l'URL ?reset=<token> interceptée par page.tsx).
 */
export function ResetPasswordDialog({
  open,
  onOpenChange,
  token,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  token: string;
}) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError(t("auth.reset.errorShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.reset.errorMismatch"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("auth.reset.errorGeneric"));
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[95vw] gap-0 overflow-y-auto p-0 sm:max-w-md">
        <DialogTitle className="sr-only">{t("auth.reset.title")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("auth.reset.desc")}
        </DialogDescription>

        <div className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-emerald-500 px-6 pb-7 pt-7 text-white">
          <div className="dot-grid-light absolute inset-0 opacity-20" aria-hidden="true" />
          <div className="relative flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 shadow-lg backdrop-blur-sm">
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-base font-bold leading-tight">
                {t("auth.reset.title")}
              </p>
              <p className="text-[11px] text-blue-100/80">{t("auth.reset.sub")}</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-5">
          {done ? (
            <div className="flex flex-col items-center py-4 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/60">
                <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-300" />
              </span>
              <h3 className="mt-4 font-display text-base font-bold">
                {t("auth.reset.doneTitle")}
              </h3>
              <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
                {t("auth.reset.doneDesc")}
              </p>
              <Button
                className="btn-shine mt-5 h-10 w-full gap-2 animate-gradient-x bg-gradient-to-r from-blue-600 to-emerald-500 font-semibold"
                onClick={() => onOpenChange(false)}
              >
                <LogIn className="h-4 w-4" />
                {t("auth.reset.backToLogin")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <IconField
                id="reset-password"
                label={t("auth.reset.newPassword")}
                icon={<Lock className="h-4 w-4" />}
                suffix={
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShow((v) => !v)}
                    className="text-slate-400 transition-colors hover:text-slate-600"
                    aria-label={show ? t("auth.hidePassword") : t("auth.showPassword")}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              >
                <Input
                  id="reset-password"
                  type={show ? "text" : "password"}
                  placeholder={t("auth.field.passwordMin")}
                  className="border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </IconField>
              <IconField
                id="reset-confirm"
                label={t("auth.reset.confirm")}
                icon={<Lock className="h-4 w-4" />}
              >
                <Input
                  id="reset-confirm"
                  type={show ? "text" : "password"}
                  placeholder={t("auth.reset.confirmPlaceholder")}
                  className="border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
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
                  <KeyRound className="h-4 w-4" />
                )}
                {t("auth.reset.submit")}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
