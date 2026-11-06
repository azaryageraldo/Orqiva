import type { ComponentType, ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "cn";

const SIZE_CLASS: Record<AppDialogSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

export type AppDialogSize = "sm" | "md" | "lg" | "xl";

export interface AppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  size?: AppDialogSize;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/**
 * Global modal shell for forms and content dialogs. It keeps the header,
 * spacing and footer identical across every menu.
 */
export default function AppDialog({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  icon: Icon,
  size = "md",
  children,
  footer,
  className,
  bodyClassName,
}: AppDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90dvh] gap-0 overflow-y-auto p-0",
          SIZE_CLASS[size],
          className,
        )}
      >
        <DialogHeader className="flex-row items-start gap-3.5 border-b border-border/60 p-5 pr-12 text-left">
          {Icon ? (
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <Icon className="size-[18px]" />
            </span>
          ) : null}
          <div className="min-w-0 flex-1 space-y-1.5">
            {eyebrow ? (
              <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                {eyebrow}
              </p>
            ) : null}
            <DialogTitle className="text-[15px] leading-snug">{title}</DialogTitle>
            {description ? (
              <DialogDescription className="text-[13px] leading-5">
                {description}
              </DialogDescription>
            ) : null}
          </div>
        </DialogHeader>

        <div className={cn("p-5", bodyClassName)}>{children}</div>

        {footer ? (
          <DialogFooter className="m-0 flex flex-col-reverse gap-2 rounded-b-xl border-t border-border/60 bg-muted/30 p-3.5 sm:flex-row sm:justify-end">
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
