import {
  Activity,
  ChevronDown,
  Globe2,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  LoaderCircle,
  LogOut,
  MessageSquare,
  Settings,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import PreferenceControls from "@/components/preferences/PreferenceControls";
import { useI18n } from "@/lib/i18n";

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

interface HeaderProps {
  title: string;
  icon: HeaderIcon;
  loggingOut: boolean;
  onLogout: () => void;
  user: HeaderUser | null;
}

export interface HeaderUser {
  name: string;
  email: string;
}

const ICONS: Record<HeaderIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  workflows: Workflow,
  editor: Workflow,
  chat: MessageSquare,
  inbox: Inbox,
  channel: Globe2,
  activity: Activity,
  keys: KeyRound,
  settings: Settings,
  help: LifeBuoy,
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "A";
}

export default function Header({
  title,
  icon,
  loggingOut,
  onLogout,
  user,
}: HeaderProps) {
  const { t } = useI18n();
  const Icon = ICONS[icon];
  const displayName = user?.name || t("header.workspaceAdmin");
  const account = {
    name: displayName,
    email: user?.email || "",
    role: t("header.workspaceAdmin"),
    initials: initialsOf(displayName),
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b border-border/70 bg-background/70 px-4 backdrop-blur-xl sm:px-6">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />

      <SidebarTrigger className="size-9 rounded-lg border border-border/70 bg-background/40 text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground" />

      <Separator
        orientation="vertical"
        className="mx-1 hidden h-5 w-px self-center bg-border/70 sm:block"
      />

      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap">
          <BreadcrumbItem className="hidden md:flex">
            <span className="flex size-7 items-center justify-center rounded-lg border border-border/70 bg-gradient-to-br from-muted to-transparent text-primary shadow-sm">
              <Icon className="size-3.5" />
            </span>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:flex" />
          <BreadcrumbItem className="hidden sm:flex">
            <span className="text-xs font-medium text-muted-foreground">
              {t("header.workspace")}
            </span>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden sm:flex" />
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="truncate text-[15px] font-semibold tracking-tight">
              {title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        <PreferenceControls className="hidden border-border/70 bg-background/40 sm:flex" />

        <Separator
          orientation="vertical"
          className="mx-0.5 hidden h-5 w-px self-center bg-border/70 sm:block"
        />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="h-10 gap-2.5 rounded-xl border border-transparent px-1.5 transition-colors hover:border-border/70 hover:bg-muted/50 sm:px-2"
              />
            }
          >
            <Avatar
              size="sm"
              className="size-8 ring-1 ring-primary/30 ring-offset-2 ring-offset-background"
            >
              <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/5 text-[11px] font-bold text-primary">
                {account.initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block max-w-36 truncate text-[13px] font-semibold text-foreground">
                {account.name}
              </span>
              <span className="block text-[11px] font-normal text-muted-foreground">
                {account.role}
              </span>
            </span>
            <ChevronDown className="hidden size-4 text-muted-foreground/70 sm:block" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <span className="block truncate text-sm font-medium text-foreground">
                  {account.name}
                </span>
                {account.email && (
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {account.email}
                  </span>
                )}
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              variant="destructive"
              disabled={loggingOut}
              onClick={onLogout}
            >
              {loggingOut ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <LogOut />
              )}
              {loggingOut ? t("header.loggingOut") : t("header.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
