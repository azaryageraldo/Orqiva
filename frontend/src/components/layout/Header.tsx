
import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  LoaderCircle,
  LogOut,
  Workflow,
} from "lucide-react";

interface HeaderProps {
  title: string;
  loggingOut: boolean;
  onLogout: () => void;
}

export default function Header({
  title,
  loggingOut,
  onLogout,
}: HeaderProps) {
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#09090b]/85 backdrop-blur-xl">
      <div className="flex min-h-16 items-center justify-between gap-4 px-5 sm:px-8">
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-2 text-sm"
        >
          <Workflow size={16} className="shrink-0 text-zinc-500" />
          <span className="hidden text-zinc-500 sm:inline">
            Workspace
          </span>
          <ChevronRight size={14} className="shrink-0 text-zinc-600" />
          <span className="truncate font-medium text-zinc-100">
            {title}
          </span>
        </nav>

        <div className="relative flex shrink-0 items-center gap-3">
          <div className="hidden items-center gap-2.5 sm:flex">
            <div className="flex size-8 items-center justify-center rounded-full border border-sky-400/20 bg-sky-400/10 text-xs font-semibold text-sky-300">
              AG
            </div>

            <div className="leading-tight">
              <p className="text-sm font-medium text-zinc-200">
                Azarya Geraldo
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Workspace admin
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAccountOpen((open) => !open)}
            aria-label="Account menu"
            aria-expanded={accountOpen}
            className="flex size-9 items-center justify-center rounded-lg border border-white/[0.08] text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
          >
            <ChevronDown
              size={16}
              className={`transition-transform ${accountOpen ? "rotate-180" : ""}`}
            />
          </button>

          {accountOpen && (
            <>
              <button
                type="button"
                aria-label="Close account menu"
                className="fixed inset-0 z-30 cursor-default"
                onClick={() => setAccountOpen(false)}
              />

              <div className="absolute right-0 top-12 z-40 w-60 rounded-xl border border-white/[0.1] bg-[#111114] p-1.5 shadow-2xl shadow-black/40">
                <div className="border-b border-white/[0.08] px-3 py-3">
                  <p className="text-sm font-medium text-zinc-100">
                    Azarya Geraldo
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Workspace admin
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAccountOpen(false);
                    onLogout();
                  }}
                  disabled={loggingOut}
                  className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-zinc-300 transition hover:bg-red-400/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loggingOut ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <LogOut size={16} />
                  )}
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
