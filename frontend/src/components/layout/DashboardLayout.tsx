
import { useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

type Health = "checking" | "online" | "offline";

interface DashboardLayoutProps {
  title: string;
  health: Health;
  loggingOut: boolean;
  onLogout: () => void;
  onActivityClick: () => void;
  onHelpClick: () => void;
  children: ReactNode;
}

export default function DashboardLayout({
  title,
  health,
  loggingOut,
  onLogout,
  onActivityClick,
  onHelpClick,
  children,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        health={health}
        onActivityClick={onActivityClick}
        onHelpClick={onHelpClick}
      />

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Tutup menu navigasi"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title={title}
          loggingOut={loggingOut}
          onLogout={onLogout}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {children}
      </div>
    </div>
  );
}
