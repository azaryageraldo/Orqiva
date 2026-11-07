import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowStatusToggleProps {
  isActive: boolean;
  isUpdating: boolean;
  onToggle: () => void;
  labelActive: string;
  labelInactive: string;
  ariaLabel: string;
}

export default function WorkflowStatusToggle({
  isActive,
  isUpdating,
  onToggle,
  labelActive,
  labelInactive,
  ariaLabel,
}: WorkflowStatusToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isActive}
      aria-label={ariaLabel}
      disabled={isUpdating}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "group/toggle inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50",
        isActive
          ? "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-400 hover:bg-emerald-500/[0.14]"
          : "border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-300",
      )}
    >
      {isUpdating ? (
        <LoaderCircle className="size-3 animate-spin text-zinc-400" />
      ) : (
        <span
          className={cn(
            "size-1.5 rounded-full transition-transform group-hover/toggle:scale-125",
            isActive
              ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
              : "bg-zinc-500",
          )}
        />
      )}
      <span>{isActive ? labelActive : labelInactive}</span>
    </button>
  );
}
