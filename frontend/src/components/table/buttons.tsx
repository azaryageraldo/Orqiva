import type { ButtonHTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TableActionButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size" | "variant"> {
  icon: React.ReactNode;
  label?: string;
  variant?: "ghost" | "destructive" | "default";
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function TableActionButton({
  icon,
  label,
  variant = "ghost",
  onClick,
  disabled,
  className,
  ...props
}: TableActionButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none",
        className,
      )}
      {...props}
    >
      {icon}
      {label && <span className="text-[10px]">{label}</span>}
    </Button>
  );
}

export interface TableStatusToggleProps {
  isActive: boolean;
  isUpdating: boolean;
  onToggle: () => void;
  labelActive: string;
  labelInactive: string;
  ariaLabel: string;
}

export function TableStatusToggle({
  isActive,
  isUpdating,
  onToggle,
  labelActive,
  labelInactive,
  ariaLabel,
}: TableStatusToggleProps) {
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
        className={cn(
          "relative inline-flex h-4 w-7 items-center rounded-full border transition-colors",
          isActive ? "border-primary/40 bg-primary" : "border-white/[0.14] bg-white/[0.08]",
        )}
      >
        <span
          className={cn(
            "absolute size-3 rounded-full bg-white shadow-sm transition-all",
            isActive ? "left-[13px]" : "left-[2px]",
          )}
        />
      </span>
      <span
        className={cn(
          "text-[11px] font-medium",
          isActive ? "text-primary" : "text-zinc-500",
        )}
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
