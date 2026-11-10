"use client";

import * as React from "react";
import {
  Bell,
  ChevronDown,
  KeyRound,
  LifeBuoy,
  LogOut,
  Menu,
  Layout,
  Bot,
  Globe,
  Settings as SettingsIcon,
  ShieldAlert,
  User,
  Plus,
  Activity,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import OrqivaLogo from "@/components/brand/OrqivaLogo";
import { formatAbsoluteTime, formatRelativeTime } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { NavKey } from "./Sidebar";

export type HeaderIcon =
  | "dashboard"
  | "workflows"
  | "editor"
  | "chat"
  | "channel"
  | "activity"
  | "keys"
  | "settings"
  | "help";

export interface HeaderUser {
  name: string;
  email?: string;
}

interface NotificationItem {
  id: string;
  type:
    | "workflow.created"
    | "workflow.error"
    | "api.key.added"
    | "api.key.edited"
    | "profile.updated"
    | "login"
    | "message.received";
  title: string;
  description?: string;
  timestamp: string;
  read: boolean;
  url?: string;
}

interface HeaderProps {
  activeNav: NavKey;
  loggingOut: boolean;
  onLogout: () => void;
  onNavigate: (key: NavKey) => void;
  onToggleSidebar: () => void;
  showSidebarToggle?: boolean;
  user: HeaderUser | null;
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onNotificationClick: (item: NotificationItem) => void;
}

export type { NotificationItem };

const NAV_ITEMS: Array<{
  key: NavKey;
  label: string;
  icon: React.ElementType;
  matches: NavKey[];
}> = [
  { key: "dashboard", label: "Dashboard", icon: Layout, matches: ["dashboard"] },
  { key: "inbox", label: "Inbox", icon: Activity, matches: ["inbox"] },
  { key: "channel", label: "Channel", icon: Globe, matches: ["channel"] },
  { key: "workflows", label: "Agent", icon: Bot, matches: ["workflows"] },
  {
    key: "settings",
    label: "Settings",
    icon: SettingsIcon,
    matches: ["settings"],
  },
];

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "A"
  );
}

const NOTIFICATION_CONFIG: Record<
  string,
  { icon: React.ElementType; chip: string; iconColor: string }
> = {
  "workflow.created": {
    icon: Plus,
    chip: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
  },
  "workflow.error": {
    icon: ShieldAlert,
    chip: "bg-red-500/10",
    iconColor: "text-red-400",
  },
  "api.key.added": {
    icon: KeyRound,
    chip: "bg-primary/10",
    iconColor: "text-primary",
  },
  "api.key.edited": {
    icon: KeyRound,
    chip: "bg-teal-500/10",
    iconColor: "text-teal-400",
  },
  "profile.updated": {
    icon: User,
    chip: "bg-violet-500/10",
    iconColor: "text-violet-400",
  },
  login: {
    icon: User,
    chip: "bg-amber-500/10",
    iconColor: "text-amber-400",
  },
  "message.received": {
    icon: Bot,
    chip: "bg-blue-500/10",
    iconColor: "text-blue-400",
  },
};

