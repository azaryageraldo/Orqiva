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
    .join("") || "OR";
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
  const account = {
    name: user?.name || "Orqiva Admin",
    email: user?.email || "admin@gmail.com",
    role: t("header.workspaceAdmin"),
    initials: initialsOf(user?.name || "Orqiva Admin"),
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <SidebarTrigger className="-ml-1" />

      <Separator
        orientation="vertical"
        className="mr-1 h-5 w-px self-center bg-border"
      />

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:flex">
            <span className="flex size-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Icon className="size-3.5" />
            </span>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:flex" />
          <BreadcrumbItem className="hidden sm:flex">
            <span>{t("header.workspace")}</span>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden sm:flex" />
          <BreadcrumbItem>
            <BreadcrumbPage className="truncate font-medium">{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        <PreferenceControls className="hidden sm:flex" />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="h-10 gap-2 px-1.5 sm:px-2" />
            }
          >
            <Avatar size="sm">
              <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                {account.initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-medium text-foreground">
                {account.name}
              </span>
              <span className="block text-xs font-normal text-muted-foreground">
                {account.role}
              </span>
            </span>
            <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <span className="block text-sm font-medium text-foreground">
                  {account.name}
                </span>
                <span className="block truncate text-xs font-normal text-muted-foreground">
                  {account.email}
                </span>
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
