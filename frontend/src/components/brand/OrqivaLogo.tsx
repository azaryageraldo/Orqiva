import { cn } from "@/lib/utils";

import orqivaMark from "@/assets/orqiva-mark.png";

interface OrqivaLogoProps {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
  showTagline?: boolean;
  wordmarkClassName?: string;
  taglineClassName?: string;
}

export default function OrqivaLogo({
  className,
  markClassName,
  showWordmark = true,
  showTagline = false,
  wordmarkClassName,
  taglineClassName,
}: OrqivaLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <img
        src={orqivaMark}
        alt="Orqiva"
        className={cn("size-9 shrink-0 object-contain", markClassName)}
      />

      {(showWordmark || showTagline) && (
        <span className="min-w-0">
          {showWordmark && (
            <span
              className={cn(
                "block truncate text-base font-semibold tracking-tight",
                wordmarkClassName,
              )}
            >
              Orqiva
            </span>
          )}
          {showTagline && (
            <span
              className={cn(
                "mt-0.5 block text-[11px] leading-4 text-muted-foreground",
                taglineClassName,
              )}
            >
              Connect Intelligence. Automate Everything.
            </span>
          )}
        </span>
      )}
    </span>
  );
}
