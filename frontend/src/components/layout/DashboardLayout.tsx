import type { CSSProperties, ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import Sidebar, { type Health, type NavKey } from "./Sidebar";
import Header, { type HeaderIcon, type HeaderUser } from "./Header";

interface DashboardLayoutProps {
  title: string;
  icon: HeaderIcon;
  health: Health;
  user: HeaderUser | null;
  loggingOut: boolean;
  onLogout: () => void;
  activeNav: NavKey;
  onDashboardClick: () => void;
  onWorkflowsClick: () => void;
  onInboxClick: () => void;
  onChannelClick: () => void;
  onActivityClick: () => void;
  onAiProvidersClick: () => void;
  onHelpClick: () => void;
  onSettingsClick: () => void;
  children: ReactNode;
}

export default function DashboardLayout({
  title,
  icon,
  health,
  user,
  loggingOut,
  onLogout,
  activeNav,
  onDashboardClick,
  onWorkflowsClick,
  onInboxClick,
  onChannelClick,
  onActivityClick,
  onAiProvidersClick,
  onHelpClick,
  onSettingsClick,
  children,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "17.5rem" } as CSSProperties}
    >
      <Sidebar
        health={health}
        activeNav={activeNav}
        onDashboardClick={onDashboardClick}
        onWorkflowsClick={onWorkflowsClick}
        onInboxClick={onInboxClick}
        onChannelClick={onChannelClick}
        onActivityClick={onActivityClick}
        onAiProvidersClick={onAiProvidersClick}
        onHelpClick={onHelpClick}
        onSettingsClick={onSettingsClick}
      />

      <SidebarInset>
        <Header
          title={title}
          icon={icon}
          user={user}
          loggingOut={loggingOut}
          onLogout={onLogout}
        />

        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
