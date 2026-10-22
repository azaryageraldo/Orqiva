import { useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Braces,
  Check,
  Code2,
  Copy,
  Globe2,
  Inbox,
  Layers,
  LifeBuoy,
  Mail,
  Rocket,
  Search,
  ShieldCheck,
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
  APP_DEVELOPER,
  APP_LICENSE,
  APP_VERSION,
  DEVELOPER_EMAIL,
  DEVELOPER_GITHUB,
  DEVELOPER_INSTAGRAM,
  DEVELOPER_LINKEDIN,
  DEVELOPER_TIKTOK,
  REPOSITORY_URL,
} from "@/lib/constants";
import {
  AUDIT,
  CHANNELS,
  CONCEPTS,
  EXAMPLES,
  INBOX,
  NODES,
  QUICK_START,
  SECURITY,
  VARIABLES,
  type HelpExample,
  type HelpNode,
  type HelpSection,
  type Localized,
} from "@/lib/helpContent";
import { useI18n } from "@/lib/i18n";

interface HelpProps {
  onOpenAiProviders: () => void;
  onOpenWorkflows: () => void;
  onOpenChannel: () => void;
}

const SECTION_ICONS: Record<string, LucideIcon> = {
  quickstart: Rocket,
  concepts: BookOpen,
  nodes: Workflow,
  variables: Braces,
  examples: Layers,
  channels: Globe2,
  inbox: Inbox,
  audit: Activity,
  security: ShieldCheck,
};

const SOCIALS = [
  { labelKey: "help.socialGithub", href: DEVELOPER_GITHUB, icon: Code2 },
  { labelKey: "help.socialTiktok", href: DEVELOPER_TIKTOK, icon: Code2 },
  { labelKey: "help.socialLinkedin", href: DEVELOPER_LINKEDIN, icon: Code2 },
  { labelKey: "help.socialInstagram", href: DEVELOPER_INSTAGRAM, icon: Code2 },
];

