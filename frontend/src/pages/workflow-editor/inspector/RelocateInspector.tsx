import { Handshake } from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n";

export default function RelocateInspector() {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-teal-400/20 bg-teal-400/[0.06] p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-teal-200">
          <Handshake size={17} /> {t("editor.handoff")}
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {t("editor.handoffHint")}
        </p>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        {t("editor.relocateNote")}
      </p>
    </div>
  );
}

