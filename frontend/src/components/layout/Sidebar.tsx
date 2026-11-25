import { useState } from "react";
import {
  BookOpen,
  BrainCircuit,
  Database,
  GitFork,
  LayoutDashboard,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  ScrollText,
  Server,
  SlidersHorizontal,
  Table2,
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
  | "datapoints"
  | "data"
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
  collapsed?: boolean;
  onToggleCollapse?: () => void;
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
  badge?: string;
};

const WORKSPACE_ITEMS: SidebarItem[] = [
  { labelKey: "nav.dashboard", icon: LayoutDashboard, nav: "dashboard" },
  { labelKey: "nav.workflows", icon: GitFork, nav: "workflows" },
  { labelKey: "nav.datapoints", icon: Database, nav: "datapoints", badge: "Beta" },
];

const DATA_ITEMS: SidebarItem[] = [
  { labelKey: "nav.data", icon: Table2, nav: "data", badge: "Beta" },
];

const CONVERSATION_ITEMS: SidebarItem[] = [
  { labelKey: "nav.inbox", icon: MessagesSquare, nav: "inbox" },
  { labelKey: "nav.activity", icon: ScrollText, nav: "activity" },
];

const CHANNEL_ITEMS: SidebarItem[] = [
  { labelKey: "nav.channel", icon: Radio, nav: "channel" },
];

const CONFIG_ITEMS: SidebarItem[] = [
  { labelKey: "nav.aiProviders", icon: BrainCircuit, nav: "ai-providers" },
  { labelKey: "nav.settings", icon: SlidersHorizontal, nav: "settings" },
];

const HELP_ITEM: SidebarItem = {
  labelKey: "nav.help",
  icon: BookOpen,
  nav: "help",
};

interface TooltipState {
  label: string;
  badge?: string;
  top: number;
}

