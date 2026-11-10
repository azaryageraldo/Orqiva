import { useState, type ReactNode } from "react";

import Sidebar, { type Health, type NavKey } from "./Sidebar";
import Header, { type HeaderUser, type NotificationItem } from "./Header";

interface DashboardLayoutProps {
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

  const navigate = (key: NavKey) => {
    const handlers: Record<NavKey, () => void> = {
      dashboard: onDashboardClick,
      workflows: onWorkflowsClick,
      inbox: onInboxClick,
      channel: onChannelClick,
      activity: onActivityClick,
      "ai-providers": onAiProvidersClick,
      help: onHelpClick,
      settings: onSettingsClick,
    };

    handlers[key]();
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
        showSidebarToggle={!hideSidebar}
        notifications={notifications}
        onMarkAsRead={onMarkAsRead}
        onNotificationClick={onNotificationClick}
      />

      <div className="flex min-h-[calc(100vh-3rem)]">
        {!hideSidebar && (
          <div className="sticky top-12 hidden h-[calc(100vh-3rem)] w-[208px] shrink-0 border-r border-white/[0.06] lg:block">
            <Sidebar
              health={health}
              activeNav={activeNav}
              onNavigate={navigate}
            />
          </div>
        )}

        {!hideSidebar && mobileOpen && (
          <>
            <button
              type="button"
              aria-label="Tutup menu"
              onClick={() => setMobileOpen(false)}
              className="fixed inset-x-0 top-12 bottom-0 z-20 bg-black/60 lg:hidden"
            />
            <div className="fixed top-12 bottom-0 left-0 z-30 w-[208px] border-r border-white/[0.06] shadow-2xl lg:hidden">
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
