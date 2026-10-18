import {
  Activity,
  ChevronDown,
  LayoutDashboard,
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

export type HeaderIcon =
  | "dashboard"
  | "workflows"
  | "editor"
  | "chat"
  | "activity"
  | "settings";

interface HeaderProps {
  title: string;
  icon: HeaderIcon;
  loggingOut: boolean;
  onLogout: () => void;
}

const ICONS: Record<HeaderIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  workflows: Workflow,
  editor: Workflow,
  chat: MessageSquare,
  activity: Activity,
  settings: Settings,
};

const ACCOUNT = {
  name: "Azarya Geraldo",
  email: "admin@gmail.com",
  role: "Workspace admin",
  initials: "AG",
};

export default function Header({
  title,
  icon,
  loggingOut,
  onLogout,
}: HeaderProps) {
  const Icon = ICONS[icon];

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
            <span>Workspace</span>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden sm:flex" />
          <BreadcrumbItem>
            <BreadcrumbPage className="truncate font-medium">{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="h-10 gap-2 px-1.5 sm:px-2" />
            }
          >
            <Avatar size="sm">
              <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                {ACCOUNT.initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-medium text-foreground">
                {ACCOUNT.name}
              </span>
              <span className="block text-xs font-normal text-muted-foreground">
                {ACCOUNT.role}
              </span>
            </span>
            <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <span className="block text-sm font-medium text-foreground">
                  {ACCOUNT.name}
                </span>
                <span className="block truncate text-xs font-normal text-muted-foreground">
                  {ACCOUNT.email}
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
              {loggingOut ? "Logging out..." : "Logout"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
