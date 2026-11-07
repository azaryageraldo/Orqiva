import { ChatCircleDots } from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n";
import { panelClass } from "./styles";

export default function TriggerInspector() {
  const { t } = useI18n();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-foreground">
          {t("editor.triggerTitle")}
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {t("editor.triggerDescription")}
        </p>
      </div>

      <div className={`${panelClass} p-3.5`}>
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ChatCircleDots size={16} className="text-primary" />
          {t("editor.customerMessage")}
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {t("editor.triggerTokenHint", {
            message: "{{customer_message}}",
            name: "{{customer_name}}",
          })}
        </p>
      </div>

      <p className="text-xs leading-5 text-muted-foreground">
        {t("editor.triggerNote")}
      </p>
    </div>
  );
}

