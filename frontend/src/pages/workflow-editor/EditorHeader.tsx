import { ArrowLeft, Check, LoaderCircle, Save } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface EditorHeaderProps {
  workflowName: string;
  onBack: () => void;
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;
  onSave: () => void;
}

export default function EditorHeader({
  workflowName,
  onBack,
  isDirty,
  isSaving,
  isLoading,
  onSave,
}: EditorHeaderProps) {
  const { t } = useI18n();

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      {/* Left Navigation */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onBack}
          aria-label={t("editor.workflow")}
          className="inline-flex size-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
        </button>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors truncate"
          >
            {t("editor.workflow")}
          </button>
          <span className="text-muted-foreground/40 text-xs">/</span>
          <span className="truncate text-xs font-semibold text-foreground max-w-[280px]">
            {workflowName || t("editor.title")}
          </span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Save Status Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          {isLoading ? (
            <>
              <LoaderCircle className="size-3 animate-spin text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">{t("editor.loading")}</span>
            </>
          ) : isDirty ? (
            <>
              <span className="size-1.5 rounded-full bg-amber-400" />
              <span className="text-[11px] text-amber-400 font-medium">{t("editor.unsaved")}</span>
            </>
          ) : (
            <>
              <Check className="size-3 text-emerald-400" />
              <span className="text-[11px] text-muted-foreground">{t("editor.saved")}</span>
            </>
          )}
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || isLoading || !isDirty}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-40",
            isDirty
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90"
              : "border border-border bg-muted/40 text-muted-foreground",
          )}
        >
          {isSaving ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          <span>{isSaving ? t("editor.saving") : t("editor.save")}</span>
        </button>
      </div>
    </header>
  );
}
