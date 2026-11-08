import {
  Bell,
  ChevronDown,
  KeyRound,
  LifeBuoy,
  LogOut,
  Menu,
  Settings,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import OrqivaLogo from "@/components/brand/OrqivaLogo";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { NavKey } from "./Sidebar";

export type HeaderIcon =
  | "dashboard"
  | "workflows"
  | "editor"
  | "chat"
  | "inbox"
  | "channel"
  | "activity"
  | "keys"
  | "settings"
  | "help";

export interface HeaderUser {
  name: string;
  email?: string;
}

interface HeaderProps {
  activeNav: NavKey;
  loggingOut: boolean;
  onLogout: () => void;
  onNavigate: (key: NavKey) => void;
  onToggleSidebar: () => void;
  showSidebarToggle?: boolean;
  user: HeaderUser | null;
}

const TOP_NAV: Array<{
  key: NavKey;
  labelKey: string;
  matches: NavKey[];
}> = [
  { key: "dashboard", labelKey: "topnav.data", matches: ["dashboard"] },
  { key: "inbox", labelKey: "topnav.inbox", matches: ["inbox"] },
  { key: "channel", labelKey: "topnav.channel", matches: ["channel"] },
  { key: "workflows", labelKey: "topnav.agent", matches: ["workflows"] },
  {
    key: "settings",
    labelKey: "topnav.settings",
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

export default function Header({
  activeNav,
  loggingOut,
  onLogout,
  onNavigate,
  onToggleSidebar,
  showSidebarToggle = true,
  user,
}: HeaderProps) {
  const { t } = useI18n();
  const displayName = user?.name || t("header.workspaceAdmin");
  const email = user?.email ?? "";
  const account = {
    name: displayName,
    role: t("header.workspaceAdmin"),
    initials: initialsOf(displayName),
  };

  return (
    <header
      className="sticky top-0 z-40 flex h-12 shrink-0 items-center gap-1.5 border-b border-white/[0.10] bg-[#090a0c]/80 px-2.5 backdrop-blur-md sm:px-4"
    >
      {showSidebarToggle && (
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={t("side.openMenu")}
          className="flex size-8 items-center justify-center rounded-md text-zinc-400 transition hover:bg-white/[0.04] hover:text-zinc-200 lg:hidden"
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
        className="ml-2 flex min-w-0 items-center gap-0.5 overflow-x-auto"
      >
        {TOP_NAV.map((item) => {
          const active = item.matches.includes(activeNav);

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-8 shrink-0 items-center rounded-md px-2.5 text-[12.5px] font-medium transition-colors",
                active
                  ? "bg-white/[0.06] text-zinc-100"
                  : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300",
              )}
            >
              {t(item.labelKey)}
            </button>
          );
        })}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => onNavigate("inbox")}
          aria-label={t("topnav.notifications")}
          title={t("topnav.notifications")}
          className="relative flex size-8 items-center justify-center rounded-md text-zinc-400 transition hover:bg-white/[0.04] hover:text-zinc-200"
        >
          <Bell size={17} strokeWidth={1.5} />
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
        </button>

        <span className="mx-0.5 hidden h-4 w-[1px] bg-white/[0.05] sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="h-8 gap-2 rounded-md border-transparent px-1 transition-colors hover:bg-white/[0.04]"
              />
            }
          >
            <span className="hidden min-w-0 text-right leading-tight md:block">
              {email && (
                <span className="block max-w-44 truncate text-[10px] font-normal text-zinc-500">
                  {email}
                </span>
              )}
              <span className="block max-w-36 truncate text-[12.5px] font-medium text-zinc-200">
                {account.name}
              </span>
            </span>

            <Avatar
              size="sm"
              className="size-7 ring-1 ring-primary/30 ring-offset-1 ring-offset-[#090a0c]"
            >
              <AvatarFallback className="bg-gradient-to-br from-primary/40 to-primary/10 text-[10px] font-bold text-primary">
                {account.initials}
              </AvatarFallback>
            </Avatar>

            <ChevronDown className="hidden size-3.5 text-zinc-500 sm:block" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-60 border border-white/[0.08] bg-[#0a0b0f]/90 backdrop-blur-md">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-3 py-2">
                <span className="block truncate text-sm font-medium text-zinc-100">
                  {account.name}
                </span>
                {email && (
                  <span className="mt-0.5 block truncate text-[11px] font-normal text-zinc-500">
                    {email}
                  </span>
                )}
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="border-white/[0.06]" />

            <DropdownMenuItem onClick={() => onNavigate("settings")} className="text-[13px]">
              <Settings size={15} strokeWidth={1.5} />
              {t("nav.settings")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate("ai-providers")} className="text-[13px]">
              <KeyRound size={15} strokeWidth={1.5} />
              {t("nav.apiKeys")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate("help")} className="text-[13px]">
              <LifeBuoy size={15} strokeWidth={1.5} />
              {t("nav.help")}
            </DropdownMenuItem>

            <DropdownMenuSeparator className="border-white/[0.06]" />

            <DropdownMenuItem
              variant="destructive"
              disabled={loggingOut}
              onClick={onLogout}
              className="text-[13px]"
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
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
