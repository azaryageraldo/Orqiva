import { useState, type FormEvent } from "react";
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
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
} from "./lib/constants";
import { useI18n } from "./lib/i18n";

type Props = {
  onLogin: () => void;
};

export default function Login({ onLogin }: Props) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(email, password);
      onLogin();
    } catch {
      setError(t("login.error"));
    } finally {
      setLoading(false);
    }
  }

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
            {t("login.welcome")}
          </h1>
          <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
            {t("login.subtitle")}
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-7">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
          />

          <form onSubmit={handleSubmit} className="space-y-4">
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
                autoFocus
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
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
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
                  {t("login.submitting")}
                </>
              ) : (
                <>
                  {t("login.submit")}
                  <ArrowRight />
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-[11px] leading-5 text-muted-foreground/55">
          {t("login.demoTitle")}:{" "}
          <span className="font-mono text-muted-foreground/80">
            {DEFAULT_ADMIN_EMAIL}
          </span>
          <span className="mx-1.5 text-border">·</span>
          <span className="font-mono text-muted-foreground/80">
            {DEFAULT_ADMIN_PASSWORD}
          </span>
        </p>

        <footer className="mt-8 flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-muted-foreground/50">
          <ShieldCheck className="size-3.5 shrink-0" />
          {t("login.secure")}
        </footer>
      </div>
    </main>
  );
}
