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
      className="inline-flex items-center gap-2 text-xs font-normal text-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className={cn(
          "relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border transition-colors",
          isActive
            ? "border-primary bg-primary"
            : "border-white/20 bg-white/10",
        )}
      >
        <span
          className={cn(
            "inline-block size-3 rounded-full bg-white transition-transform",
            isActive ? "translate-x-3.5" : "translate-x-0.5",
          )}
        />
      </span>
      <span className="text-[11px] text-zinc-400">
        {isUpdating ? (
          <LoaderCircle className="size-3 animate-spin text-zinc-500" />
        ) : isActive ? (
          labelActive
        ) : (
          labelInactive
        )}
      </span>
    </button>
  );
}
