import type { CSSProperties, ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import Sidebar, { type Health, type NavKey } from "./Sidebar";
import Header, { type HeaderIcon } from "./Header";

interface DashboardLayoutProps {
  title: string;
  icon: HeaderIcon;
  health: Health;
  loggingOut: boolean;
  onLogout: () => void;
  activeNav: NavKey;
  onDashboardClick: () => void;
  onWorkflowsClick: () => void;
  onActivityClick: () => void;
  onHelpClick: () => void;
  onSettingsClick: () => void;
  children: ReactNode;
}

export default function DashboardLayout({
  title,
  icon,
  health,
  loggingOut,
  onLogout,
  activeNav,
  onDashboardClick,
  onWorkflowsClick,
  onActivityClick,
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
        onActivityClick={onActivityClick}
        onHelpClick={onHelpClick}
        onSettingsClick={onSettingsClick}
      />

      <SidebarInset>
        <Header
          title={title}
          icon={icon}
          loggingOut={loggingOut}
          onLogout={onLogout}
        />

        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
