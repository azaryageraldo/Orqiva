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
      onClick={onToggle}
      className="inline-flex items-center gap-2 disabled:opacity-60"
    >
      <span
        className={[
          "relative inline-flex h-4 w-7 items-center rounded-full border transition-colors",
          isActive ? "border-primary/40 bg-primary" : "border-white/[0.14] bg-white/[0.08]",
        ].join(" ")}
      >
        <span
          className={[
            "absolute size-3 rounded-full bg-white shadow-sm transition-all",
            isActive ? "left-[13px]" : "left-[2px]",
          ].join(" ")}
        />
      </span>
      <span
        className={[
          "text-[11px] font-medium",
          isActive ? "text-primary" : "text-zinc-500",
        ].join(" ")}
      >
        {isUpdating ? (
          <span className="size-3 animate-spin" />
        ) : isActive ? (
          labelActive
        ) : (
          labelInactive
        )}
      </span>
    </button>
  );
}
