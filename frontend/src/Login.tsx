import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

import OrqivaLogo from "./components/brand/OrqivaLogo";
import PreferenceControls from "./components/preferences/PreferenceControls";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { login } from "./services/auth";
import {
  createFirstAccount,
  getSetupStatus,
  type SetupUser,
} from "./services/setup";
import { getErrorMessage } from "./services/api";
import { useI18n } from "./lib/i18n";

type Props = {
  onLogin: (user: SetupUser) => void;
};

type Mode = "checking" | "login" | "setup";

export default function Login({ onLogin }: Props) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("checking");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getSetupStatus()
      .then((status) => {
        if (active) {
          setMode(status.required ? "setup" : "login");
        }
      })
      .catch(() => {
        if (active) setMode("login");
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      let currentUser: SetupUser;

      if (mode === "setup") {
        if (password !== passwordConfirmation) {
          setError(t("login.passwordMismatch"));
          return;
        }

        const result = await createFirstAccount({
          name,
          email,
          password,
          passwordConfirmation,
        });
        currentUser = result.user;
      } else {
        const result = await login(email, password);
        currentUser = result.user;
      }

      onLogin(currentUser);
    } catch (caught) {
      setError(getErrorMessage(caught, t("login.error")));
    } finally {
      setLoading(false);
    }
  }

  const setup = mode === "setup";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_55%)]"
      />
      <div
        aria-hidden="true"
        className="login-grid pointer-events-none absolute inset-0"
      />

      <div className="absolute top-4 right-4 z-20">
        <PreferenceControls />
      </div>

      <div className="relative z-10 w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="relative flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent shadow-[0_20px_60px_-20px_var(--primary)]">
            <OrqivaLogo
              showWordmark={false}
              markClassName="size-11 drop-shadow-[0_0_20px_rgba(56,189,248,0.35)]"
            />
          </span>

          <h1 className="mt-6 text-2xl font-semibold tracking-tight">
            {setup ? t("login.setupWelcome") : t("login.welcome")}
          </h1>
          <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
            {setup ? t("login.setupSubtitle") : t("login.subtitle")}
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-7">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
          />

          {mode === "checking" ? (
            <div className="flex min-h-44 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle className="size-5 animate-spin" />
              {t("login.checkingSetup")}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {setup && (
                <div className="space-y-1.5">
                  <Label
                    htmlFor="name"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    {t("login.name")}
                  </Label>

                  <Input
                    id="name"
                    autoComplete="name"
                    autoFocus
                    placeholder={t("login.namePlaceholder")}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    className="h-11 rounded-lg border-border/70 bg-background/50"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-xs font-medium text-muted-foreground"
                >
                  {t("login.email")}
                </Label>

                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  autoFocus={!setup}
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="h-11 rounded-lg border-border/70 bg-background/50"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="text-xs font-medium text-muted-foreground"
                >
                  {t("login.password")}
                </Label>

                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={setup ? "new-password" : "current-password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={setup ? 8 : undefined}
                    className="h-11 rounded-lg border-border/70 bg-background/50 pr-11"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={
                      showPassword
                        ? t("login.hidePassword")
                        : t("login.showPassword")
                    }
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="size-[17px]" />
                    ) : (
                      <Eye className="size-[17px]" />
                    )}
                  </button>
                </div>
              </div>

              {setup && (
                <div className="space-y-1.5">
                  <Label
                    htmlFor="password-confirmation"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    {t("login.confirmPassword")}
                  </Label>

                  <Input
                    id="password-confirmation"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={passwordConfirmation}
                    onChange={(event) =>
                      setPasswordConfirmation(event.target.value)
                    }
                    required
                    minLength={8}
                    className="h-11 rounded-lg border-border/70 bg-background/50"
                  />
                </div>
              )}

              {setup && (
                <p className="text-xs leading-5 text-muted-foreground/70">
                  {t("login.passwordHint")}
                </p>
              )}

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs leading-5 text-destructive"
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="h-11 w-full rounded-lg font-semibold shadow-[0_10px_30px_-12px_var(--primary)]"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    {setup
                      ? t("login.setupSubmitting")
                      : t("login.submitting")}
                  </>
                ) : (
                  <>
                    {setup ? t("login.setupSubmit") : t("login.submit")}
                    <ArrowRight />
                  </>
                )}
              </Button>
            </form>
          )}
        </div>

        <footer className="mt-8 flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-muted-foreground/50">
          <ShieldCheck className="size-3.5 shrink-0" />
          {setup ? t("login.setupLocal") : t("login.secure")}
        </footer>
      </div>
    </main>
  );
}
