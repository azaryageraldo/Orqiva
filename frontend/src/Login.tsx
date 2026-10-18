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
    <main className="dark min-h-screen bg-[#09090b] text-zinc-100">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Brand panel */}
        <section className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.08] bg-[#0c0d10] p-10 xl:flex xl:p-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_45%,rgba(96,165,250,0.10),transparent_50%)]" />

          <a href="/" className="relative flex w-fit items-center">
            <img
              src={flowPilotLogo}
              alt="FlowPilot AI"
              className="h-70 w-250 object-contain"
            />
          </a>

          <div className="relative mx-auto w-full max-w-xl py-12">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-400/15 bg-sky-400/[0.05] px-3 py-1.5 text-xs font-medium text-sky-300">
              <span className="size-1.5 rounded-full bg-sky-400" />
              AUTOMATION WORKSPACE
            </div>

            <h1 className="max-w-lg text-4xl font-semibold leading-[1.15] tracking-tight text-white 2xl:text-5xl">
              Automate the routine.
              <br />
              <span className="text-sky-300">Focus on what matters.</span>
            </h1>

            <p className="mt-5 max-w-md text-sm leading-7 text-zinc-400">
              Build, connect, and manage intelligent workflows in one
              workspace designed for your team.
            </p>

            <div className="mt-12 rounded-2xl border border-white/[0.09] bg-[#111214]/90 p-5 shadow-2xl shadow-black/20">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-200">
                    Customer support
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Workflow preview
                  </p>
                </div>

                <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1 text-[11px] text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  Configured
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300">
                    <Zap size={17} />
                  </span>
                  <div>
                    <p className="text-xs font-medium">Trigger</p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      New message
                    </p>
                  </div>
                </div>

                <ArrowRight
                  size={15}
                  className="hidden text-zinc-600 sm:block"
                />

                <div className="flex items-center gap-3 rounded-xl border border-sky-400/20 bg-sky-400/[0.045] p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-400/10 text-sky-300">
                    <Bot size={17} />
                  </span>
                  <div>
                    <p className="text-xs font-medium">AI Agent</p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Process input
                    </p>
                  </div>
                </div>

                <ArrowRight
                  size={15}
                  className="hidden text-zinc-600 sm:block"
                />

                <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300">
                    <MessageSquare size={17} />
                  </span>
                  <div>
                    <p className="text-xs font-medium">Response</p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Send reply
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 border-t border-white/[0.07] pt-4 text-xs text-zinc-500">
                <Workflow size={14} />
                Connected steps, one seamless flow.
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-between text-xs text-zinc-600">
            <span>© 2026 FlowPilot AI</span>
            <span className="flex items-center gap-2">
              <ShieldCheck size={14} />
              Private workspace
            </span>
          </div>
        </section>

        {/* Login panel */}
        <section className="flex min-h-screen flex-col bg-[#09090b]">
          <div className="flex items-center border-b border-white/[0.08] px-6 py-4 xl:hidden">
            <img
              src={flowPilotLogo}
              alt="FlowPilot AI"
              className="h-14 w-auto object-contain"
            />
          </div>

          <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
            <div className="w-full max-w-sm">
              <div className="mb-8">
                <div className="mb-6 flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-sky-300">
                  <Workflow size={21} />
                </div>

                <p className="text-xs font-medium uppercase tracking-[0.16em] text-sky-300">
                  Welcome back
                </p>

                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Sign in to FlowPilot
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Enter your credentials to access your workspace.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-zinc-200"
                  >
                    Email address
                  </label>

                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className="h-11 w-full rounded-lg border border-white/[0.12] bg-white/[0.025] px-3.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 hover:border-white/20 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/10"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-zinc-200"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      className="h-11 w-full rounded-lg border border-white/[0.12] bg-white/[0.025] py-2 pl-3.5 pr-11 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 hover:border-white/20 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/10"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-zinc-500 transition hover:text-zinc-200"
                    >
                      {showPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-400/20 bg-red-400/[0.06] px-3.5 py-3 text-sm leading-5 text-red-300"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 text-sm font-medium text-zinc-950 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <LoaderCircle size={17} className="animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 flex items-start justify-center gap-2 border-t border-white/[0.08] pt-5 text-center text-xs leading-5 text-zinc-500">
                <ShieldCheck size={15} className="mt-0.5 shrink-0" />
                <p>
                  Internal workspace. Access is restricted to authorized users.
                </p>
              </div>
            </div>
          </div>

          <footer className="px-6 py-4 text-center text-xs text-zinc-600">
            FlowPilot AI · Automation workspace
          </footer>
        </section>
      </div>
    </main>
  );
}
