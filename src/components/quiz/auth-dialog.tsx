"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useQuizStore } from "@/lib/quiz-store";
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
} from "lucide-react";

export function AuthDialog({
  open,
  onOpenChange,
  initialReferralCode,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Optional referral code to pre-fill the signup form (e.g. from ?ref=CODE). */
  initialReferralCode?: string;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
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
          throw new Error("Inscription réussie mais connexion échouée.");
        onOpenChange(false);
        reset();
      } else {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        console.log("signIn result:", result);
        if (result?.error) {
          throw new Error("Email ou mot de passe incorrect.");
        }
        if (!result) {
          throw new Error("Réponse d'authentification vide.");
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Accès à votre espace
          </DialogTitle>
          <DialogDescription>
            Connectez-vous pour accéder à la plateforme ou créez un compte
            visiteur gratuit.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(v) => {
            setMode(v as "login" | "signup");
            setError(null);
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" className="gap-1.5">
              <LogIn className="h-4 w-4" />
              Connexion
            </TabsTrigger>
            <TabsTrigger value="signup" className="gap-1.5">
              <UserPlus className="h-4 w-4" />
              Inscription
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleSubmit} className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="vous@exemple.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="login-password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>
              {error && <ErrorAlert message={error} />}
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  Se connecter
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSubmit} className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="signup-name">Nom complet</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Votre nom"
                    className="pl-9"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="vous@exemple.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Min. 6 caractères"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-referral" className="flex items-center gap-1.5">
                  <Gift className="h-3.5 w-3.5 text-violet-600" />
                  Code de parrainage <span className="text-xs text-muted-foreground">(optionnel)</span>
                </Label>
                <Input
                  id="signup-referral"
                  type="text"
                  placeholder="ABCD1234"
                  className="font-mono tracking-widest"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  autoComplete="off"
                />
                <p className="text-[11px] text-muted-foreground">
                  Si un ami vous a invité, entrez son code pour le créditer.
                </p>
              </div>
              {error && <ErrorAlert message={error} />}
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  Créer mon compte
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
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
          className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90"
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
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${
                isAdmin
                  ? "bg-gradient-to-br from-amber-500 to-orange-600"
                  : "bg-gradient-to-br from-emerald-500 to-teal-600"
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
                  : "bg-gradient-to-br from-emerald-500 to-teal-600"
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