export default function Help({
  onOpenAiProviders,
  onOpenWorkflows,
  onOpenChannel,
}: HelpProps) {
  const { language, t } = useI18n();
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const pick = (value: Localized) => value[language];
  const normalizedQuery = query.trim().toLowerCase();

  const matches = (...values: Array<Localized | string>) => {
    if (!normalizedQuery) return true;

    return values
      .map((value) => (typeof value === "string" ? value : value[language]))
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  };

  const sectionMatches = (section: HelpSection) =>
    matches(
      section.title,
      section.intro,
      ...section.blocks.flatMap((block) => [
        block.title ?? "",
        block.body,
      ]),
      ...(section.bullets ?? []),
    );

  const nodeMatches = (node: HelpNode) =>
    matches(
      node.type,
      node.tagline,
      node.purpose,
      ...node.config,
      node.output,
      ...node.notes,
    );

  const exampleMatches = (example: HelpExample) =>
    matches(example.title, example.description);

  const visibleNodes = NODES.filter(nodeMatches);
  const visibleExamples = EXAMPLES.filter(exampleMatches);

  async function copy(id: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  }

  const developerMatches = matches(
    t("help.developer"),
    t("help.developerDescription"),
    DEVELOPER_EMAIL,
    APP_DEVELOPER,
    "developer",
  );

  const toc = [
    QUICK_START,
    CONCEPTS,
    { id: "nodes", title: { id: "Referensi node", en: "Node reference" } },
    { id: "variables", title: { id: "Variabel", en: "Variables" } },
    { id: "examples", title: { id: "Contoh workflow", en: "Examples" } },
    CHANNELS,
    INBOX,
    AUDIT,
    SECURITY,
    { id: "developer", title: { id: "Developer", en: "Developer" } },
  ].filter((item) => {
    if (!normalizedQuery) return true;
    const section = [QUICK_START, CONCEPTS, CHANNELS, INBOX, AUDIT, SECURITY]
      .find((candidate) => candidate.id === item.id);

    if (section) return sectionMatches(section);
    if (item.id === "nodes") return visibleNodes.length > 0;
    if (item.id === "examples") return visibleExamples.length > 0;
    if (item.id === "variables") {
      return VARIABLES.some((variable) =>
        matches(variable.token, variable.description),
      );
    }

    if (item.id === "developer") return developerMatches;

    return true;
  });

  const hasResults = toc.length > 0;

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

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="min-w-0 space-y-4">
            {!hasResults && (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  {t("help.noResults")}
                </CardContent>
              </Card>
            )}

            {sectionMatches(QUICK_START) && (
              <SectionShell
                section={QUICK_START}
                icon={Rocket}
                pick={pick}
              >
                <ol className="space-y-3">
                  {QUICK_START.blocks.map((block, index) => (
                    <li
                      key={index}
                      className="rounded-lg border border-border bg-muted/15 p-3.5"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {block.title ? pick(block.title) : null}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {pick(block.body)}
                      </p>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onOpenAiProviders}
                  >
                    {t("settings.manageKeys")}
                    <ArrowUpRight />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onOpenWorkflows}
                  >
                    {t("nav.workflows")}
                    <ArrowUpRight />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onOpenChannel}
                  >
                    {t("nav.channel")}
                    <ArrowUpRight />
                  </Button>
                </div>
              </SectionShell>
            )}

            {sectionMatches(CONCEPTS) && (
              <SectionShell section={CONCEPTS} icon={BookOpen} pick={pick}>
                <ul className="space-y-2">
                  {CONCEPTS.bullets?.map((bullet, index) => (
                    <li
                      key={index}
                      className="flex gap-2 text-sm leading-6 text-muted-foreground"
                    >
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{pick(bullet)}</span>
                    </li>
                  ))}
                </ul>
              </SectionShell>
            )}

            {visibleNodes.length > 0 && (
              <SectionShell
                section={{
                  id: "nodes",
                  title: { id: "Referensi node", en: "Node reference" },
                  intro: {
                    id: "Tujuh node yang tersedia di editor, lengkap dengan konfigurasi dan contoh schema.",
                    en: "The seven nodes available in the editor, with configuration and schema examples.",
                  },
                  blocks: [],
                }}
                icon={Workflow}
                pick={pick}
              >
                <div className="grid gap-3">
                  {visibleNodes.map((node) => (
                    <NodeCard
                      key={node.id}
                      node={node}
                      language={language}
                      t={t}
                      copied={copied === node.id}
                      onCopy={() => void copy(node.id, node.schema)}
                    />
                  ))}
                </div>
              </SectionShell>
            )}

            {VARIABLES.some((variable) => matches(variable.token, variable.description)) && (
              <SectionShell
                section={{
                  id: "variables",
                  title: { id: "Variabel dan templating", en: "Variables and templating" },
                  intro: {
                    id: "Gunakan {{token}} di system prompt dan template pesan. Variabel berasal dari Trigger atau output AI Agent.",
                    en: "Use {{token}} in system prompts and message templates. Variables come from the Trigger or AI Agent outputs.",
                  },
                  blocks: [],
                }}
                icon={Braces}
                pick={pick}
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">Token</th>
                        <th className="py-2 pr-4 font-medium">Type</th>
                        <th className="py-2 font-medium">
                          {t("help.description")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {VARIABLES.filter((variable) =>
                        matches(variable.token, variable.description),
                      ).map((variable) => (
                        <tr
                          key={variable.token}
                          className="border-b border-border/60 align-top"
                        >
                          <td className="py-2.5 pr-4">
                            <code className="font-mono text-[11px] text-primary">
                              {variable.token}
                            </code>
                          </td>
                          <td className="py-2.5 pr-4 font-mono text-[11px] text-muted-foreground">
                            {variable.type}
                          </td>
                          <td className="py-2.5 text-muted-foreground">
                            {pick(variable.description)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionShell>
            )}

            {visibleExamples.length > 0 && (
              <SectionShell
                section={{
                  id: "examples",
                  title: { id: "Contoh workflow", en: "Workflow examples" },
                  intro: {
                    id: "Tiga pola umum: FAQ, kualifikasi dengan handoff, dan perpindahan antar-workflow.",
                    en: "Three common patterns: FAQ, qualification with handoff, and cross-workflow routing.",
                  },
                  blocks: [],
                }}
                icon={Layers}
                pick={pick}
              >
                <div className="space-y-3">
                  {visibleExamples.map((example) => (
                    <details
                      key={example.id}
                      className="group rounded-lg border border-border bg-muted/15"
                    >
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3">
                        <span>
                          <span className="block text-sm font-medium text-foreground">
                            {pick(example.title)}
                          </span>
                          <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                            {pick(example.description)}
                          </span>
                        </span>
                        <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition group-open:rotate-90" />
                      </summary>
                      <div className="border-t border-border p-3">
                        <div className="mb-2 flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              void copy(example.id, example.workflow)
                            }
                          >
                            {copied === example.id ? <Check /> : <Copy />}
                            {copied === example.id
                              ? t("help.copied")
                              : t("help.copy")}
                          </Button>
                        </div>
                        <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-background p-3 font-mono text-[11px] leading-5 text-muted-foreground">
                          <code>{example.workflow}</code>
                        </pre>
                      </div>
                    </details>
                  ))}
                </div>
              </SectionShell>
            )}

            {([CHANNELS, INBOX, AUDIT, SECURITY] as HelpSection[])
              .filter((section) => sectionMatches(section))
              .map((section) => (
                <SectionShell
                  key={section.id}
                  section={section}
                  icon={SECTION_ICONS[section.id] ?? BookOpen}
                  pick={pick}
                >
                  <div className="space-y-3">
                    {section.blocks.map((block, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-border bg-muted/15 p-3.5"
                      >
                        {block.title && (
                          <p className="text-sm font-medium text-foreground">
                            {pick(block.title)}
                          </p>
                        )}
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {pick(block.body)}
                        </p>
                      </div>
                    ))}
                  </div>
                </SectionShell>
              ))}

            {developerMatches && (
            <Card id="help-developer">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="size-4 text-muted-foreground" />
                  {t("help.developer")}
                </CardTitle>
                <CardDescription>
                  {t("help.developerDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{APP_DEVELOPER}</Badge>
                  <Badge variant="outline">{APP_LICENSE}</Badge>
                  <Badge variant="outline">v{APP_VERSION}</Badge>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  Laravel · PHP · React · TypeScript · Vite · Tailwind CSS
                </p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  <a
                    href={`mailto:${DEVELOPER_EMAIL}`}
                    className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/30 hover:bg-primary/[0.06]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Mail className="size-3.5 text-muted-foreground" />
                      {DEVELOPER_EMAIL}
                    </span>
                    <ArrowUpRight className="size-3.5 text-muted-foreground transition group-hover:text-primary" />
                  </a>
                  <a
                    href={REPOSITORY_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/30 hover:bg-primary/[0.06]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Code2 className="size-3.5 text-muted-foreground" />
                      {t("help.repository")}
                    </span>
                    <ArrowUpRight className="size-3.5 text-muted-foreground transition group-hover:text-primary" />
                  </a>
                  <a
                    href={DEVELOPER_GITHUB}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/30 hover:bg-primary/[0.06]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Code2 className="size-3.5 text-muted-foreground" />
                      {t("help.socialGithub")}
                    </span>
                    <ArrowUpRight className="size-3.5 text-muted-foreground transition group-hover:text-primary" />
                  </a>
                  {SOCIALS.slice(1).map((social) => {
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
                <Separator />
                <p className="text-[11px] leading-5 text-muted-foreground">
                  {t("help.licenseDescription")}
                </p>
              </CardContent>
            </Card>
            )}
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
                {toc.map((item) => {
                  const Icon = SECTION_ICONS[item.id] ?? Code2;

                  return (
                    <a
                      key={item.id}
                      href={`#help-${item.id}`}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <Icon className="size-3.5" />
                      {pick(item.title)}
                    </a>
                  );
                })}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </section>
  );
}

function SectionShell({
  section,
  icon: Icon,
  pick,
  children,
}: {
  section: HelpSection;
  icon: LucideIcon;
  pick: (value: Localized) => string;
  children: ReactNode;
}) {
  return (
    <Card id={`help-${section.id}`}>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          {pick(section.title)}
        </CardTitle>
        <CardDescription>{pick(section.intro)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-3">{children}</CardContent>
    </Card>
  );
}

function NodeCard({
  node,
  language,
  t,
  copied,
  onCopy,
}: {
  node: HelpNode;
  language: "id" | "en";
  t: (key: string) => string;
  copied: boolean;
  onCopy: () => void;
}) {
  const pick = (value: Localized) => value[language];

  return (
    <div className="rounded-xl border border-border bg-muted/10">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/70 px-4 py-3">
        <div>
          <p className="font-mono text-xs font-medium text-primary">
            {node.type}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {pick(node.tagline)}
          </p>
        </div>
        <Badge variant="outline">{node.id}</Badge>
      </div>

      <div className="space-y-4 px-4 py-3">
        <p className="text-xs leading-5 text-muted-foreground">
          {pick(node.purpose)}
        </p>

        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {t("help.config")}
          </p>
          <ul className="mt-2 space-y-1.5">
            {node.config.map((item, index) => (
              <li
                key={index}
                className="flex gap-2 text-xs leading-5 text-muted-foreground"
              >
                <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                <span>{pick(item)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-background/60 p-3">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              {t("help.output")}
            </p>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
              {pick(node.output)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background/60 p-3">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              {t("help.notes")}
            </p>
            <ul className="mt-1.5 space-y-1">
              {node.notes.map((note, index) => (
                <li
                  key={index}
                  className="text-xs leading-5 text-muted-foreground"
                >
                  {pick(note)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <details className="group rounded-lg border border-border bg-background/60">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-foreground">
            {t("help.schema")}
            <ArrowRight className="size-3.5 text-muted-foreground transition group-open:rotate-90" />
          </summary>
          <div className="border-t border-border p-3">
            <div className="mb-2 flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={onCopy}>
                {copied ? <Check /> : <Copy />}
                {copied ? t("help.copied") : t("help.copy")}
              </Button>
            </div>
            <pre className="max-h-72 overflow-auto font-mono text-[11px] leading-5 text-muted-foreground">
              <code>{node.schema}</code>
            </pre>
          </div>
        </details>
      </div>
    </div>
  );
}
