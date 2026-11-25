import { useCallback, useEffect, useState, type ReactNode } from "react";

import Sidebar, { type Health, type NavKey } from "./Sidebar";
import Header, { type HeaderUser, type NotificationItem } from "./Header";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  health: Health;
  user: HeaderUser | null;
  loggingOut: boolean;
  onLogout: () => void;
  activeNav: NavKey;
  onDashboardClick: () => void;
  onWorkflowsClick: () => void;
  onDatapointsClick?: () => void;
  onDataClick?: () => void;
  onInboxClick: () => void;
  onChannelClick: () => void;
  onActivityClick: () => void;
  onAiProvidersClick: () => void;
  onHelpClick: () => void;
  onSettingsClick: () => void;
  hideSidebar?: boolean;
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onNotificationClick: (item: NotificationItem) => void;
  children: ReactNode;
}

export default function DashboardLayout({
  health,
  user,
  loggingOut,
  onLogout,
  activeNav,
  onDashboardClick,
  onWorkflowsClick,
  onDatapointsClick,
  onDataClick,
  onInboxClick,
  onChannelClick,
  onActivityClick,
  onAiProvidersClick,
  onHelpClick,
  onSettingsClick,
  hideSidebar = false,
  notifications,
  onMarkAsRead,
  onNotificationClick,
  children,
}: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("orqiva_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("orqiva_sidebar_collapsed", String(next));
      } catch {
        // Ignore storage write errors in restricted browsing contexts.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleCollapse]);

  const navigate = (key: NavKey) => {
    const handlers: Record<NavKey, () => void> = {
      dashboard: onDashboardClick,
      workflows: onWorkflowsClick,
      datapoints: onDatapointsClick ?? onWorkflowsClick,
      data: onDataClick ?? onWorkflowsClick,
      inbox: onInboxClick,
      channel: onChannelClick,
      activity: onActivityClick,
      "ai-providers": onAiProvidersClick,
      help: onHelpClick,
      settings: onSettingsClick,
    };

    handlers[key]?.();
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        activeNav={activeNav}
        user={user}
        loggingOut={loggingOut}
        onLogout={onLogout}
        onNavigate={navigate}
        onToggleSidebar={() => setMobileOpen((open) => !open)}
        sidebarCollapsed={collapsed}
        onToggleDesktopSidebar={toggleCollapse}
        showSidebarToggle={!hideSidebar}
        notifications={notifications}
        onMarkAsRead={onMarkAsRead}
        onNotificationClick={onNotificationClick}
      />

      <div className="flex min-h-[calc(100vh-3rem)]">
        {!hideSidebar && (
          <div
            className={cn(
              "sticky top-12 hidden h-[calc(100vh-3rem)] shrink-0 transition-all duration-200 lg:block",
              collapsed ? "w-14" : "w-56",
            )}
          >
            <Sidebar
              health={health}
              activeNav={activeNav}
              onNavigate={navigate}
              collapsed={collapsed}
            />
          </div>
        )}

        {!hideSidebar && mobileOpen && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="fixed inset-x-0 top-12 bottom-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            />
            <div className="fixed top-12 bottom-0 left-0 z-50 w-64 shadow-2xl lg:hidden">
              <Sidebar
                health={health}
                activeNav={activeNav}
                onNavigate={navigate}
              />
            </div>
          </>
        )}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
