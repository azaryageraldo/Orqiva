import { useCallback, useEffect, useMemo, useState } from "react";
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
    if (!needle) return contacts;

    return contacts.filter((contact) =>
      [
        contact.name,
        contact.contact_id,
        contact.workflow_name ?? "",
        contact.last_message ?? "",
      ].some((value) => value.toLowerCase().includes(needle)),
    );
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
    <section className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex min-h-0 w-full flex-1 flex-col gap-3">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
              {t("inbox.title")}
            </h1>
            <p className="mt-0.5 text-xs text-zinc-400">
              {t("inbox.subtitle")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-md border border-white/10 bg-[#0d0e11] px-2.5 py-1 text-xs text-zinc-400">
              {t("inbox.contactCount", { count: contacts.length })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void loadList();
                if (selectedId !== null) {
                  setDetailReload((current) => current + 1);
                }
              }}
              disabled={listLoading}
              className="h-8 gap-1.5 border-white/10 bg-[#0d0e11] text-xs"
            >
              <RefreshCw className={cn("size-3.5", listLoading && "animate-spin text-primary")} />
              <span>{t("inbox.refresh")}</span>
            </Button>
          </div>
        </div>

        {/* 2-Column Chat Workspace Frame */}
        <div className="grid min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-[#0e0f12] lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Left Column: Contact List */}
          <aside
            className={cn(
              "flex min-h-0 flex-col border-white/10 lg:flex lg:border-r",
              selectedId !== null ? "hidden" : "flex",
            )}
          >
            {/* Search Box */}
            <div className="shrink-0 border-b border-white/10 p-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-500" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("inbox.searchPlaceholder")}
                  aria-label={t("inbox.searchAria")}
                  className="h-8 rounded-lg border-white/10 bg-[#08090b] pr-7 pl-8 text-xs text-zinc-200 placeholder:text-zinc-500 [&::-webkit-search-cancel-button]:hidden"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Contact Items */}
            <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-white/[0.04]">
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
                    className="mt-3 h-7 text-xs border-white/10"
                  >
                    {t("common.retry")}
                  </Button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex h-52 flex-col items-center justify-center px-6 text-center">
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-500">
                    <InboxIcon className="size-5" />
                  </div>
                  <p className="text-xs font-medium text-zinc-300">
                    {query ? t("inbox.emptyQuery") : t("inbox.emptyTitle")}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {query ? t("inbox.emptyQueryHint") : t("inbox.emptyHint")}
                  </p>
                </div>
              ) : (
                filtered.map((contact) => {
                  const selected = contact.id === selectedId;
                  const meta = CONTACT_STATUS[contact.session_status];

                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => openContact(contact.id)}
                      className={cn(
                        "flex w-full items-start gap-3 p-3 text-left transition-colors",
                        selected
                          ? "bg-primary/[0.08] border-l-2 border-primary"
                          : "hover:bg-white/[0.02]",
                      )}
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-zinc-200">
                        {initials(contact.name)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-xs font-semibold text-zinc-100">
                            {contact.name}
                          </span>
                          <span className="shrink-0 text-[10px] text-zinc-500">
                            {listTime(contact.last_activity_at, locale)}
                          </span>
                        </div>

                        <p className="mt-0.5 truncate text-xs text-zinc-400">
                          {contact.last_message || t("inbox.noMessages")}
                        </p>

                        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-zinc-500">
                          <span className="inline-flex items-center gap-1">
                            <span className={cn("size-1.5 rounded-full", meta.dot)} />
                            <span>{t(meta.labelKey)}</span>
                          </span>
                          {contact.workflow_name && (
                            <>
                              <span>·</span>
                              <span className="truncate text-zinc-400">
                                {contact.workflow_name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Right Column: Chat View */}
          <div
            className={cn(
              "flex min-h-0 flex-col bg-[#0b0c0e]",
              selectedId !== null ? "flex" : "hidden lg:flex",
            )}
          >
            {selectedId === null ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <div className="mb-3 flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-500">
                  <InboxIcon className="size-6 text-primary/70" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-200">
                  {t("inbox.selectTitle")}
                </h3>
                <p className="mt-1 max-w-xs text-xs text-zinc-400 leading-relaxed">
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
                  className="mt-3 h-8 border-white/10 text-xs"
                >
                  {t("common.retry")}
                </Button>
              </div>
            ) : !detail ? (
              <div className="flex flex-1 items-center justify-center text-xs text-zinc-500">
                {t("inbox.detailUnavailable")}
              </div>
            ) : (
              <>
                {/* Chat Top Header */}
                <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0e0f12] px-4 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      aria-label={t("inbox.back")}
                      onClick={() => setSelectedId(null)}
                      className="inline-flex size-7 items-center justify-center rounded-md border border-white/10 text-zinc-400 hover:text-zinc-100 lg:hidden"
                    >
                      <ArrowLeft className="size-3.5" />
                    </button>

                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-zinc-200">
                      {initials(detail.name)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-xs font-semibold text-zinc-100">
                          {detail.name}
                        </h2>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.2 text-[10px] font-medium",
                            statusMeta.tone,
                          )}
                        >
                          <span className={cn("size-1.5 rounded-full", statusMeta.dot)} />
                          <span>{t(statusMeta.labelKey)}</span>
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-zinc-500 truncate">
                        {detail.contact_id}
                        {latestSession?.workflow_name && ` · ${latestSession.workflow_name}`}
                      </p>
                    </div>
                  </div>

                  {/* Takeover Actions */}
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
                        "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors disabled:opacity-50",
                        latestStatus === "human"
                          ? "border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-zinc-100"
                          : "bg-teal-500/15 border border-teal-500/30 text-teal-300 hover:bg-teal-500/25",
                      )}
                    >
                      {action ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="size-3.5" />
                      )}
                      <span>
                        {latestStatus === "human"
                          ? t("inbox.release")
                          : t("inbox.takeover")}
                      </span>
                    </button>
                  )}
                </header>

                {/* Notice & Error Alerts */}
                {detailError && (
                  <div className="border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">
                    {detailError}
                  </div>
                )}
                {notice && (
                  <div className="border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-300">
                    {notice}
                  </div>
                )}

                {/* Messages Body */}
                <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-6">
                  {detail.sessions.length === 0 ? (
                    <div className="flex h-full min-h-52 flex-col items-center justify-center text-center">
                      <Bot className="size-8 text-zinc-600 mb-2" />
                      <p className="text-xs text-zinc-400">
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
                </div>

                {/* Bottom Reply Area */}
                <div className="shrink-0 border-t border-white/10 bg-[#0e0f12] p-3">
                  {latestStatus === "human" && latestSession ? (
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
                          className="max-h-32 min-h-9 resize-none rounded-lg border-white/10 bg-[#08090b] text-xs text-zinc-200 placeholder:text-zinc-500"
                          disabled={sending}
                        />
                        <button
                          type="submit"
                          disabled={!reply.trim() || sending}
                          aria-label={t("inbox.sendReply")}
                          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-500 text-teal-950 font-medium hover:bg-teal-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {sending ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            <Send className="size-4" />
                          )}
                        </button>
                      </div>
                      <p className="mt-1.5 flex items-center gap-1 text-[11px] text-teal-400">
                        <ShieldCheck className="size-3" />
                        <span>{t("inbox.replyHint")} · Tekan Enter untuk kirim</span>
                      </p>
                    </form>
                  ) : latestSession ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
                      <span className="inline-flex items-center gap-2">
                        {latestStatus === "active" ? (
                          <>
                            <Bot className="size-4 text-primary" />
                            <span>{t("inbox.aiHandling")}</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="size-4 text-zinc-500" />
                            <span>{t("inbox.endedHint")}</span>
                          </>
                        )}
                      </span>
                      {latestStatus === "active" && (
                        <button
                          type="button"
                          onClick={() => void changeTakeover("takeover")}
                          disabled={action !== null}
                          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-teal-500/30 bg-teal-500/10 px-2.5 text-xs font-medium text-teal-300 hover:bg-teal-500/20 transition-colors"
                        >
                          <ShieldCheck className="size-3.5" />
                          <span>{t("inbox.takeover")}</span>
                        </button>
                      )}
                    </div>
                  ) : null}
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
  const { language, t } = useI18n();
  const locale = formatLocale(language);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[11px] text-zinc-400">
        <span className="font-medium text-zinc-200">
          Sesi #{session.id}
          {latest ? " (Terbaru)" : ""}
        </span>
        <span className="text-zinc-600">·</span>
        <span className="truncate">{session.workflow_name || "Workflow"}</span>
        <span className="text-zinc-600">·</span>
        <span>
          {session.started_at
            ? dayLabel(session.started_at, locale, t("inbox.dayUnknown"))
            : "—"}
        </span>
      </div>

      {session.messages.length === 0 ? (
        <p className="px-3 text-xs text-zinc-500">
          {t("inbox.noSessionMessages")}
        </p>
      ) : (
        <div className="space-y-3">
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
                    <p className="max-w-[85%] rounded-full border border-teal-500/25 bg-teal-500/[0.05] px-3 py-1 text-center text-[11px] text-teal-300">
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
    <p className="my-2 text-center text-[10px] font-medium tracking-wide text-zinc-500 uppercase">
      {dayLabel(value, locale, t("inbox.dayUnknown"))}
    </p>
  );
}

