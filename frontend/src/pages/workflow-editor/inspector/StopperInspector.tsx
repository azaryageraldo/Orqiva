import { PauseCircle } from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n";

export default function StopperInspector() {
  const { t } = useI18n();

  return (
    <div className="rounded-xl border border-rose-400/15 bg-rose-400/[0.05] p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-rose-200">
        <PauseCircle size={17} /> {t("editor.pausePoint")}
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {t("editor.pauseHint")}
      </p>
    </div>
  );
}