export default function Header({
  activeNav,
  loggingOut,
  onLogout,
  onNavigate,
  onToggleSidebar,
  showSidebarToggle = true,
  user,
  notifications,
  onMarkAsRead,
  onNotificationClick,
}: HeaderProps) {
  const { t } = useI18n();
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const notificationsRef = React.useRef<HTMLDivElement>(null);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  const displayName = user?.name || t("header.workspaceAdmin");
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close the open popovers when clicking outside or pressing Escape.
  React.useEffect(() => {
    if (!notificationsOpen && !userMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        notificationsOpen &&
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }

      if (
        userMenuOpen &&
        userMenuRef.current &&
        !userMenuRef.current.contains(target)
      ) {
        setUserMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setNotificationsOpen(false);
      setUserMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notificationsOpen, userMenuOpen]);

  return (
    <header
      className="sticky top-0 z-40 flex h-12 shrink-0 items-center gap-1 border-b border-white/[0.06] bg-[#090a0c]/80 backdrop-blur-md px-2.5 sm:px-4"
    >
      {showSidebarToggle && (
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={t("side.openMenu")}
          className="flex size-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-200 lg:hidden"
        >
          <Menu size={18} strokeWidth={1.5} />
        </button>
      )}

      <a
        href="/"
        aria-label="Orqiva"
        className="flex shrink-0 items-center gap-2 pl-0.5"
      >
        <OrqivaLogo showWordmark={false} markClassName="size-6" />
        <span className="hidden text-[13px] font-semibold tracking-tight text-zinc-100 sm:block">
          Orqiva
        </span>
      </a>

      <nav
        aria-label={t("topnav.label")}
        className="ml-2.5 flex min-w-0 items-center gap-0.5 overflow-x-auto no-scrollbar"
      >
        {NAV_ITEMS.map((item) => {
          const active = item.matches.includes(activeNav);
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                onNavigate(item.key);
                setNotificationsOpen(false);
                setUserMenuOpen(false);
              }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-9 shrink-0 items-center justify-center rounded-md px-2.5 text-[12px] font-medium transition-colors whitespace-nowrap",
                active
                  ? "bg-primary/10 border border-primary/20 text-primary"
                  : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300",
              )}
            >
              <Icon size={14} strokeWidth={1.5} />
              <span className="ml-1.5">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        {/* Notifications Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setUserMenuOpen(false);
            }}
            aria-label={t("notifications.title")}
            className={cn(
              "relative flex size-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-200",
              unreadCount > 0 && "text-primary",
            )}
          >
            <Bell size={17} strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span
                className={`absolute top-1 right-1 size-[10px] rounded-full border border-[#090a0c] bg-primary text-[8px] font-bold text-white flex items-center justify-center px-0.5`}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div ref={notificationsRef} className="absolute z-[60] top-12 right-0 w-[320px] mt-1">
              <div className="border border-white/[0.08] bg-[#0a0b0f]/90 backdrop-blur-md shadow-xl rounded-xl p-3">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Bell size={28} className="text-zinc-600 mb-2" />
                    <p className="text-[11px] text-zinc-500">
                      {t("notifications.empty")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.map((item) => {
                      const Config = NOTIFICATION_CONFIG[item.type];
                      const Icon = Config.icon;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onMarkAsRead(item.id);
                            onNotificationClick(item);
                            setNotificationsOpen(false);
                          }}
                          className={cn(
                            "flex items-start gap-2 p-2 rounded-lg transition-colors",
                            !item.read ? "bg-white/5" : "hover:bg-white/5",
                          )}
                        >
                          <div className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-md",
                            Config.chip,
                          )}>
                            <Icon size={14} strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-medium text-zinc-100 leading-tight">
                              {item.title}
                            </p>
                            {item.description && (
                              <p className="mt-0.5 text-[10px] text-zinc-500 leading-tight">
                                {item.description}
                              </p>
                            )}
                            <p className="mt-1 text-[9px] text-zinc-500" title={formatAbsoluteTime(item.timestamp)}>
                              {formatRelativeTime(item.timestamp)}
                            </p>
                          </div>
                          {!item.read && (
                            <span className="size-[5px] rounded-full bg-primary shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <span className="mx-0.5 hidden h-4 w-[1px] bg-white/[0.05] sm:block" />

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setUserMenuOpen(!userMenuOpen);
              setNotificationsOpen(false);
            }}
            aria-label="User menu"
            className="relative flex size-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-200"
          >
            <Avatar
              size="sm"
              className="ring-1 ring-primary/30 ring-offset-1 ring-offset-[#090a0c]"
            >
              <AvatarFallback className="bg-gradient-to-br from-primary/40 to-primary/10 text-[10px] font-bold text-primary">
                {initialsOf(displayName)}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="hidden size-3.5 text-zinc-500 sm:block" />
          </button>

          {userMenuOpen && (
            <div ref={userMenuRef} className="absolute z-[60] top-12 right-0 w-[60px] mt-1">
              <div className="border border-white/[0.08] bg-[#0a0b0f]/95 backdrop-blur-md shadow-2xl rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onNavigate("settings");
                  }}
                  className="flex items-center gap-2 p-2 text-[13px] text-zinc-100 hover:bg-white/5"
                >
                  <SettingsIcon size={15} strokeWidth={1.5} />
                  {t("nav.settings")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onNavigate("ai-providers");
                  }}
                  className="flex items-center gap-2 p-2 text-[13px] text-zinc-100 hover:bg-white/5"
                >
                  <KeyRound size={15} strokeWidth={1.5} />
                  {t("nav.apiKeys")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onNavigate("help");
                  }}
                  className="flex items-center gap-2 p-2 text-[13px] text-zinc-100 hover:bg-white/5"
                >
                  <LifeBuoy size={15} strokeWidth={1.5} />
                  {t("nav.help")}
                </button>

                <div className="border-t border-white/[0.06] my-1" />

                <button
                  type="button"
                  disabled={loggingOut}
                  onClick={onLogout}
                  className={cn(
                    "flex items-center gap-2 p-2 text-[13px] transition-colors",
                    loggingOut && "text-zinc-500 pointer-events-none",
                    !loggingOut ? "text-zinc-100 hover:bg-white/5" : "text-destructive/30",
                  )}
                >
                  {loggingOut ? (
                    <span className="flex items-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      {t("header.loggingOut")}
                    </span>
                  ) : (
                    <LogOut size={15} strokeWidth={1.5} />
                  )}
                  {loggingOut ? t("header.loggingOut") : t("header.logout")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
