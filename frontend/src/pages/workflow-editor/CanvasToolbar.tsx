import { BoxSelect, Trash2, Wand2 } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface CanvasToolbarProps {
  blockMode: boolean;
  onTidy: () => void;
  onToggleBlockMode: () => void;
  onDeleteSelected: () => void;
  selectedCount: number;
  isLoading: boolean;
  isDisabled: boolean;
}

/**
 * Centered toolbar card at top of canvas.
 * Icon-only buttons: Rapikan (Wand2), block mode toggle (BoxSelect), hapus yang dipilih (Trash2).
 */
export default function CanvasToolbar({
  blockMode,
  onTidy,
  onToggleBlockMode,
  onDeleteSelected,
  selectedCount,
  isLoading,
  isDisabled,
}: CanvasToolbarProps) {
  const { t } = useI18n();

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-xl border border-border bg-card/95 backdrop-blur px-3 py-2 shadow-lg">
      <Tooltip>
        <TooltipTrigger>
          <Button
            type="button"
            onClick={onTidy}
            disabled={isLoading || isDisabled}
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label={t("editor.tidy")}
          >
            <Wand2 size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t("editor.tidy")}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <Button
            type="button"
            onClick={onToggleBlockMode}
            disabled={isLoading || isDisabled}
            variant={blockMode ? "default" : "outline"}
            size="icon"
            className={`h-8 w-8 ${
              blockMode
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
            aria-pressed={blockMode}
            aria-label={t("editor.blockSelect")}
          >
            <BoxSelect size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {blockMode ? t("editor.blockModeActive") : t("editor.blockSelect")}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <Button
            type="button"
            onClick={onDeleteSelected}
            disabled={isLoading || isDisabled || selectedCount === 0}
            variant="destructive"
            size="icon"
            className="h-8 w-8"
            aria-label={t("editor.deleteSelected")}
          >
            <Trash2 size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t("editor.deleteSelected")}</TooltipContent>
      </Tooltip>
    </div>
  );
}
