import type { ReactNode } from "react";
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
  return (
    <div className="flex min-h-screen bg-[#09090b] text-zinc-100">
      <Sidebar
        health={health}
        onActivityClick={onActivityClick}
        onHelpClick={onHelpClick}
      />

      <main className="min-w-0 flex-1">
        <Header
          title={title}
          loggingOut={loggingOut}
          onLogout={onLogout}
        />

        {children}
      </main>
    </div>
  );
}
