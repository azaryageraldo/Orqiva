import type { ComponentType, ReactNode } from "react";
import { Info, LoaderCircle, Trash2, TriangleAlert } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
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
          "gap-0 p-0 sm:max-w-md border border-border/80 bg-background/95 dark:bg-[#0c0d12] shadow-2xl backdrop-blur-md overflow-hidden",
          className
        )}
      >
        <AlertDialogHeader className="flex flex-row items-start gap-4 p-5 sm:p-6 text-left border-b border-border/30">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              TONE_MEDIA[tone]
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <AlertDialogTitle className="text-base font-semibold leading-tight text-foreground tracking-tight">
              {title}
            </AlertDialogTitle>
            {description ? (
              <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">
                {description}
              </AlertDialogDescription>
            ) : null}
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter
          className={cn(
            "m-0 flex flex-col-reverse gap-2 sm:gap-2.5 bg-muted/20 px-5 py-4",
            secondaryAction
              ? "sm:flex-row sm:items-center sm:justify-between"
              : "sm:flex-row sm:justify-end"
          )}
        >
          <AlertDialogCancel
            disabled={loading}
            className="h-9 px-4 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {cancelLabel}
          </AlertDialogCancel>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
            {secondaryAction ? (
              <Button
                type="button"
                variant={secondaryAction.variant ?? "outline"}
                disabled={loading || secondaryAction.disabled}
                onClick={secondaryAction.onClick}
                className={cn(
                  "h-9 px-4 text-xs font-medium",
                  secondaryAction.variant === "destructive" &&
                    "border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20"
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
                "h-9 px-4 text-xs font-medium shadow-sm",
                resolvedConfirmVariant === "destructive" &&
                  "bg-destructive/15 text-destructive hover:bg-destructive/25"
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
