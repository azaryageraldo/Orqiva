import {
  Activity,
  Bot,
  Globe,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Server,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import OrqivaLogo from "@/components/brand/OrqivaLogo";
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

const MAIN_ITEMS: SidebarItem[] = [
  { labelKey: "nav.dashboard", icon: LayoutDashboard, nav: "dashboard" },
  { labelKey: "nav.workflows", icon: Bot, nav: "workflows" },
  { labelKey: "nav.inbox", icon: Inbox, nav: "inbox" },
  { labelKey: "nav.channel", icon: Globe, nav: "channel" },
  { labelKey: "nav.activity", icon: Activity, nav: "activity" },
];

const CONFIG_ITEMS: SidebarItem[] = [
  { labelKey: "nav.aiProviders", icon: Sparkles, nav: "ai-providers" },
  { labelKey: "nav.settings", icon: Settings, nav: "settings" },
  { labelKey: "nav.help", icon: LifeBuoy, nav: "help" },
];

const ITEM_CLASS =
  "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors";
const ACTIVE_CLASS =
  "bg-primary/10 text-primary border border-primary/20 shadow-sm";
const IDLE_CLASS =
  "text-muted-foreground hover:bg-accent/50 hover:text-foreground";

function SidebarSection({
  label,
  items,
  activeNav,
  onNavigate,
}: {
  label?: string;
  items: SidebarItem[];
  activeNav: NavKey;
  onNavigate: (key: NavKey) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-1">
      {label && (
        <p className="px-2.5 pt-3 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
          {label}
        </p>
      )}

      <div className="space-y-0.5">
        {items.map((item) => {
          const active = activeNav === item.nav;
          const Icon = item.icon;

          return (
            <button
              key={item.labelKey}
              type="button"
              onClick={() => onNavigate(item.nav)}
              aria-current={active ? "page" : undefined}
              className={cn(ITEM_CLASS, active ? ACTIVE_CLASS : IDLE_CLASS)}
            >
              <Icon
                size={16}
                strokeWidth={1.75}
                className={cn(
                  "shrink-0 transition-colors",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              <span className="truncate">{t(item.labelKey)}</span>
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
    <aside className="flex h-full min-h-0 w-full flex-col bg-sidebar border-r border-sidebar-border select-none">
      {/* Brand Header */}
      <div className="flex h-12 shrink-0 items-center px-4 border-b border-sidebar-border">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate("dashboard");
          }}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <OrqivaLogo showWordmark markClassName="size-6" wordmarkClassName="text-sm font-semibold tracking-tight text-foreground" />
        </a>
      </div>

      {/* Navigation Sections */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-4">
        <SidebarSection
          items={MAIN_ITEMS}
          activeNav={activeNav}
          onNavigate={onNavigate}
        />

        <SidebarSection
          label="Configuration"
          items={CONFIG_ITEMS}
          activeNav={activeNav}
          onNavigate={onNavigate}
        />
      </div>

      {/* Footer Service Status */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-card/40 px-2.5 py-2">
          <span className="relative flex size-6 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-secondary/50">
            <Server size={12} className="text-muted-foreground" />
            <span
              className={cn(
                "absolute -right-0.5 -bottom-0.5 size-2 rounded-full border-2 border-sidebar",
                status.dot,
              )}
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[9px] font-medium tracking-wider text-muted-foreground uppercase">
              System Runtime
            </p>
            <p className={cn("truncate text-[11px] font-medium leading-none", status.text)}>
              {statusLabel}
            </p>
          </div>
          <span className="shrink-0 text-[10px] font-mono text-muted-foreground">
            v{APP_VERSION}
          </span>
        </div>
      </div>
    </aside>
  );
}
