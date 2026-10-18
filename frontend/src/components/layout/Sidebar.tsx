
import {
  Activity,
  CircleHelp,
  Settings2,
  Workflow,
} from "lucide-react";
import flowPilotLogo from "../../assets/Logo FlowPilot AI Bergaya Teknologi (1).png";

type Health = "checking" | "online" | "offline";

interface SidebarProps {
  health: Health;
  onActivityClick: () => void;
  onHelpClick: () => void;
}

export default function Sidebar({
  health,
  onActivityClick,
  onHelpClick,
}: SidebarProps) {
  const navClass =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors";

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-white/[0.08] bg-[#0c0c0f] text-zinc-300">
      <div className="flex h-16 items-center border-b border-white/[0.08] px-5">
        <a href="/" className="flex items-center gap-3">
          <img
            src={flowPilotLogo}
            alt="FlowPilot AI"
            className="size-45 shrink-0 object-contain"
          />
        </a>
      </div>

      <div className="px-3 pt-6">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Workspace
        </p>

        <nav aria-label="Main navigation" className="space-y-1">
          <a
            href="/"
            aria-current="page"
            className={`${navClass} border border-sky-400/15 bg-sky-400/10 font-medium text-sky-300`}
          >
            <Workflow size={17} />
            Workflows
          </a>

          <button
            type="button"
            onClick={onActivityClick}
            className={`${navClass} text-zinc-400 hover:bg-white/[0.05] hover:text-white`}
          >
            <Activity size={17} />
            Activity
          </button>
        </nav>

        <p className="px-3 pb-2 pt-8 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Preferences
        </p>

        <button
          type="button"
          onClick={onHelpClick}
          className={`${navClass} text-zinc-400 hover:bg-white/[0.05] hover:text-white`}
        >
          <CircleHelp size={17} />
          Help & Support
        </button>

        <button
          type="button"
          className={`${navClass} text-zinc-400 hover:bg-white/[0.05] hover:text-white`}
        >
          <Settings2 size={17} />
          Settings
        </button>
      </div>

      <div className="mt-auto space-y-3 p-3">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3.5">
          <div className="flex items-center gap-2">
            <span
              className={`size-2 rounded-full ${
                health === "online"
                  ? "bg-emerald-400"
                  : health === "offline"
                    ? "bg-red-400"
                    : "animate-pulse bg-amber-400"
              }`}
            />
            <span className="text-xs font-medium capitalize text-zinc-200">
              API {health}
            </span>
          </div>
          <p className="mt-1.5 pl-4 text-xs text-zinc-500">
            FlowPilot backend
          </p>
        </div>

        <div className="border-t border-white/[0.08] px-3 pt-3 text-xs text-zinc-600">
          FlowPilot AI · MVP
        </div>
      </div>
    </aside>
  );
}
