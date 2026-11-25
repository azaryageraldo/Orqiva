"use client";

import * as React from "react";
import {
  Bell,
  BookOpen,
  Bot,
  BrainCircuit,
  Check,
  ChevronDown,
  GitFork,
  KeyRound,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Radio,
  ScrollText,
  Search,
  Settings as SettingsIcon,
  ShieldAlert,
  SlidersHorizontal,
  User,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  sidebarCollapsed?: boolean;
  onToggleDesktopSidebar?: () => void;
  showSidebarToggle?: boolean;
  user: HeaderUser | null;
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onNotificationClick: (item: NotificationItem) => void;
}

export type { NotificationItem };

const PAGE_LABELS: Record<NavKey, string> = {
  dashboard: "Dashboard",
  workflows: "Workflows",
  datapoints: "Datapoints",
  data: "Data",
  inbox: "Inbox",
  channel: "Channel",
  activity: "Audit Log",
  "ai-providers": "AI Providers",
  settings: "Settings",
  help: "Help & Docs",
};

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

const COMMAND_ITEMS: Array<{
  nav: NavKey;
  label: string;
  section: string;
  keywords: string;
  icon: React.ElementType;
}> = [
  { nav: "dashboard", label: "Dashboard", section: "Workspace", keywords: "overview kpi telemetry home", icon: LayoutDashboard },
  { nav: "workflows", label: "Workflows", section: "Workspace", keywords: "flows automation canvas builder", icon: GitFork },
  { nav: "inbox", label: "Inbox", section: "Conversations", keywords: "chat live support takeover messages", icon: MessagesSquare },
  { nav: "activity", label: "Audit Log", section: "Conversations", keywords: "executions history logs trace", icon: ScrollText },
  { nav: "channel", label: "Channel", section: "Channels", keywords: "telegram widget embed webhook", icon: Radio },
  { nav: "ai-providers", label: "AI Providers", section: "Configuration", keywords: "gemini openai openrouter api keys models", icon: BrainCircuit },
  { nav: "settings", label: "Settings", section: "Configuration", keywords: "profile password account preferences", icon: SlidersHorizontal },
  { nav: "help", label: "Help & Docs", section: "Documentation", keywords: "docs guide reference examples shortcuts", icon: BookOpen },
];

