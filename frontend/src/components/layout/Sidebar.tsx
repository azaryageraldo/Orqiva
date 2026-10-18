
import {
  Activity,
  CircleHelp,
  LayoutGrid,
  Settings2,
  X,
} from "lucide-react";
import flowPilotLogo from "../../assets/flowpilot-logo.png";

type Health = "checking" | "online" | "offline";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  health: Health;
  onActivityClick: () => void;
  onHelpClick: () => void;
}

const HEALTH_STYLES: Record<Health, { dot: string; label: string; text: string }> = {
  online: { dot: "bg-emerald-400", label: "Operational", text: "text-emerald-400" },
  offline: { dot: "bg-red-400", label: "Offline", text: "text-red-400" },
  checking: { dot: "bg-amber-400 animate-pulse", label: "Checking", text: "text-amber-400" },
};

export default function Sidebar({
  open,
  onClose,
  health,
  onActivityClick,
  onHelpClick,
}: SidebarProps) {
  const baseItem =
    "relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60";
  const idleItem = "text-muted-foreground hover:bg-muted hover:text-foreground";
  const activeItem = "bg-sky-500/10 text-sky-300";

  const status = HEALTH_STYLES[health];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
        <a href="/" className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center">
            <img
              src={flowPilotLogo}
              alt="FlowPilot AI"
              className="size-9 object-contain"
            />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            FlowPilot<span className="text-sky-400"> AI</span>
          </span>
        </a>

        <button
          type="button"
          aria-label="Tutup menu navigasi"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        >
          <X size={17} />
        </button>
      </div>

      {/* Navigation */}
      <nav
        aria-label="Main navigation"
        className="flex-1 overflow-y-auto px-3 py-4"
      >
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Workspace
        </p>

        <div className="space-y-1">
          <a
            href="/"
            aria-current="page"
            onClick={onClose}
            className={`${baseItem} ${activeItem}`}
          >
            <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sky-400" />
            <LayoutGrid size={17} />
            Workflows
          </a>

          <button
            type="button"
            onClick={() => {
              onClose();
              onActivityClick();
            }}
            className={`${baseItem} ${idleItem}`}
          >
            <Activity size={17} />
            Activity
          </button>
        </div>

        <p className="px-3 pb-2 pt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Preferences
        </p>

        <div className="space-y-1">
          <button
            type="button"
            onClick={() => {
              onClose();
              onHelpClick();
            }}
            className={`${baseItem} ${idleItem}`}
          >
            <CircleHelp size={17} />
            Help & Support
          </button>

          <button type="button" className={`${baseItem} ${idleItem}`}>
            <Settings2 size={17} />
            Settings
          </button>
        </div>
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className="rounded-lg border border-sidebar-border bg-background/40 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">
              Backend API
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`size-1.5 rounded-full ${status.dot}`} />
              <span className={`text-[11px] font-medium ${status.text}`}>
                {status.label}
              </span>
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground/70">
            FlowPilot AI · MVP
          </p>
        </div>
      </div>
    </aside>
  );
}
