import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Zap,
  Bot,
  MessageSquare,
  ShieldCheck,
  LoaderCircle,
  Workflow,
} from "lucide-react";

import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { login } from "./services/auth";
import flowPilotLogo from "./assets/Logo FlowPilot AI Bergaya Teknologi (1).png";

type Props = {
  onLogin: () => void;
};

export default function Login({ onLogin }: Props) {
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
      setError("Login gagal. Periksa email, password, dan koneksi backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dark min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Brand panel */}
        <section className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-card p-10 xl:flex xl:p-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_45%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_50%)]" />

          <a href="/" className="relative flex w-fit items-center">
            <img
              src={flowPilotLogo}
              alt="FlowPilot AI"
              className="h-14 w-auto object-contain"
            />
          </a>

          <div className="relative mx-auto w-full max-w-xl py-12">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1.5 text-xs font-medium text-primary">
              <span className="size-1.5 rounded-full bg-primary" />
              AUTOMATION WORKSPACE
            </div>

            <h1 className="max-w-lg text-4xl leading-[1.15] font-semibold tracking-tight text-foreground 2xl:text-5xl">
              Automate the routine.
              <br />
              <span className="text-primary">Focus on what matters.</span>
            </h1>

            <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">
              Build, connect, and manage intelligent workflows in one workspace
              designed for your team.
            </p>

            <div className="mt-12 rounded-2xl border border-border bg-background/60 p-5 shadow-2xl shadow-black/20">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Customer support
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Workflow preview
                  </p>
                </div>

                <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  Configured
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Zap className="size-[17px]" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      Trigger
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      New message
                    </p>
                  </div>
                </div>

                <ArrowRight className="hidden size-[15px] text-muted-foreground/60 sm:block" />

                <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/[0.05] p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Bot className="size-[17px]" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      AI Agent
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Process input
                    </p>
                  </div>
                </div>

                <ArrowRight className="hidden size-[15px] text-muted-foreground/60 sm:block" />

                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <MessageSquare className="size-[17px]" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      Response
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Send reply
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
                <Workflow className="size-[14px]" />
                Connected steps, one seamless flow.
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-between text-xs text-muted-foreground/70">
            <span>© 2026 FlowPilot AI</span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-[14px]" />
              Private workspace
            </span>
          </div>
        </section>

        {/* Login panel */}
        <section className="flex min-h-screen flex-col bg-background">
          <div className="flex items-center border-b border-border px-6 py-4 xl:hidden">
            <img
              src={flowPilotLogo}
              alt="FlowPilot AI"
              className="h-14 w-auto object-contain"
            />
          </div>

          <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
            <div className="w-full max-w-sm">
              <div className="mb-8">
                <div className="mb-6 flex size-11 items-center justify-center rounded-xl border border-border bg-muted/40 text-primary">
                  <Workflow className="size-[21px]" />
                </div>

                <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
                  Welcome back
                </p>

                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Sign in to FlowPilot
                </h2>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Enter your credentials to access your workspace.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>

                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className="h-11 dark:bg-input/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>

                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      className="h-11 pr-11 dark:bg-input/30"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
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
                    className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm leading-5 text-destructive"
                  >
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={loading}
                  className="h-11 w-full"
                >
                  {loading ? (
                    <>
                      <LoaderCircle className="animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-8 flex items-start justify-center gap-2 border-t border-border pt-5 text-center text-xs leading-5 text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-[15px] shrink-0" />
                <p>
                  Internal workspace. Access is restricted to authorized users.
                </p>
              </div>
            </div>
          </div>

          <footer className="px-6 py-4 text-center text-xs text-muted-foreground/70">
            FlowPilot AI · Automation workspace
          </footer>
        </section>
      </div>
    </main>
  );
}