function MessageBubble({ message }: { message: InboxMessage }) {
  const { language, t } = useI18n();
  const locale = formatLocale(language);
  const isCustomer = message.role === "customer";
  const isAdmin = message.role === "admin";
  const Icon = isAdmin ? ShieldCheck : isCustomer ? User : Bot;

  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isCustomer ? "flex-row-reverse" : "",
      )}
    >
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs",
          isAdmin
            ? "border-teal-500/30 bg-teal-500/10 text-teal-300"
            : isCustomer
              ? "border-white/10 bg-white/5 text-zinc-400"
              : "border-primary/30 bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-3.5" />
      </div>

      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed",
          isAdmin
            ? "rounded-br-sm border border-teal-500/30 bg-teal-500/10 text-teal-100"
            : isCustomer
              ? "rounded-br-sm border border-white/10 bg-white/[0.06] text-zinc-100"
              : "rounded-bl-sm border border-primary/25 bg-primary/[0.08] text-zinc-100",
        )}
      >
        {isAdmin && (
          <p className="mb-0.5 text-[10px] font-semibold text-teal-300">
            {t("inbox.admin")}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p
          className={cn(
            "mt-1 text-[10px] text-zinc-500",
            isCustomer || isAdmin ? "text-right" : "",
          )}
        >
          {message.created_at
            ? new Intl.DateTimeFormat(locale, {
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(message.created_at))
            : ""}
        </p>
      </div>
    </div>
  );
}
