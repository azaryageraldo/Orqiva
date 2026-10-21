import {
  Activity,
  Globe2,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Server,
  Settings,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import OrqivaLogo from "@/components/brand/OrqivaLogo";
import { useI18n } from "@/lib/i18n";
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
  onDashboardClick: () => void;
  onWorkflowsClick: () => void;
  onInboxClick: () => void;
  onChannelClick: () => void;
  onActivityClick: () => void;
  onAiProvidersClick: () => void;
  onHelpClick: () => void;
  onSettingsClick: () => void;
}

const HEALTH_STYLES: Record<Health, { dot: string; text: string }> = {
  online: { dot: "bg-emerald-400", text: "text-emerald-400" },
  offline: { dot: "bg-destructive", text: "text-destructive" },
  checking: { dot: "bg-amber-400 animate-pulse", text: "text-amber-400" },
};

const MENU_BUTTON =
  "relative h-10 gap-3 rounded-xl px-3 text-[13px] font-medium text-sidebar-foreground/70 transition-all duration-200 before:pointer-events-none before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-primary before:opacity-0 before:transition-opacity [&_svg]:size-[18px] hover:bg-sidebar-accent/60 hover:text-sidebar-foreground data-active:bg-primary/10 data-active:font-semibold data-active:text-primary data-active:before:opacity-100";

const GROUP_LABEL =
  "mb-1.5 h-6 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/40";

const MAIN_NAV: Array<{
  key: NavKey;
  labelKey: string;
  icon: LucideIcon;
}> = [
  { key: "dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { key: "workflows", labelKey: "nav.workflows", icon: Workflow },
  { key: "inbox", labelKey: "nav.inbox", icon: Inbox },
  { key: "channel", labelKey: "nav.channel", icon: Globe2 },
  { key: "activity", labelKey: "nav.activity", icon: Activity },
];

const PREFERENCES_NAV: Array<{
  key: NavKey;
  labelKey: string;
  icon: LucideIcon;
}> = [
  { key: "ai-providers", labelKey: "nav.apiKeys", icon: KeyRound },
  { key: "settings", labelKey: "nav.settings", icon: Settings },
  { key: "help", labelKey: "nav.help", icon: LifeBuoy },
];

export default function Sidebar({
  health,
  activeNav,
  onDashboardClick,
  onWorkflowsClick,
  onInboxClick,
  onChannelClick,
  onActivityClick,
  onAiProvidersClick,
  onHelpClick,
  onSettingsClick,
}: SidebarProps) {
  const { t } = useI18n();
  const { isMobile, setOpenMobile } = useSidebar();
  const status = HEALTH_STYLES[health];
  const statusLabel = {
    online: t("health.operational"),
    offline: t("health.offline"),
    checking: t("health.checking"),
  }[health];
  const navHandlers: Record<NavKey, () => void> = {
    dashboard: onDashboardClick,
    workflows: onWorkflowsClick,
    inbox: onInboxClick,
    channel: onChannelClick,
    activity: onActivityClick,
    "ai-providers": onAiProvidersClick,
    settings: onSettingsClick,
    help: onHelpClick,
  };
  const runNav = (handler: () => void) => () => {
    handler();
    if (isMobile) setOpenMobile(false);
  };

  return (
    <SidebarRoot collapsible="offcanvas">
      <SidebarHeader className="h-16 justify-center border-b border-sidebar-border/70 px-4">
        <a
          href="/"
          aria-label="Orqiva"
          className="group flex w-fit items-center"
        >
          <span className="relative flex size-10 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent shadow-[0_10px_30px_-12px_var(--primary)] transition-transform duration-200 group-hover:scale-[1.04]">
            <OrqivaLogo
              showWordmark={false}
              markClassName="size-8 drop-shadow-[0_0_10px_rgba(56,189,248,0.35)]"
            />
            <span
              title={statusLabel}
              className={`absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-sidebar ${status.dot}`}
            />
          </span>
        </a>
      </SidebarHeader>

      <SidebarContent className="py-3">
        <SidebarGroup className="px-3 py-1">
          <SidebarGroupLabel className={GROUP_LABEL}>
            {t("nav.workspace")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {MAIN_NAV.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    isActive={activeNav === item.key}
                    onClick={runNav(navHandlers[item.key])}
                    className={MENU_BUTTON}
                  >
                    <item.icon />
                    <span>{t(item.labelKey)}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mx-3 my-3 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />

        <SidebarGroup className="px-3 py-1">
          <SidebarGroupLabel className={GROUP_LABEL}>
            {t("nav.preferences")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {PREFERENCES_NAV.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    isActive={activeNav === item.key}
                    onClick={runNav(navHandlers[item.key])}
                    className={MENU_BUTTON}
                  >
                    <item.icon />
                    <span>{t(item.labelKey)}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70 p-3">
        <div className="rounded-2xl border border-sidebar-border/80 bg-gradient-to-br from-sidebar-accent/40 to-transparent p-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-background/50 ring-1 ring-sidebar-border">
              <Server className="size-4 text-muted-foreground" />
              <span
                className={`absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-sidebar ${status.dot}`}
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/60">
                Backend API
              </p>
              <p className={`truncate text-xs font-medium ${status.text}`}>
                {statusLabel}
              </p>
            </div>
            <span className="shrink-0 rounded-md border border-sidebar-border/80 bg-background/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/70">
              v{APP_VERSION}
            </span>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </SidebarRoot>
  );
}
