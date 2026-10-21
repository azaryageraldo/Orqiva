import { useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bot,
  Briefcase,
  Camera,
  Clock3,
  Code2,
  GitBranch,
  Globe2,
  HelpCircle,
  Inbox,
  KeyRound,
  LifeBuoy,
  MousePointerClick,
  Music2,
  Scale,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  APP_VERSION,
  DEVELOPER_GITHUB,
  DEVELOPER_INSTAGRAM,
  DEVELOPER_LINKEDIN,
  DEVELOPER_TIKTOK,
} from "@/lib/constants";
import { useI18n } from "@/lib/i18n";

interface HelpProps {
  onOpenAiProviders: () => void;
  onOpenWorkflows: () => void;
  onOpenChannel: () => void;
}

interface HelpSection {
  id: string;
  icon: LucideIcon;
  titleKey: string;
  introKey: string;
  action?: {
    labelKey: string;
    onClick: () => void;
  };
}

const NODES = [
  { id: "trigger", labelKey: "trigger", icon: MousePointerClick },
  { id: "ai.agent", labelKey: "agent", icon: Bot },
  { id: "condition", labelKey: "condition", icon: GitBranch },
  { id: "delay", labelKey: "delay", icon: Clock3 },
  { id: "send.message", labelKey: "send", icon: Send },
  { id: "relocate", labelKey: "relocate", icon: Users },
];

const FAQ = ["model", "widget", "queue", "reset"];

const SOCIALS = [
  {
    labelKey: "help.socialGithub",
    href: DEVELOPER_GITHUB,
    icon: Code2,
  },
  {
    labelKey: "help.socialTiktok",
    href: DEVELOPER_TIKTOK,
    icon: Music2,
  },
  {
    labelKey: "help.socialLinkedin",
    href: DEVELOPER_LINKEDIN,
    icon: Briefcase,
  },
  {
    labelKey: "help.socialInstagram",
    href: DEVELOPER_INSTAGRAM,
    icon: Camera,
  },
];

