import {
  Activity,
  Globe2,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
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
  SidebarSeparator,
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
  "h-10 gap-3 rounded-lg px-3 text-sm [&_svg]:size-[18px] data-active:bg-sidebar-primary/15 data-active:font-semibold data-active:text-sidebar-primary";

const NAV_ITEMS: Array<{
  key: NavKey;
  labelKey: string;
  icon: LucideIcon;
}> = [
  { key: "dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { key: "workflows", labelKey: "nav.workflows", icon: Workflow },
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
      <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-3">
        <a href="/" className="flex items-center gap-3 overflow-hidden">
          <OrqivaLogo wordmarkClassName="text-base" />
        </a>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-3 py-3">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {NAV_ITEMS.filter((item) => item.key === "dashboard").map((item) => (
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

        <SidebarSeparator />

        <SidebarGroup className="px-3 py-3">
          <SidebarGroupLabel className="mb-1 h-7 px-3 text-[11px] font-semibold uppercase tracking-[0.12em]">
            {t("nav.workspace")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {NAV_ITEMS.filter((item) => item.key === "workflows").map((item) => (
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

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeNav === "inbox"}
                  onClick={runNav(onInboxClick)}
                  className={MENU_BUTTON}
                >
                  <Inbox />
                  <span>{t("nav.inbox")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeNav === "channel"}
                  onClick={runNav(onChannelClick)}
                  className={MENU_BUTTON}
                >
                  <Globe2 />
                  <span>{t("nav.channel")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeNav === "activity"}
                  onClick={runNav(onActivityClick)}
                  className={MENU_BUTTON}
                >
                  <Activity />
                  <span>{t("nav.activity")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup className="px-3 py-3">
          <SidebarGroupLabel className="mb-1 h-7 px-3 text-[11px] font-semibold uppercase tracking-[0.12em]">
            {t("nav.preferences")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeNav === "ai-providers"}
                  onClick={runNav(onAiProvidersClick)}
                  className={MENU_BUTTON}
                >
                  <KeyRound />
                  <span>{t("nav.apiKeys")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeNav === "settings"}
                  onClick={runNav(onSettingsClick)}
                  className={MENU_BUTTON}
                >
                  <Settings />
                  <span>{t("nav.settings")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeNav === "help"}
                  onClick={runNav(onHelpClick)}
                  className={MENU_BUTTON}
                >
                  <LifeBuoy />
                  <span>{t("nav.help")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="rounded-xl border border-sidebar-border bg-background/40 px-3.5 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Backend API
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`size-1.5 rounded-full ${status.dot}`} />
              <span className={`text-xs font-medium ${status.text}`}>
                {statusLabel}
              </span>
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground/70">
            Orqiva v{APP_VERSION}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-muted-foreground/60">
            {t("footer.tagline")}
          </p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </SidebarRoot>
  );
}
