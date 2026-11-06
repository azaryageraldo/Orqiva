import { usePreferences, type Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LANGUAGES: Array<{
  code: Language;
  label: string;
}> = [
  { code: "id", label: "ID" },
  { code: "en", label: "EN" },
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
        "inline-flex items-center gap-0.5 rounded-md border border-white/[0.08] bg-white/[0.02] p-0.5",
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
              "inline-flex h-6 items-center rounded-[4px] px-2 text-[10px] font-semibold tracking-wide transition",
              active
                ? "bg-white/[0.09] text-zinc-100"
                : "text-zinc-500 hover:text-zinc-200",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