export default function Help({
  onOpenAiProviders,
  onOpenWorkflows,
  onOpenChannel,
}: HelpProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");

  const sections: HelpSection[] = [
    {
      id: "account",
      icon: UserRound,
      titleKey: "help.section.account.title",
      introKey: "help.section.account.intro",
    },
    {
      id: "ai",
      icon: KeyRound,
      titleKey: "help.section.ai.title",
      introKey: "help.section.ai.intro",
      action: {
        labelKey: "settings.manageKeys",
        onClick: onOpenAiProviders,
      },
    },
    {
      id: "workflow",
      icon: Workflow,
      titleKey: "help.section.workflow.title",
      introKey: "help.section.workflow.intro",
      action: {
        labelKey: "nav.workflows",
        onClick: onOpenWorkflows,
      },
    },
    {
      id: "channel",
      icon: Globe2,
      titleKey: "help.section.channel.title",
      introKey: "help.section.channel.intro",
      action: {
        labelKey: "nav.channel",
        onClick: onOpenChannel,
      },
    },
    {
      id: "inbox",
      icon: Inbox,
      titleKey: "help.section.inbox.title",
      introKey: "help.section.inbox.intro",
    },
    {
      id: "audit",
      icon: Activity,
      titleKey: "help.section.audit.title",
      introKey: "help.section.audit.intro",
    },
    {
      id: "security",
      icon: ShieldCheck,
      titleKey: "help.section.security.title",
      introKey: "help.section.security.intro",
    },
    {
      id: "license",
      icon: Scale,
      titleKey: "help.section.license.title",
      introKey: "help.section.license.intro",
    },
  ];

  const normalizedQuery = query.trim().toLowerCase();

  const filteredSections = normalizedQuery
    ? sections.filter((section) =>
        [t(section.titleKey), t(section.introKey)]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : sections;

  return (
    <section className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              <LifeBuoy className="size-4" />
              {t("help.eyebrow")}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {t("help.title")}
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("help.subtitle")}
            </p>
          </div>

          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("help.search")}
              aria-label={t("help.search")}
              className="h-10 pl-9"
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-4">
            {filteredSections.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  {t("help.noResults")}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredSections.map((section) => {
                  const Icon = section.icon;

                  return (
                    <Card key={section.id} id={`help-${section.id}`}>
                      <CardHeader className="border-b">
                        <CardTitle className="flex items-center gap-2">
                          <Icon className="size-4 text-primary" />
                          {t(section.titleKey)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-2">
                        <p className="text-sm leading-6 text-muted-foreground">
                          {t(section.introKey)}
                        </p>
                        {section.action && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={section.action.onClick}
                          >
                            {t(section.action.labelKey)}
                            <ArrowUpRight />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <Card id="help-nodes">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="size-4 text-muted-foreground" />
                  {t("help.nodeReference")}
                </CardTitle>
                <CardDescription>
                  {t("help.nodeReferenceDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 pt-2 sm:grid-cols-2">
                {NODES.map((node) => {
                  const Icon = node.icon;

                  return (
                    <div
                      key={node.id}
                      className="rounded-lg border border-border bg-muted/15 px-3.5 py-3"
                    >
                      <p className="flex items-center gap-2 font-mono text-xs font-medium text-foreground">
                        <Icon className="size-3.5 text-primary" />
                        {node.id}
                      </p>
                      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                        {t(`help.node.${node.labelKey}`)}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card id="help-faq">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="size-4 text-muted-foreground" />
                  {t("help.faq")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {FAQ.map((item) => (
                  <details
                    key={item}
                    className="group rounded-lg border border-border bg-muted/15 px-4 py-3"
                  >
                    <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                      <span className="flex items-center justify-between gap-3">
                        {t(`help.faq.${item}.title`)}
                        <ArrowRight className="size-4 text-muted-foreground transition group-open:rotate-90" />
                      </span>
                    </summary>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {t(`help.faq.${item}.answer`)}
                    </p>
                  </details>
                ))}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4">
            <Card className="lg:sticky lg:top-20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BookOpen className="size-4 text-muted-foreground" />
                  {t("help.onThisPage")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <a
                  href="#help-account"
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <UserRound className="size-3.5" />
                  {t("help.section.account.title")}
                </a>
                {sections.slice(1).map((section) => (
                  <a
                    key={section.id}
                    href={`#help-${section.id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <section.icon className="size-3.5" />
                    {t(section.titleKey)}
                  </a>
                ))}
                <Separator className="my-2" />
                <a
                  href="#help-nodes"
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <Workflow className="size-3.5" />
                  {t("help.nodeReference")}
                </a>
                <a
                  href="#help-faq"
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <HelpCircle className="size-3.5" />
                  {t("help.faq")}
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Code2 className="size-4 text-muted-foreground" />
                  {t("help.developer")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs leading-5 text-muted-foreground">
                  {t("help.developerDescription")}
                </p>
                <div className="space-y-1.5">
                  {SOCIALS.map((social) => {
                    const Icon = social.icon;

                    return (
                      <a
                        key={social.href}
                        href={social.href}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/30 hover:bg-primary/[0.06]"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Icon className="size-3.5 text-muted-foreground" />
                          {t(social.labelKey)}
                        </span>
                        <ArrowUpRight className="size-3.5 text-muted-foreground transition group-hover:text-primary" />
                      </a>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Scale className="size-4 text-muted-foreground" />
                  {t("help.license")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs leading-5 text-muted-foreground">
                  {t("help.licenseDescription")}
                </p>
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">
                    {t("settings.license")}
                  </span>
                  <Badge variant="outline">MIT</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">
                    {t("settings.version")}
                  </span>
                  <span className="font-mono text-foreground">
                    {APP_VERSION}
                  </span>
                </div>
                <p className="text-[11px] leading-5 text-muted-foreground">
                  {t("settings.madeBy")}
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </section>
  );
}