export default function Header({
  activeNav,
  loggingOut,
  onLogout,
  onNavigate,
  onToggleSidebar,
  sidebarCollapsed = false,
  onToggleDesktopSidebar,
  showSidebarToggle = true,
  user,
  notifications,
  onMarkAsRead,
  onNotificationClick,
}: HeaderProps) {
  const { t } = useI18n();
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [commandQuery, setCommandQuery] = React.useState("");
  const [selectedCommandIndex, setSelectedCommandIndex] = React.useState(0);
  const notificationsRef = React.useRef<HTMLDivElement>(null);
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const workspaceMenuRef = React.useRef<HTMLDivElement>(null);

  const displayName = user?.name || t("header.workspaceAdmin");
  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredCommands = React.useMemo(() => {
    const q = commandQuery.trim().toLowerCase();
    if (!q) return COMMAND_ITEMS;
    return COMMAND_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.section.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q),
    );
  }, [commandQuery]);

  // Global Cmd/Ctrl+K shortcut for Command Palette.
  React.useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandQuery("");
        setSelectedCommandIndex(0);
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Close the open popovers when clicking outside or pressing Escape.
  React.useEffect(() => {
    if (!notificationsOpen && !userMenuOpen && !workspaceMenuOpen) return;

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

      if (
        workspaceMenuOpen &&
        workspaceMenuRef.current &&
        !workspaceMenuRef.current.contains(target)
      ) {
        setWorkspaceMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setNotificationsOpen(false);
      setUserMenuOpen(false);
      setWorkspaceMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notificationsOpen, userMenuOpen, workspaceMenuOpen]);

  function openCommandPalette() {
    setCommandQuery("");
    setSelectedCommandIndex(0);
    setCommandOpen(true);
  }

  function runCommand(nav: NavKey) {
    setCommandOpen(false);
    setCommandQuery("");
    onNavigate(nav);
  }

  return (
    <>
    <header
      className="sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between border-b border-border bg-card/60 backdrop-blur-md px-3 sm:px-5"
    >
      <div className="flex items-center gap-3 min-w-0">
        {showSidebarToggle && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={t("side.openMenu")}
            className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground lg:hidden"
          >
            <Menu size={16} strokeWidth={1.75} />
          </button>
        )}

        {showSidebarToggle && onToggleDesktopSidebar && (
          <button
            type="button"
            onClick={onToggleDesktopSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar (⌘B)" : "Collapse sidebar (⌘B)"}
            className="hidden lg:flex size-7 shrink-0 items-center justify-center rounded-md border border-border/80 bg-card/60 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={15} strokeWidth={1.5} />
            ) : (
              <PanelLeftClose size={15} strokeWidth={1.5} />
            )}
          </button>
        )}

        {/* Mobile Logo */}
        <a
          href="/"
          aria-label="Orqiva"
          onClick={(e) => {
            e.preventDefault();
            onNavigate("dashboard");
          }}
          className="flex items-center gap-2 lg:hidden"
        >
          <OrqivaLogo showWordmark={false} markClassName="size-6" />
        </a>

        {/* Workspace Selector & Breadcrumb Header (Supabase style) */}
        <div className="flex items-center gap-2 text-xs">
          <div className="relative hidden sm:block" ref={workspaceMenuRef}>
            <button
              type="button"
              onClick={() => {
                setWorkspaceMenuOpen((open) => !open);
                setNotificationsOpen(false);
                setUserMenuOpen(false);
              }}
              aria-expanded={workspaceMenuOpen}
              className="flex items-center gap-1.5 rounded-md border border-border/80 bg-card/60 px-2 py-1 text-foreground font-medium shadow-xs hover:bg-muted/40 transition-colors select-none"
            >
              <Layers size={13} className="text-primary" />
              <span className="font-semibold text-foreground">default-workspace</span>
              <ChevronDown size={11} className="text-muted-foreground" />
            </button>

            {workspaceMenuOpen && (
              <div className="absolute left-0 top-10 z-[60] w-60 rounded-xl border border-border bg-card/95 p-1.5 shadow-2xl backdrop-blur-md">
                <div className="px-2.5 py-2 border-b border-border/70">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Active Workspace
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">
                      default-workspace
                    </span>
                    <Check size={13} className="text-primary shrink-0" />
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    Local Instance · {displayName}
                  </p>
                </div>
                <div className="pt-1 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceMenuOpen(false);
                      onNavigate("settings");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
                  >
                    <SettingsIcon size={13} strokeWidth={1.5} />
                    <span>Workspace Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceMenuOpen(false);
                      onNavigate("ai-providers");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
                  >
                    <KeyRound size={13} strokeWidth={1.5} />
                    <span>{t("nav.apiKeys")}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <span className="text-muted-foreground/40 hidden sm:inline">/</span>

          <nav aria-label="Breadcrumb" className="flex items-center gap-1">
            <span className="font-medium text-foreground">{PAGE_LABELS[activeNav] || "Dashboard"}</span>
          </nav>
        </div>
      </div>

      {/* Center Command Palette Search Trigger Bar */}
      <div className="hidden md:flex flex-1 max-w-xs mx-4">
        <button
          type="button"
          onClick={openCommandPalette}
          className="flex w-full items-center justify-between gap-2 rounded-md border border-border/80 bg-card/40 px-2.5 py-1 text-xs text-muted-foreground shadow-xs transition-colors hover:bg-muted/40 hover:text-foreground hover:border-border"
        >
          <span className="flex items-center gap-2 truncate">
            <Search size={13} className="text-muted-foreground/70" />
            <span className="truncate">Search or jump to...</span>
          </span>
          <kbd className="pointer-events-none flex h-4.5 select-none items-center gap-0.5 rounded border border-border bg-muted/60 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-[10px]">⌘</span>K
          </kbd>
        </button>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {/* Mobile Command Palette Button */}
        <button
          type="button"
          onClick={openCommandPalette}
          aria-label="Quick search"
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground md:hidden"
        >
          <Search size={16} strokeWidth={1.5} />
        </button>

        {/* Environment Badge */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-border/80 bg-card/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground select-none">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          <span>Local Instance</span>
        </div>
        {/* Notifications Bell */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setUserMenuOpen(false);
              setWorkspaceMenuOpen(false);
            }}
            aria-label={t("notifications.title")}
            className={cn(
              "relative flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground",
              unreadCount > 0 && "text-primary",
            )}
          >
            <Bell size={17} strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 flex size-[10px] items-center justify-center rounded-full border border-background bg-primary px-0.5 text-[8px] font-bold text-primary-foreground"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              className="absolute z-[60] top-12 right-0 w-[280px] mt-1 max-w-[calc(100vw-4rem)]"
            >
              <div className="border border-border bg-card/95 backdrop-blur-md shadow-xl rounded-xl p-3">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Bell size={28} className="text-muted-foreground/50 mb-2" />
                    <p className="text-[11px] text-muted-foreground">
                      {t("notifications.empty")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.map((item) => {
                      const Config = NOTIFICATION_CONFIG[item.type] ?? {
                        icon: Bell,
                        chip: "bg-muted",
                        iconColor: "text-muted-foreground",
                      };
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
                            "flex w-full items-start gap-2 p-2 rounded-lg text-left transition-colors",
                            !item.read ? "bg-muted/40" : "hover:bg-muted/30",
                          )}
                        >
                          <div className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-md",
                            Config.chip,
                            Config.iconColor,
                          )}>
                            <Icon size={14} strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[12px] font-medium text-foreground leading-tight">
                                {item.title}
                              </p>
                              {!item.read && (
                                <span className="size-2 rounded-full bg-primary shrink-0" />
                              )}
                            </div>
                            {item.description && (
                              <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight line-clamp-2">
                                {item.description}
                              </p>
                            )}
                            <p className="mt-1 text-[9px] text-muted-foreground" title={formatAbsoluteTime(item.timestamp)}>
                              {formatRelativeTime(item.timestamp)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <span className="mx-0.5 hidden h-4 w-[1px] bg-border sm:block" />

        {/* User Profile Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => {
              setUserMenuOpen(!userMenuOpen);
              setNotificationsOpen(false);
              setWorkspaceMenuOpen(false);
            }}
            aria-label="User menu"
            className="relative flex items-center gap-1 rounded-md px-1 py-1 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            <Avatar
              size="sm"
              className="ring-1 ring-primary/30 ring-offset-1 ring-offset-background"
            >
              <AvatarFallback className="bg-gradient-to-br from-primary/40 to-primary/10 text-[10px] font-bold text-primary">
                {initialsOf(displayName)}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute z-[60] top-12 right-0 w-48 mt-1">
              <div className="border border-border bg-card/95 backdrop-blur-md shadow-2xl rounded-xl p-1.5 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onNavigate("settings");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
                >
                  <SettingsIcon size={14} strokeWidth={1.5} />
                  <span>{t("nav.settings")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onNavigate("ai-providers");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
                >
                  <KeyRound size={14} strokeWidth={1.5} />
                  <span>{t("nav.apiKeys")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onNavigate("help");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
                >
                  <LifeBuoy size={14} strokeWidth={1.5} />
                  <span>{t("nav.help")}</span>
                </button>

                <div className="border-t border-border my-1" />

                <button
                  type="button"
                  disabled={loggingOut}
                  onClick={onLogout}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                    loggingOut && "text-muted-foreground pointer-events-none",
                    !loggingOut ? "text-foreground hover:bg-accent" : "text-destructive/50",
                  )}
                >
                  {loggingOut ? (
                    <span className="flex items-center gap-2">
                      <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      {t("header.loggingOut")}
                    </span>
                  ) : (
                    <>
                      <LogOut size={14} strokeWidth={1.5} />
                      <span>{t("header.logout")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>

    <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
      <DialogContent className="p-0 overflow-hidden sm:max-w-md gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
          <DialogDescription>Jump quickly to any Orqiva Studio page.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
          <Search size={15} className="shrink-0 text-muted-foreground" />
          <input
            type="text"
            autoFocus
            value={commandQuery}
            onChange={(e) => {
              setCommandQuery(e.target.value);
              setSelectedCommandIndex(0);
            }}
            onKeyDown={(e) => {
              if (filteredCommands.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedCommandIndex((i) => (i + 1) % filteredCommands.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedCommandIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length);
              } else if (e.key === "Enter") {
                e.preventDefault();
                const target = filteredCommands[selectedCommandIndex] ?? filteredCommands[0];
                if (target) runCommand(target.nav);
              }
            }}
            placeholder="Jump to page or setting..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-1.5">
          {filteredCommands.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No matching destinations found.
            </p>
          ) : (
            <div className="space-y-0.5">
              {filteredCommands.map((item, idx) => {
                const Icon = item.icon;
                const active = idx === selectedCommandIndex;
                return (
                  <button
                    key={item.nav}
                    type="button"
                    onMouseEnter={() => setSelectedCommandIndex(idx)}
                    onClick={() => runCommand(item.nav)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors",
                      active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/40",
                    )}
                  >
                    <span className="flex items-center gap-2.5 font-medium">
                      <Icon size={15} strokeWidth={1.5} />
                      <span>{item.label}</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">
                      {item.section}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
