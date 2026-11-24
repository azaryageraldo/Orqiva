import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft,
  Bot,
  Inbox as InboxIcon,
  LoaderCircle,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  User,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatLocale, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "../services/api";
import {
  getContact,
  getInbox,
  releaseSession,
  sendAdminReply,
  takeOverSession,
  type InboxContact,
  type InboxContactDetail,
  type InboxMessage,
  type InboxSession,
} from "../services/inbox";

const CONTACT_STATUS: Record<
  InboxContact["session_status"],
  { labelKey: string; dot: string; tone: string }
> = {
  active: {
    labelKey: "inbox.status.active",
    dot: "bg-emerald-400",
    tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  },
  human: {
    labelKey: "inbox.status.human",
    dot: "bg-teal-400",
    tone: "border-teal-500/20 bg-teal-500/10 text-teal-300",
  },
  ended: {
    labelKey: "inbox.status.ended",
    dot: "bg-zinc-600",
    tone: "border-white/10 bg-white/5 text-zinc-400",
  },
};

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function listTime(value: string | null, locale: string): string {
  const date = parseDate(value);
  if (!date) return "";

  const now = new Date();

  if (isSameDay(date, now)) {
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  if (date.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
    }).format(date);
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function dayKey(value: string | null): string {
  const date = parseDate(value);
  return date ? date.toDateString() : "unknown";
}

function dayLabel(
  value: string | null,
  locale: string,
  fallback: string,
): string {
  const date = parseDate(value);
  if (!date) return fallback;

  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function Inbox() {
  const { language, t } = useI18n();
  const locale = formatLocale(language);
  const [contacts, setContacts] = useState<InboxContact[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<InboxContactDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailReload, setDetailReload] = useState(0);
  const [action, setAction] = useState<"takeover" | "release" | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  const currentMessageCount = useMemo(
    () => detail?.sessions.reduce((acc, s) => acc + s.messages.length, 0) ?? 0,
    [detail],
  );

  // Auto-scroll when new messages arrive or active contact changes
  useEffect(() => {
    if (currentMessageCount > prevMessageCountRef.current || prevMessageCountRef.current === 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCountRef.current = currentMessageCount;
  }, [currentMessageCount, selectedId]);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError("");

    try {
      const result = await getInbox();
      setContacts(result);
      setSelectedId((current) => {
        if (current !== null && result.some((item) => item.id === current)) {
          return current;
        }

        return window.matchMedia("(min-width: 1024px)").matches
          ? (result[0]?.id ?? null)
          : null;
      });
    } catch (caught) {
      setListError(getErrorMessage(caught, t("inbox.listError")));
    } finally {
      setListLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadList(), 0);
    return () => window.clearTimeout(timer);
  }, [loadList]);

  // shortcut: background poll every 3500ms, upgrade to WebSocket/SSE when concurrent agents exceed 100
  useEffect(() => {
    let active = true;

    const interval = window.setInterval(() => {
      if (document.hidden) return;

      getInbox()
        .then((result) => {
          if (!active) return;
          setContacts(result);
        })
        .catch(() => {});

      if (selectedId !== null) {
        getContact(selectedId)
          .then((result) => {
            if (!active) return;
            setDetail(result);
          })
          .catch(() => {});
      }
    }, 3500);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [selectedId]);

  useEffect(() => {
    if (selectedId === null) return;

    let active = true;

    const timer = window.setTimeout(() => {
      setDetailLoading(true);
      setDetailError("");

      getContact(selectedId)
        .then((result) => {
          if (active) setDetail(result);
        })
        .catch((caught: unknown) => {
          if (active) {
            setDetailError(getErrorMessage(caught, t("inbox.detailError")));
          }
        })
        .finally(() => {
          if (active) setDetailLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [selectedId, detailReload, t]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return contacts.filter((contact) => {
      if (!needle) return true;

      return [
        contact.name,
        contact.contact_id,
        contact.workflow_name ?? "",
        contact.last_message ?? "",
      ].some((value) => value.toLowerCase().includes(needle));
    });
  }, [contacts, query]);

  const latestSession = detail?.latest_session ?? null;
  const latestStatus = latestSession?.status ?? "ended";
  const statusMeta = CONTACT_STATUS[latestStatus];

  function openContact(contactId: number) {
    setReply("");
    setNotice("");
    setDetailError("");

    if (selectedId === contactId) {
      setDetailReload((current) => current + 1);
      return;
    }

    setSelectedId(contactId);
    setDetail(null);
  }

  async function changeTakeover(mode: "takeover" | "release") {
    if (!latestSession || action) return;

    setAction(mode);
    setDetailError("");
    setNotice("");

    try {
      if (mode === "takeover") {
        await takeOverSession(latestSession.id);
        setNotice(t("inbox.takeoverNotice"));
      } else {
        await releaseSession(latestSession.id);
        setNotice(t("inbox.releaseNotice"));
        setReply("");
      }

      setDetailReload((current) => current + 1);
      await loadList();
    } catch (caught) {
      setDetailError(getErrorMessage(caught, t("inbox.actionError")));
    } finally {
      setAction(null);
    }
  }

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = reply.trim();

    if (!latestSession || latestStatus !== "human" || !text || sending) return;

    setSending(true);
    setDetailError("");
    setNotice("");

    try {
      await sendAdminReply(latestSession.id, text);
      setReply("");
      setNotice(t("inbox.replySent"));
      setDetailReload((current) => current + 1);
      await loadList();
    } catch (caught) {
      setDetailError(getErrorMessage(caught, t("inbox.replyError")));
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 w-full flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
        {/* Workspace */}
        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Contact list */}
          <div
            className={cn(
              "flex min-h-0 flex-col gap-2",
              selectedId !== null ? "hidden lg:flex" : "flex",
            )}
          >
            <aside className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
              <div className="shrink-0 space-y-2.5 border-b border-border/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[13px] font-semibold text-foreground">
                    {t("inbox.conversations")}
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground">
                      {filtered.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        void loadList();
                        if (selectedId !== null) {
                          setDetailReload((current) => current + 1);
                        }
                      }}
                      disabled={listLoading}
                      aria-label={t("inbox.refresh")}
                      title={t("inbox.refresh")}
                      className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground disabled:opacity-50"
                    >
                      <RefreshCw
                        className={cn(
                          "size-3.5",
                          listLoading && "animate-spin",
                        )}
                      />
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t("inbox.searchPlaceholder")}
                    aria-label={t("inbox.searchAria")}
                    className="h-8 rounded-lg border-border bg-background/60 pr-7 pl-8 text-xs text-foreground placeholder:text-muted-foreground"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      aria-label={t("common.close")}
                      className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
                {listLoading && contacts.length === 0 ? (
                  <div className="flex h-40 items-center justify-center">
                    <LoaderCircle className="size-5 animate-spin text-primary" />
                  </div>
                ) : listError ? (
                  <div className="p-4 text-center">
                    <p className="text-xs text-destructive">{listError}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void loadList()}
                      className="mt-3 h-7 text-xs"
                    >
                      {t("common.retry")}
                    </Button>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex h-52 flex-col items-center justify-center px-6 text-center">
                    <div className="mb-2 flex size-10 items-center justify-center rounded-xl border border-border bg-background/60 text-muted-foreground">
                      <InboxIcon className="size-5" />
                    </div>
                    <p className="text-xs font-medium text-foreground">
                      {query ? t("inbox.emptyQuery") : t("inbox.emptyTitle")}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                      {query ? t("inbox.emptyQueryHint") : t("inbox.emptyHint")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filtered.map((contact) => {
                      const selected = contact.id === selectedId;
                      const meta = CONTACT_STATUS[contact.session_status];

                      return (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => openContact(contact.id)}
                          aria-current={selected ? "true" : undefined}
                          className={cn(
                            "group flex w-full items-start gap-3 rounded-xl border p-2.5 text-left transition-all focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
                            selected
                              ? "border-primary/40 bg-primary/[0.08] shadow-sm"
                              : "border-transparent hover:bg-accent/40",
                          )}
                        >
                          <div className="relative shrink-0">
                            <div
                              className={cn(
                                "flex size-9 items-center justify-center rounded-xl border text-xs font-semibold transition-colors",
                                selected
                                  ? "border-primary/40 bg-primary/15 text-primary"
                                  : "border-border bg-card text-muted-foreground group-hover:text-foreground",
                              )}
                            >
                              {initials(contact.name)}
                            </div>
                            <span
                              className={cn(
                                "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-background",
                                meta.dot,
                              )}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-1.5">
                              <span
                                className={cn(
                                  "truncate text-xs font-semibold",
                                  selected ? "text-primary" : "text-foreground",
                                )}
                              >
                                {contact.name}
                              </span>
                              <span className="shrink-0 text-[10px] text-muted-foreground font-mono">
                                {listTime(contact.last_activity_at, locale)}
                              </span>
                            </div>

                            <p className="mt-0.5 truncate text-[11px] leading-relaxed text-muted-foreground">
                              {contact.last_message || t("inbox.noMessages")}
                            </p>

                            <div className="mt-1 flex min-w-0 items-center gap-2 text-[10px]">
                              <span className="inline-flex shrink-0 items-center gap-1 font-medium text-muted-foreground">
                                <span
                                  className={cn(
                                    "size-1.5 rounded-full",
                                    meta.dot,
                                  )}
                                />
                                {t(meta.labelKey)}
                              </span>
                              {contact.workflow_name && (
                                <span className="truncate rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                                  {contact.workflow_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>
          </div>

          {/* Conversation */}
          <div
            className={cn(
              "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card",
              selectedId !== null ? "flex" : "hidden lg:flex",
            )}
          >
            {selectedId === null ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl border border-border bg-background/60 text-primary/70">
                  <InboxIcon className="size-6" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  {t("inbox.selectTitle")}
                </h3>
                <p className="mt-1.5 max-w-xs text-xs leading-5 text-muted-foreground">
                  {t("inbox.selectHint")}
                </p>
              </div>
            ) : detailLoading && !detail ? (
              <div className="flex flex-1 items-center justify-center">
                <LoaderCircle className="size-6 animate-spin text-primary" />
              </div>
            ) : detailError && !detail ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <p className="text-xs text-destructive">{detailError}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailReload((current) => current + 1)}
                  className="mt-3 h-8 text-xs"
                >
                  {t("common.retry")}
                </Button>
              </div>
            ) : !detail ? (
              <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
                {t("inbox.detailUnavailable")}
              </div>
            ) : (
              <>
                {/* Conversation header */}
                <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 bg-card/40 backdrop-blur">
                  <button
                    type="button"
                    aria-label={t("inbox.back")}
                    onClick={() => setSelectedId(null)}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
                  >
                    <ArrowLeft className="size-4" />
                  </button>

                  <div className="relative shrink-0">
                    <div className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-[11px] font-semibold text-foreground">
                      {initials(detail.name)}
                    </div>
                    <span
                      className={cn(
                        "absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-background",
                        statusMeta.dot,
                      )}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-[13px] font-semibold text-zinc-200">
                        {detail.name}
                      </h2>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-px text-[9px] font-medium",
                          statusMeta.tone,
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            statusMeta.dot,
                          )}
                        />
                        {t(statusMeta.labelKey)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-500">
                      {detail.contact_id}
                      {latestSession?.workflow_name &&
                        ` · ${latestSession.workflow_name}`}
                    </p>
                  </div>

                  {latestSession && latestSession.status !== "ended" && (
                    <button
                      type="button"
                      onClick={() =>
                        void changeTakeover(
                          latestStatus === "human" ? "release" : "takeover",
                        )
                      }
                      disabled={action !== null}
                      className={cn(
                        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors disabled:opacity-50",
                        latestStatus === "human"
                          ? "border border-border bg-card/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                          : "border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20",
                      )}
                    >
                      {action ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="size-3.5" />
                      )}
                      {latestStatus === "human"
                        ? t("inbox.release")
                        : t("inbox.takeover")}
                    </button>
                  )}
                </header>

                {/* Alerts */}
                {detailError && (
                  <div
                    role="alert"
                    className="border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-xs text-destructive/80"
                  >
                    {detailError}
                  </div>
                )}
                {notice && (
                  <div
                    role="status"
                    className="border-b border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-xs text-emerald-300/80"
                  >
                    {notice}
                  </div>
                )}

                {/* Messages */}
                <div className="relative min-h-0 flex-1 overflow-y-auto bg-background">
                  <div className="relative w-full space-y-3 p-3 pb-1">
                    {detail.sessions.length === 0 ? (
                      <div className="flex h-full min-h-52 flex-col items-center justify-center text-center">
                        <Bot className="mb-2 size-8 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          {t("inbox.noSessions")}
                        </p>
                      </div>
                    ) : (
                      detail.sessions.map((session) => (
                        <SessionHistory
                          key={session.id}
                          session={session}
                          latest={session.id === latestSession?.id}
                        />
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Composer */}
                <div className="shrink-0 border-t border-border bg-card/60 backdrop-blur-md p-3">
                  <div className="w-full max-w-none px-1">
                    {latestStatus === "human" && latestSession ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between rounded-lg border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs text-primary">
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-primary animate-pulse" />
                            <span className="font-medium">Human Operator Takeover Active</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => void changeTakeover("release")}
                            disabled={action !== null}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors underline decoration-dotted"
                          >
                            Release to AI
                          </button>
                        </div>

                        <form onSubmit={(event) => void submitReply(event)}>
                          <div className="flex items-end gap-2">
                            <Textarea
                              value={reply}
                              onChange={(event) => setReply(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" && !event.shiftKey) {
                                  event.preventDefault();
                                  event.currentTarget.form?.requestSubmit();
                                }
                              }}
                              rows={1}
                              maxLength={4000}
                              placeholder={t("inbox.replyPlaceholder")}
                              className="max-h-32 min-h-10 resize-none rounded-xl border border-border bg-background/80 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/15"
                              disabled={sending}
                            />
                            <button
                              type="submit"
                              disabled={!reply.trim() || sending}
                              aria-label={t("inbox.sendReply")}
                              className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/25 transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {sending ? (
                                <LoaderCircle className="size-4 animate-spin" />
                              ) : (
                                <Send className="size-4" />
                              )}
                            </button>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>
                              Press <kbd className="rounded border border-border bg-muted/60 px-1 py-0.5 font-mono text-[10px]">Enter</kbd> to send, <kbd className="rounded border border-border bg-muted/60 px-1 py-0.5 font-mono text-[10px]">Shift+Enter</kbd> for new line
                            </span>
                            <span className="font-mono text-[10px]">{reply.length}/4000</span>
                          </div>
                        </form>
                      </div>
                    ) : latestSession ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/60 px-3.5 py-2.5 text-xs">
                        <div className="flex items-center gap-2.5">
                          {latestStatus === "active" ? (
                            <>
                              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Bot className="size-4" />
                              </span>
                              <div>
                                <p className="font-semibold text-foreground text-xs leading-none">AI Agent Handling</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{t("inbox.aiHandling")}</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                <ShieldCheck className="size-4" />
                              </span>
                              <div>
                                <p className="font-semibold text-foreground text-xs leading-none">Session Resolved</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{t("inbox.endedHint")}</p>
                              </div>
                            </>
                          )}
                        </div>
                        {latestStatus === "active" && (
                          <button
                            type="button"
                            onClick={() => void changeTakeover("takeover")}
                            disabled={action !== null}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-50"
                          >
                            <ShieldCheck className="size-3.5" />
                            <span>{t("inbox.takeover")}</span>
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SessionHistory({
  session,
  latest,
}: {
  session: InboxSession;
  latest: boolean;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[10px] font-medium text-zinc-500">
            {t("inbox.sessionLabel", { id: session.id })}
          </span>
          {latest && (
            <span className="shrink-0 rounded-full border border-primary/20 bg-primary/5 px-1.5 py-px text-[9px] font-medium text-primary/60">
              {t("inbox.latest")}
            </span>
          )}
        </div>
        {session.workflow_name && (
          <span className="shrink-0 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {session.workflow_name}
          </span>
        )}
      </div>

      {session.messages.length === 0 ? (
        <p className="px-3 text-xs text-muted-foreground">
          {t("inbox.noSessionMessages")}
        </p>
      ) : (
        <div className="space-y-2">
          {session.messages.map((message, index) => {
            const previous = session.messages[index - 1];
            const showDay =
              index === 0 ||
              dayKey(previous.created_at) !== dayKey(message.created_at);

            if (message.role === "system") {
              return (
                <div key={message.id}>
                  {showDay && <DayLabel value={message.created_at} />}
                  <div className="flex justify-center">
                    <p className="max-w-[80%] rounded-full border border-border bg-card px-3 py-1 text-center text-[10px] text-muted-foreground uppercase tracking-tighter">
                      {message.content}
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div key={message.id}>
                {showDay && <DayLabel value={message.created_at} />}
                <MessageBubble message={message} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DayLabel({ value }: { value: string | null }) {
  const { language, t } = useI18n();
  const locale = formatLocale(language);

  return (
    <p className="my-4 flex justify-center">
      <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-tighter">
        {dayLabel(value, locale, t("inbox.dayUnknown"))}
      </span>
    </p>
  );
}

function MessageBubble({ message }: { message: InboxMessage }) {
  const { language } = useI18n();
  const locale = formatLocale(language);
  const isCustomer = message.role === "customer";
  const isAdmin = message.role === "admin";

  const timeStr = message.created_at
    ? new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(message.created_at))
    : "";

  return (
    <div className={cn("flex flex-col gap-1", isCustomer ? "items-end" : "items-start")}>
      <div className="flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground">
        {isAdmin ? (
          <>
            <ShieldCheck className="size-3 text-primary" />
            <span className="font-semibold text-foreground">Operator (You)</span>
          </>
        ) : isCustomer ? (
          <>
            <User className="size-3 text-muted-foreground" />
            <span className="font-semibold text-foreground">Customer</span>
          </>
        ) : (
          <>
            <Bot className="size-3 text-primary" />
            <span className="font-semibold text-primary">Orqiva AI</span>
          </>
        )}
        <span>·</span>
        <span className="font-mono">{timeStr}</span>
      </div>

      <div
        className={cn(
          "max-w-[76%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed break-words whitespace-pre-wrap shadow-sm",
          isAdmin
            ? "rounded-tr-none bg-primary text-primary-foreground font-normal"
            : isCustomer
              ? "rounded-tr-none border border-primary/25 bg-primary/10 text-foreground"
              : "rounded-tl-none border border-border bg-card text-foreground",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
