import { usePreferences, type Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LANGUAGES: Array<{
  code: Language;
  label: string;
  flag: string;
}> = [
  { code: "id", label: "ID", flag: "🇮🇩" },
  { code: "en", label: "EN", flag: "🇬🇧" },
];

interface PreferenceControlsProps {
  className?: string;
}

export default function PreferenceControls({
  className,
}: PreferenceControlsProps) {
  const { language, setLanguage, t } = usePreferences();

  return (
    <div
      role="group"
      aria-label={t("pref.language")}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border bg-background/60 p-0.5",
        className,
      )}
    >
      {LANGUAGES.map((item) => {
        const active = language === item.code;

        return (
          <button
            key={item.code}
            type="button"
            onClick={() => setLanguage(item.code)}
            aria-pressed={active}
            title={`${t("pref.toggleLanguage")}: ${item.label}`}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold transition",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span aria-hidden="true" className="text-[13px] leading-none">
              {item.flag}
            </span>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
