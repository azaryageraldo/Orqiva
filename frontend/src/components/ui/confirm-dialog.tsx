import type { ComponentType, ReactNode } from "react";
import { Info, LoaderCircle, Trash2, TriangleAlert } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
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
  default: "bg-primary/10 text-primary ring-1 ring-primary/20",
  warning: "bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/25",
  danger: "bg-destructive/10 text-destructive ring-1 ring-destructive/25",
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
        className={cn("gap-0 p-0 sm:max-w-md", className)}
      >
        <AlertDialogHeader className="flex flex-row items-start gap-3.5 p-5 pr-10 text-left">
          <AlertDialogMedia className={TONE_MEDIA[tone]}>
            <Icon className="size-5" />
          </AlertDialogMedia>
          <div className="min-w-0 flex-1 space-y-1.5">
            <AlertDialogTitle className="text-[15px] leading-snug">
              {title}
            </AlertDialogTitle>
            {description ? (
              <AlertDialogDescription className="text-[13px] leading-5">
                {description}
              </AlertDialogDescription>
            ) : null}
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="m-0 flex flex-col-reverse gap-2 rounded-b-xl border-t border-border/60 bg-muted/30 p-3.5 sm:flex-row sm:justify-end">
          <AlertDialogCancel
            disabled={loading}
            className="h-9 px-3.5 text-[13px]"
          >
            {cancelLabel}
          </AlertDialogCancel>

          {secondaryAction ? (
            <Button
              type="button"
              variant={secondaryAction.variant ?? "outline"}
              disabled={loading || secondaryAction.disabled}
              onClick={secondaryAction.onClick}
              className="h-9 px-3.5 text-[13px]"
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
              "h-9 px-3.5 text-[13px]",
              resolvedConfirmVariant === "destructive" &&
                "bg-destructive/15 text-destructive hover:bg-destructive/25",
            )}
          >
            {loading ? <LoaderCircle className="animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
