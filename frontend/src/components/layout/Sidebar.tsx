import {
  LayoutList,
  List,
  Server,
  type LucideIcon,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/constants";

export type Health = "checking" | "online" | "offline";
export type NavKey =
  | "dashboard"
  | "workflows"
  | "inbox"
  | "channel"
  | "activity"
  | "ai-providers"
  | "settings"
  | "help";

interface SidebarProps {
  health: Health;
  activeNav: NavKey;
  onNavigate: (key: NavKey) => void;
}

const HEALTH_STYLES: Record<Health, { dot: string; text: string }> = {
  online: { dot: "bg-emerald-400", text: "text-emerald-400" },
  offline: { dot: "bg-destructive", text: "text-destructive" },
  checking: { dot: "bg-amber-400 animate-pulse", text: "text-amber-400" },
};

type SidebarItem = {
  labelKey: string;
  icon: LucideIcon;
  nav: NavKey;
};

const WORKFLOW_ITEMS: SidebarItem[] = [
  { labelKey: "side.workflow", icon: LayoutList, nav: "workflows" },
  { labelKey: "side.auditLog", icon: List, nav: "activity" },
];

const ITEM_CLASS =
  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium transition-colors";
const ACTIVE_CLASS = "bg-white/[0.06] text-zinc-100";
const IDLE_CLASS =
  "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300";

function SidebarSection({
  label,
  items,
  activeNav,
  onNavigate,
}: {
  label: string;
  items: SidebarItem[];
  activeNav: NavKey;
  onNavigate: (key: NavKey) => void;
}) {
  const { t } = useI18n();

  return (
    <div>
      <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.16em] text-zinc-600 uppercase">
        {t(label)}
      </p>

      <div className="space-y-0.5">
        {items.map((item) => {
          const active = activeNav === item.nav;

          return (
            <button
              key={item.labelKey}
              type="button"
              onClick={() => onNavigate(item.nav)}
              aria-current={active ? "page" : undefined}
              className={cn(ITEM_CLASS, active ? ACTIVE_CLASS : IDLE_CLASS)}
            >
              <item.icon size={14} strokeWidth={1.5} />
              <span className="font-medium">{t(item.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Sidebar({
  health,
  activeNav,
  onNavigate,
}: SidebarProps) {
  const { t } = useI18n();
  const status = HEALTH_STYLES[health];
  const statusLabel = {
    online: t("health.operational"),
    offline: t("health.offline"),
    checking: t("health.checking"),
  }[health];

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-[#0a0b0f]">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <SidebarSection
          label="side.workflowGroup"
          items={WORKFLOW_ITEMS}
          activeNav={activeNav}
          onNavigate={onNavigate}
        />
      </div>

      <div className="border-t border-white/[0.04] px-3 py-3">
        <div className="mt-4 flex items-center gap-2 rounded-md border border-white/[0.04] bg-white/[0.02] px-2.5 py-2.5">
          <span className="relative flex size-7 shrink-0 items-center justify-center rounded-[5px] border border-white/[0.04] bg-white/[0.03]">
            <Server size={13} className="text-zinc-500" />
            <span
              className={cn(
                "absolute -right-0.5 -bottom-0.5 size-2 rounded-full border-2 border-[#0a0b0f]",
                status.dot,
              )}
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[9px] font-medium tracking-[0.14em] text-zinc-600 uppercase">
              {t("settings.serviceLabel")}
            </p>
            <p className={cn("truncate text-[11px] font-medium", status.text)}>
              {statusLabel}
            </p>
          </div>
          <span className="shrink-0 text-[9px] font-medium text-zinc-600">
            v{APP_VERSION}
          </span>
        </div>
      </div>
    </aside>
  );
}
