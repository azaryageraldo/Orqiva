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
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#0c0d11] px-4">
      {/* Left Navigation */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onBack}
          aria-label={t("editor.workflow")}
          className="inline-flex size-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
        </button>

        <div className="h-4 w-px bg-white/10" />

        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors truncate"
          >
            {t("editor.workflow")}
          </button>
          <span className="text-zinc-600 text-xs">/</span>
          <span className="truncate text-xs font-semibold text-zinc-100 max-w-[280px]">
            {workflowName || t("editor.title")}
          </span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Save Status Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400">
          {isLoading ? (
            <>
              <LoaderCircle className="size-3 animate-spin text-zinc-500" />
              <span className="text-[11px] text-zinc-500">{t("editor.loading")}</span>
            </>
          ) : isDirty ? (
            <>
              <span className="size-1.5 rounded-full bg-amber-400" />
              <span className="text-[11px] text-amber-400/90">{t("editor.unsaved")}</span>
            </>
          ) : (
            <>
              <Check className="size-3 text-emerald-400" />
              <span className="text-[11px] text-zinc-400">{t("editor.saved")}</span>
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
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30 hover:bg-primary/90"
              : "border border-white/10 bg-white/[0.04] text-zinc-400",
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
