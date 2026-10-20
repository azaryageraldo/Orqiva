import {
  Activity,
  Inbox,
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
import flowPilotLogo from "../../assets/flowpilot-logo.png";

export type Health = "checking" | "online" | "offline";
export type NavKey = "dashboard" | "workflows" | "inbox" | "activity" | "settings";

interface SidebarProps {
  health: Health;
  activeNav: NavKey;
  onDashboardClick: () => void;
  onWorkflowsClick: () => void;
  onInboxClick: () => void;
  onActivityClick: () => void;
  onHelpClick: () => void;
  onSettingsClick: () => void;
}

const HEALTH_STYLES: Record<Health, { dot: string; label: string; text: string }> = {
  online: { dot: "bg-emerald-400", label: "Operational", text: "text-emerald-400" },
  offline: { dot: "bg-destructive", label: "Offline", text: "text-destructive" },
  checking: { dot: "bg-amber-400 animate-pulse", label: "Checking", text: "text-amber-400" },
};

const MENU_BUTTON =
  "h-10 gap-3 rounded-lg px-3 text-sm [&_svg]:size-[18px] data-active:bg-sidebar-primary/15 data-active:font-semibold data-active:text-sidebar-primary";

const NAV_ITEMS: Array<{
  key: NavKey;
  label: string;
  icon: LucideIcon;
}> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "workflows", label: "Workflows", icon: Workflow },
];

export default function Sidebar({
  health,
  activeNav,
  onDashboardClick,
  onWorkflowsClick,
  onInboxClick,
  onActivityClick,
  onHelpClick,
  onSettingsClick,
}: SidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const status = HEALTH_STYLES[health];
  const navHandlers: Record<NavKey, () => void> = {
    dashboard: onDashboardClick,
    workflows: onWorkflowsClick,
    inbox: onInboxClick,
    activity: onActivityClick,
    settings: onSettingsClick,
  };
  const runNav = (handler: () => void) => () => {
    handler();
    if (isMobile) setOpenMobile(false);
  };

  return (
    <SidebarRoot collapsible="offcanvas">
      <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-3">
        <a href="/" className="flex items-center gap-3 overflow-hidden">
          <span className="flex size-9 shrink-0 items-center justify-center">
            <img
              src={flowPilotLogo}
              alt="FlowPilot AI"
              className="size-9 object-contain"
            />
          </span>
          <span className="truncate text-base font-semibold tracking-tight">
            FlowPilot<span className="text-sidebar-primary"> AI</span>
          </span>
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
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup className="px-3 py-3">
          <SidebarGroupLabel className="mb-1 h-7 px-3 text-[11px] font-semibold uppercase tracking-[0.12em]">
            Workspace
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
                    <span>{item.label}</span>
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
                  <span>Inbox</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeNav === "activity"}
                  onClick={runNav(onActivityClick)}
                  className={MENU_BUTTON}
                >
                  <Activity />
                  <span>Activity</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup className="px-3 py-3">
          <SidebarGroupLabel className="mb-1 h-7 px-3 text-[11px] font-semibold uppercase tracking-[0.12em]">
            Preferences
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton onClick={runNav(onHelpClick)} className={MENU_BUTTON}>
                  <LifeBuoy />
                  <span>Help &amp; Support</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeNav === "settings"}
                  onClick={runNav(onSettingsClick)}
                  className={MENU_BUTTON}
                >
                  <Settings />
                  <span>Settings</span>
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
                {status.label}
              </span>
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground/70">
            FlowPilot AI · MVP
          </p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </SidebarRoot>
  );
}
