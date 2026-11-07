import { BoxSelect, Plus, Trash2, Wand2 } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface CanvasToolbarProps {
  blockMode: boolean;
  onTidy: () => void;
  onToggleBlockMode: () => void;
  onDeleteSelected: () => void;
  onOpenLibrary?: () => void;
  selectedCount: number;
  isLoading: boolean;
  isDisabled: boolean;
}

export default function CanvasToolbar({
  blockMode,
  onTidy,
  onToggleBlockMode,
  onDeleteSelected,
  onOpenLibrary,
  selectedCount,
  isLoading,
  isDisabled,
}: CanvasToolbarProps) {
  const { t } = useI18n();

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0e0f12]/90 backdrop-blur-md p-1 shadow-2xl shadow-black/60">
      {onOpenLibrary && (
        <>
          <button
            type="button"
            onClick={onOpenLibrary}
            disabled={isLoading}
            className="inline-flex h-7 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Plus className="size-3.5" />
            <span>Tambah Langkah</span>
          </button>
          <div className="h-4 w-px bg-white/10 mx-0.5" />
        </>
      )}

      <Tooltip>
        <TooltipTrigger>
          <button
            type="button"
            onClick={onTidy}
            disabled={isLoading || isDisabled}
            aria-label={t("editor.tidy")}
            className="inline-flex size-7 items-center justify-center rounded-md text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
          >
            <Wand2 className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t("editor.tidy")}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <button
            type="button"
            onClick={onToggleBlockMode}
            disabled={isLoading || isDisabled}
            aria-pressed={blockMode}
            aria-label={t("editor.blockSelect")}
            className={`inline-flex size-7 items-center justify-center rounded-md transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
              blockMode
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            }`}
          >
            <BoxSelect className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {blockMode ? t("editor.blockModeActive") : t("editor.blockSelect")}
        </TooltipContent>
      </Tooltip>

      {selectedCount > 0 && (
        <>
          <div className="h-4 w-px bg-white/10 mx-0.5" />
          <Tooltip>
            <TooltipTrigger>
              <button
                type="button"
                onClick={onDeleteSelected}
                disabled={isLoading || isDisabled}
                aria-label={t("editor.deleteSelected")}
                className="inline-flex size-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/15 transition-colors"
              >
                <Trash2 className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t("editor.deleteSelected")} ({selectedCount})
            </TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}
