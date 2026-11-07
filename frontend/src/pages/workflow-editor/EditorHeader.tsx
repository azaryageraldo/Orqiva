import { ArrowLeft, Save } from "lucide-react";

import { useI18n } from "@/lib/i18n";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

export interface EditorHeaderProps {
  workflowName: string;
  onBack: () => void;
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;
  onSave: () => void;
}

/**
 * Editor header with breadcrumb navigation, subtitle meta, dirty indicator, and Save.
 * No status toggle, no "Semua workflow" text button.
 */
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
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-5 py-3.5 lg:px-7">
      <div className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className={`${buttonClass} border border-border bg-muted/50 text-muted-foreground hover:bg-muted`}
          aria-label={t("editor.workflow")}
        >
          <ArrowLeft size={16} />
        </button>

        <div className="h-8 w-px bg-muted" />

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={onBack}
              className="truncate transition hover:text-foreground"
            >
              {t("editor.workflow")}
            </button>
            <span className="text-muted-foreground/50">›</span>
            <span className="truncate font-medium text-foreground">
              {workflowName || t("editor.title")}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
          <span
            className={`size-1.5 rounded-full ${
              isDirty ? "bg-amber-400" : "bg-emerald-400"
            }`}
          />
          {isLoading ? t("editor.loading") : isDirty ? t("editor.unsaved") : t("editor.saved")}
        </span>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || isLoading || !isDirty}
          className={`${buttonClass} bg-primary text-primary-foreground hover:bg-primary`}
        >
          <Save size={16} />
          {isSaving ? t("editor.saving") : t("editor.save")}
        </button>
      </div>
    </header>
  );
}