function SidebarSection({
  label,
  items,
  activeNav,
  collapsed,
  showDivider = false,
  onNavigate,
  onHoverItem,
}: {
  label?: string;
  items: SidebarItem[];
  activeNav: NavKey;
  collapsed: boolean;
  showDivider?: boolean;
  onNavigate: (key: NavKey) => void;
  onHoverItem: (tooltip: TooltipState | null) => void;
}) {
  const { t } = useI18n();

  return (
    <div className={cn("space-y-1", collapsed && showDivider && "border-t border-sidebar-border/70 pt-2")}>
      {label && !collapsed && (
        <p className="px-2.5 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
          {label}
        </p>
      )}

      <div className={cn("space-y-0.5", collapsed && "flex flex-col items-center gap-1 space-y-0")}>
        {items.map((item) => {
          const active = activeNav === item.nav;
          const Icon = item.icon;
          const title = t(item.labelKey);

          return (
            <button
              key={item.labelKey}
              type="button"
              onClick={() => onNavigate(item.nav)}
              onMouseEnter={(e) => {
                if (!collapsed) return;
                const rect = e.currentTarget.getBoundingClientRect();
                onHoverItem({ label: title, badge: item.badge, top: rect.top + rect.height / 2 });
              }}
              onMouseLeave={() => collapsed && onHoverItem(null)}
              aria-current={active ? "page" : undefined}
              aria-label={collapsed ? title : undefined}
              className={cn(
                "group relative flex items-center rounded-lg text-left text-xs font-medium transition-colors outline-none",
                collapsed
                  ? "size-9 justify-center p-0"
                  : "w-full gap-2.5 px-2.5 py-2",
                active
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                  : "border border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <Icon
                size={16}
                strokeWidth={1.5}
                className={cn(
                  "shrink-0 transition-colors",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              {!collapsed && (
                <>
                  <span className="truncate flex-1">{title}</span>
                  {item.badge && (
                    <span className="shrink-0 rounded px-1.5 py-0.2 text-[9px] font-mono font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
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
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const { t } = useI18n();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const status = HEALTH_STYLES[health];
  const statusLabel = {
    online: t("health.operational"),
    offline: t("health.offline"),
    checking: t("health.checking"),
  }[health];

  return (
    <aside
      className={cn(
        "relative flex h-full min-h-0 flex-col bg-sidebar border-r border-sidebar-border select-none transition-all duration-200",
        collapsed ? "w-14" : "w-56",
      )}
    >
      {/* Brand Header */}
      <div
        className={cn(
          "flex h-12 shrink-0 items-center border-b border-sidebar-border",
          collapsed ? "justify-center px-2" : "justify-between px-3.5",
        )}
      >
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate("dashboard");
          }}
          aria-label="Orqiva Dashboard"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90 min-w-0"
        >
          <OrqivaLogo
            showWordmark={!collapsed}
            markClassName="size-6 shrink-0"
            wordmarkClassName="text-sm font-semibold tracking-tight text-foreground truncate"
          />
        </a>
      </div>

      {/* Navigation Sections */}
      <div className={cn("min-h-0 flex-1 overflow-y-auto", collapsed ? "px-2 py-2.5 space-y-2" : "px-3 py-3 space-y-3.5")}>
        <SidebarSection
          label="Workspace"
          items={WORKSPACE_ITEMS}
          activeNav={activeNav}
          collapsed={collapsed}
          onNavigate={onNavigate}
          onHoverItem={setTooltip}
        />

        <SidebarSection
          label="Data"
          items={DATA_ITEMS}
          activeNav={activeNav}
          collapsed={collapsed}
          showDivider
          onNavigate={onNavigate}
          onHoverItem={setTooltip}
        />

        <SidebarSection
          label="Conversations"
          items={CONVERSATION_ITEMS}
          activeNav={activeNav}
          collapsed={collapsed}
          showDivider
          onNavigate={onNavigate}
          onHoverItem={setTooltip}
        />

        <SidebarSection
          label="Channels"
          items={CHANNEL_ITEMS}
          activeNav={activeNav}
          collapsed={collapsed}
          showDivider
          onNavigate={onNavigate}
          onHoverItem={setTooltip}
        />

        <SidebarSection
          label="Configuration"
          items={CONFIG_ITEMS}
          activeNav={activeNav}
          collapsed={collapsed}
          showDivider
          onNavigate={onNavigate}
          onHoverItem={setTooltip}
        />
      </div>

      {/* Footer Utility & Runtime Status */}
      <div className={cn("shrink-0 border-t border-sidebar-border", collapsed ? "flex flex-col items-center gap-1.5 p-2" : "space-y-1.5 p-3")}>
        {/* Help & Documentation */}
        <button
          type="button"
          onClick={() => onNavigate(HELP_ITEM.nav)}
          onMouseEnter={(e) => {
            if (!collapsed) return;
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltip({ label: t(HELP_ITEM.labelKey), top: rect.top + rect.height / 2 });
          }}
          onMouseLeave={() => collapsed && setTooltip(null)}
          aria-current={activeNav === HELP_ITEM.nav ? "page" : undefined}
          aria-label={collapsed ? t(HELP_ITEM.labelKey) : undefined}
          className={cn(
            "group relative flex items-center rounded-lg text-left text-xs font-medium transition-colors outline-none",
            collapsed ? "size-9 justify-center p-0" : "w-full gap-2.5 px-2.5 py-2",
            activeNav === HELP_ITEM.nav
              ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
              : "border border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
          )}
        >
          <BookOpen
            size={16}
            strokeWidth={1.5}
            className={cn(
              "shrink-0 transition-colors",
              activeNav === HELP_ITEM.nav ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
            )}
          />
          {!collapsed && <span className="truncate flex-1">{t(HELP_ITEM.labelKey)}</span>}
        </button>

        {/* Collapse / Expand Sidebar Toggle */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={() => {
              setTooltip(null);
              onToggleCollapse();
            }}
            onMouseEnter={(e) => {
              if (!collapsed) return;
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltip({ label: "Expand sidebar (⌘B)", top: rect.top + rect.height / 2 });
            }}
            onMouseLeave={() => collapsed && setTooltip(null)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "group flex items-center rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground outline-none",
              collapsed ? "size-9 justify-center p-0" : "w-full gap-2.5 px-2.5 py-2",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen size={16} strokeWidth={1.5} className="shrink-0" />
            ) : (
              <>
                <PanelLeftClose size={16} strokeWidth={1.5} className="shrink-0" />
                <span className="truncate flex-1 text-left">Collapse</span>
                <kbd className="rounded border border-border bg-muted/50 px-1 font-mono text-[9px] text-muted-foreground">
                  ⌘B
                </kbd>
              </>
            )}
          </button>
        )}

        {/* System Runtime Status */}
        <div
          onMouseEnter={(e) => {
            if (!collapsed) return;
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltip({
              label: `System Runtime: ${statusLabel} (v${APP_VERSION})`,
              top: rect.top + rect.height / 2,
            });
          }}
          onMouseLeave={() => collapsed && setTooltip(null)}
          className={cn(
            "flex items-center rounded-lg border border-sidebar-border bg-card/40 transition-colors",
            collapsed ? "size-9 justify-center p-0" : "gap-2 px-2.5 py-2",
          )}
        >
          <span className="relative flex size-6 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-secondary/50">
            <Server size={12} className="text-muted-foreground" />
            <span
              className={cn(
                "absolute -right-0.5 -bottom-0.5 size-2 rounded-full border-2 border-sidebar",
                status.dot,
              )}
            />
          </span>
          {!collapsed && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Floating Tooltip for Collapsed Rail */}
      {collapsed && tooltip && (
        <div
          style={{ top: tooltip.top, left: 62 }}
          className="pointer-events-none fixed z-[999] -translate-y-1/2 flex items-center gap-1.5 rounded-md border border-border bg-card/95 backdrop-blur-md px-2.5 py-1 text-xs font-medium text-foreground shadow-xl whitespace-nowrap"
        >
          <span>{tooltip.label}</span>
          {tooltip.badge && (
            <span className="rounded px-1 text-[9px] font-mono font-semibold uppercase bg-primary/15 text-primary">
              {tooltip.badge}
            </span>
          )}
        </div>
      )}
    </aside>
  );
}
