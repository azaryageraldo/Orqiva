import type { ComponentType, ReactNode } from "react";
import { Info, LoaderCircle, Trash2, TriangleAlert } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

export type ConfirmDialogTone = "default" | "warning" | "danger";

export type ConfirmDialogAction = {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "destructive" | "ghost" | "secondary";
  disabled?: boolean;
};

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  tone?: ConfirmDialogTone;
  cancelLabel?: string;
  confirmLabel: string;
  onConfirm: () => void;
  confirmVariant?: "default" | "destructive";
  loading?: boolean;
  secondaryAction?: ConfirmDialogAction;
  className?: string;
}

const TONE_MEDIA: Record<ConfirmDialogTone, string> = {
  default: "bg-primary/10 text-primary border border-primary/20",
  warning: "bg-amber-500/10 text-amber-400 border border-amber-500/25",
  danger: "bg-destructive/10 text-destructive border border-destructive/25",
};

const TONE_ICON: Record<ConfirmDialogTone, ComponentType<{ className?: string }>> =
  {
    default: Info,
    warning: TriangleAlert,
    danger: Trash2,
  };

/**
 * Global confirmation modal. Keep every destructive/leave confirmation on this
 * component so dialogs stay consistent across menus.
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  tone = "default",
  cancelLabel = "Cancel",
  confirmLabel,
  onConfirm,
  confirmVariant,
  loading = false,
  secondaryAction,
  className,
}: ConfirmDialogProps) {
  const Icon = icon ?? TONE_ICON[tone];
  const resolvedConfirmVariant =
    confirmVariant ?? (tone === "danger" ? "destructive" : "default");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={cn(
          "w-[calc(100%-2rem)] max-w-[520px] rounded-2xl border border-white/10 bg-[#0e1015] p-0 shadow-2xl shadow-black/80 overflow-hidden",
          className
        )}
      >
        <div className="flex items-start gap-4 p-6 sm:p-7">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              TONE_MEDIA[tone]
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <AlertDialogTitle className="text-base font-semibold leading-snug tracking-tight text-zinc-100">
              {title}
            </AlertDialogTitle>
            {description ? (
              <div className="text-sm text-zinc-400 leading-relaxed">
                {description}
              </div>
            ) : null}
          </div>
        </div>

        <AlertDialogFooter
          className={cn(
            "border-t border-white/10 bg-white/[0.02] px-6 py-4",
            secondaryAction
              ? "sm:flex-row sm:items-center sm:justify-between"
              : "sm:flex-row sm:justify-end"
          )}
        >
          <AlertDialogCancel
            disabled={loading}
            className="h-9 px-4 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-white/10 bg-transparent shrink-0"
          >
            {cancelLabel}
          </AlertDialogCancel>

          <div className="flex items-center justify-end gap-2.5 shrink-0">
            {secondaryAction ? (
              <Button
                type="button"
                variant={secondaryAction.variant ?? "outline"}
                disabled={loading || secondaryAction.disabled}
                onClick={secondaryAction.onClick}
                className={cn(
                  "h-9 px-3.5 text-xs font-medium shrink-0",
                  secondaryAction.variant === "destructive" &&
                    "border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200"
                )}
              >
                {secondaryAction.label}
              </Button>
            ) : null}

            <Button
              type="button"
              variant={resolvedConfirmVariant}
              disabled={loading}
              onClick={onConfirm}
              className={cn(
                "h-9 px-4 text-xs font-medium shrink-0 shadow-sm",
                resolvedConfirmVariant === "default" &&
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                resolvedConfirmVariant === "destructive" &&
                  "border border-rose-500/30 bg-rose-500/20 text-rose-200 hover:bg-rose-500/30"
              )}
            >
              {loading ? (
                <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
              ) : null}
              {confirmLabel}
            </Button>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
