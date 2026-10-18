
import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  LoaderCircle,
  LogOut,
  LayoutGrid,
  Menu,
} from "lucide-react";

interface HeaderProps {
  title: string;
  loggingOut: boolean;
  onLogout: () => void;
  onMenuClick: () => void;
}

const ACCOUNT = {
  name: "Azarya Geraldo",
  email: "admin@gmail.com",
  role: "Workspace admin",
  initials: "AG",
};

export default function Header({
  title,
  loggingOut,
  onLogout,
  onMenuClick,
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
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-8">
        {/* Menu + breadcrumb */}
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Buka menu navigasi"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 lg:hidden"
          >
            <Menu size={18} />
          </button>

          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 items-center gap-2 text-sm"
          >
            <LayoutGrid
              size={16}
              className="hidden shrink-0 text-muted-foreground sm:block"
            />
            <span className="hidden text-muted-foreground sm:inline">
              Workspace
            </span>
            <ChevronRight
              size={14}
              className="hidden shrink-0 text-muted-foreground/50 sm:inline"
            />
            <span className="truncate font-medium text-foreground">{title}</span>
          </nav>
        </div>

        {/* Account */}
        <div className="relative flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => setAccountOpen((open) => !open)}
            aria-label="Account menu"
            aria-expanded={accountOpen}
            className="flex items-center gap-3 rounded-lg border border-transparent py-1.5 pl-1.5 pr-2 transition-colors hover:border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-xs font-semibold text-sky-300 ring-1 ring-sky-400/25">
              {ACCOUNT.initials}
            </span>

            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-medium text-foreground">
                {ACCOUNT.name}
              </span>
              <span className="block text-xs text-muted-foreground">
                {ACCOUNT.role}
              </span>
            </span>

            <ChevronDown
              size={16}
              className={`hidden shrink-0 text-muted-foreground transition-transform sm:block ${
                accountOpen ? "rotate-180" : ""
              }`}
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

              <div className="absolute right-0 top-12 z-40 w-64 overflow-hidden rounded-xl border border-border bg-popover shadow-lg shadow-black/30">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-medium text-foreground">
                    {ACCOUNT.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {ACCOUNT.email}
                  </p>
                </div>

                <div className="p-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      onLogout();
                    }}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loggingOut ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <LogOut size={16} />
                    )}
                    {loggingOut ? "Logging out..." : "Logout"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
