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
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const timeFormat = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
});

const dayFormat = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortDateFormat = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
});

const CONTACT_STATUS: Record<
  InboxContact["session_status"],
  { label: string; dot: string; tone: string }
> = {
  active: {
    label: "AI aktif",
    dot: "bg-emerald-400",
    tone: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  },
  human: {
    label: "Admin",
    dot: "bg-teal-400",
    tone: "border-teal-400/25 bg-teal-400/10 text-teal-300",
  },
  ended: {
    label: "Selesai",
    dot: "bg-muted-foreground",
    tone: "border-border bg-muted/40 text-muted-foreground",
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

function listTime(value: string | null): string {
  const date = parseDate(value);
  if (!date) return "";

  const now = new Date();

  if (isSameDay(date, now)) return timeFormat.format(date);
  if (date.getFullYear() === now.getFullYear()) {
    return shortDateFormat.format(date);
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function dayKey(value: string | null): string {
  const date = parseDate(value);
  return date ? date.toDateString() : "unknown";
}

function dayLabel(value: string | null): string {
  const date = parseDate(value);
  return date ? dayFormat.format(date) : "Tanggal tidak diketahui";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function sessionTone(status: InboxSession["status"]): string {
  return CONTACT_STATUS[status].tone;
}

export default function Inbox() {
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
      setListError(
        getErrorMessage(
          caught,
          "Daftar contact gagal dimuat. Periksa koneksi backend.",
        ),
      );
    } finally {
      setListLoading(false);
    }
  }, []);

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
            setDetailError(
              getErrorMessage(
                caught,
                "Riwayat contact gagal dimuat. Coba lagi.",
              ),
            );
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
  }, [selectedId, detailReload]);

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
  const messageCount =
    detail?.sessions.reduce(
      (total, session) => total + session.messages.length,
      0,
    ) ?? 0;

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
        setNotice("Percakapan diambil alih. Anda dapat membalas sebagai admin.");
      } else {
        await releaseSession(latestSession.id);
        setNotice("Percakapan dikembalikan ke AI.");
        setReply("");
      }

      setDetailReload((current) => current + 1);
      await loadList();
    } catch (caught) {
      setDetailError(
        getErrorMessage(caught, "Status percakapan gagal diubah. Coba lagi."),
      );
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
      setNotice("Balasan admin terkirim.");
      setDetailReload((current) => current + 1);
      await loadList();
    } catch (caught) {
      setDetailError(
        getErrorMessage(caught, "Balasan admin gagal dikirim. Coba lagi."),
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
        <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              <InboxIcon className="size-4" />
              Workspace
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Inbox
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Riwayat lengkap per contact, dengan takeover per session.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
              {contacts.length} contact
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void loadList();
                if (selectedId !== null) {
                  setDetailReload((current) => current + 1);
                }
              }}
              disabled={listLoading}
              className="h-9 px-3"
            >
              <RefreshCw className={listLoading ? "animate-spin" : undefined} />
              Segarkan
            </Button>
          </div>
        </div>

        <Card className="grid min-h-0 flex-1 gap-0 overflow-hidden py-0 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside
            className={`min-h-0 flex-col border-border lg:flex lg:border-r ${
              selectedId !== null ? "hidden" : "flex"
            }`}
          >
            <div className="shrink-0 border-b border-border p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari nama, ID, atau pesan..."
                  aria-label="Cari contact"
                  className="h-9 pl-8 dark:bg-input/30"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {listLoading && contacts.length === 0 ? (
                <div className="flex h-40 items-center justify-center">
                  <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : listError ? (
                <div className="p-4">
                  <p className="text-sm text-destructive">{listError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void loadList()}
                    className="mt-3"
                  >
                    Coba lagi
                  </Button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex h-52 flex-col items-center justify-center px-6 text-center">
                  <span className="flex size-11 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground">
                    <InboxIcon className="size-5" />
                  </span>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    {query ? "Contact tidak ditemukan" : "Inbox masih kosong"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {query
                      ? "Coba kata kunci lain."
                      : "Contact muncul setelah pelanggan mengirim pesan lewat widget Channel."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {filtered.map((contact) => {
                    const selected = contact.id === selectedId;
                    const meta = CONTACT_STATUS[contact.session_status];

                    return (
                      <li key={contact.id}>
                        <button
                          type="button"
                          onClick={() => openContact(contact.id)}
                          className={`flex w-full items-start gap-3 px-3 py-3 text-left transition ${
                            selected ? "bg-primary/[0.08]" : "hover:bg-muted/40"
                          }`}
                        >
                          <span
                            className={`flex size-9 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold ${
                              selected
                                ? "border-primary/30 bg-primary/15 text-primary"
                                : "border-border bg-muted/50 text-muted-foreground"
                            }`}
                          >
                            {initials(contact.name)}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className="truncate text-sm font-medium text-foreground">
                                {contact.name}
                              </span>
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {listTime(contact.last_activity_at)}
                              </span>
                            </span>

                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {contact.last_message || "Belum ada pesan"}
                            </span>

                            <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <span className={`size-1.5 rounded-full ${meta.dot}`} />
                                {meta.label}
                              </span>
                              <span className="text-muted-foreground/50">·</span>
                              <span className="truncate">
                                {contact.session_count} session
                              </span>
                              <span className="font-mono text-muted-foreground/70">
                                {contact.contact_id}
                              </span>
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          <div
            className={`min-h-0 flex-col ${
              selectedId !== null ? "flex" : "hidden lg:flex"
            }`}
          >
            {selectedId === null ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <span className="flex size-14 items-center justify-center rounded-2xl border border-border bg-background text-primary">
                  <InboxIcon className="size-6" />
                </span>
                <p className="mt-4 text-sm font-medium text-foreground">
                  Pilih contact
                </p>
                <p className="mt-1 max-w-xs text-sm leading-6 text-muted-foreground">
                  Pilih contact di kiri untuk melihat seluruh riwayat session
                  dan mengambil alih percakapan.
                </p>
              </div>
            ) : detailLoading && !detail ? (
              <div className="flex flex-1 items-center justify-center">
                <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : detailError && !detail ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <p className="text-sm text-destructive">{detailError}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailReload((current) => current + 1)}
                  className="mt-3"
                >
                  Coba lagi
                </Button>
              </div>
            ) : !detail ? (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Detail contact tidak tersedia.
              </div>
            ) : (
              <>
                <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-3 py-3 sm:px-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Kembali ke daftar contact"
                    onClick={() => setSelectedId(null)}
                    className="lg:hidden"
                  >
                    <ArrowLeft />
                  </Button>

                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-sm font-semibold text-primary">
                    {initials(detail.name)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h2 className="truncate text-sm font-semibold text-foreground">
                        {detail.name}
                      </h2>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusMeta.tone}`}
                      >
                        <span className={`size-1.5 rounded-full ${statusMeta.dot}`} />
                        {statusMeta.label}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      <span className="font-mono">{detail.contact_id}</span> ·{" "}
                      {detail.sessions.length} session · {messageCount} pesan
                      {latestSession?.workflow_name
                        ? ` · ${latestSession.workflow_name}`
                        : ""}
                    </p>
                  </div>

                  {latestSession && latestSession.status !== "ended" && (
                    <Button
                      type="button"
                      variant={latestStatus === "human" ? "outline" : "default"}
                      size="sm"
                      onClick={() =>
                        void changeTakeover(
                          latestStatus === "human" ? "release" : "takeover",
                        )
                      }
                      disabled={action !== null}
                      className="h-9 shrink-0"
                    >
                      {action ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <ShieldCheck />
                      )}
                      {latestStatus === "human"
                        ? "Kembalikan ke AI"
                        : "Ambil alih"}
                    </Button>
                  )}
                </header>

                {detailError && (
                  <div className="border-b border-destructive/20 bg-destructive/[0.06] px-4 py-2 text-xs text-destructive">
                    {detailError}
                  </div>
                )}

                {notice && (
                  <div className="border-b border-emerald-400/20 bg-emerald-400/[0.05] px-4 py-2 text-xs text-emerald-200">
                    {notice}
                  </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                  {detail.sessions.length === 0 ? (
                    <div className="flex h-full min-h-52 flex-col items-center justify-center text-center">
                      <Bot className="size-7 text-muted-foreground" />
                      <p className="mt-3 text-sm text-muted-foreground">
                        Belum ada session untuk contact ini.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {detail.sessions.map((session) => (
                        <SessionHistory
                          key={session.id}
                          session={session}
                          latest={session.id === latestSession?.id}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="shrink-0 border-t border-border p-3 sm:p-4">
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
                          placeholder="Balas sebagai admin..."
                          className="max-h-32 min-h-10 resize-none"
                          disabled={sending}
                        />
                        <Button
                          type="submit"
                          size="icon-lg"
                          disabled={!reply.trim() || sending}
                          aria-label="Kirim balasan admin"
                        >
                          {sending ? (
                            <LoaderCircle className="animate-spin" />
                          ) : (
                            <Send />
                          )}
                        </Button>
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-teal-300">
                        <ShieldCheck className="size-3.5" />
                        Anda membalas sebagai admin. AI berhenti hingga
                        percakapan dikembalikan.
                      </p>
                    </form>
                  ) : latestSession ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        {latestStatus === "active" ? (
                          <>
                            <Bot className="size-4 text-primary" />
                            AI menangani session ini. Ambil alih untuk membalas.
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="size-4" />
                            Session sudah berakhir. Pelanggan perlu membuka
                            widget baru.
                          </>
                        )}
                      </span>
                      {latestStatus === "active" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void changeTakeover("takeover")}
                          disabled={action !== null}
                        >
                          <ShieldCheck />
                          Ambil alih
                        </Button>
                      )}
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </Card>
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
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/25 px-3 py-2 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">
          Session #{session.id}
          {latest ? " · terbaru" : ""}
        </span>
        <span className="text-muted-foreground/50">·</span>
        <span>{session.workflow_name || "Workflow"}</span>
        <span className="text-muted-foreground/50">·</span>
        <span>{session.started_at ? dayLabel(session.started_at) : "—"}</span>
        <span
          className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${sessionTone(session.status)}`}
        >
          <span
            className={`size-1.5 rounded-full ${CONTACT_STATUS[session.status].dot}`}
          />
          {CONTACT_STATUS[session.status].label}
        </span>
      </div>

      {session.messages.length === 0 ? (
        <p className="px-3 text-xs text-muted-foreground">
          Belum ada pesan pada session ini.
        </p>
      ) : (
        <div className="space-y-4">
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
                    <p
                      className={`max-w-[85%] rounded-full border px-3 py-1.5 text-center text-[11px] leading-5 ${
                        message.variant === "escalated"
                          ? "border-teal-400/25 bg-teal-400/[0.06] text-teal-200"
                          : "border-border bg-muted/40 text-muted-foreground"
                      }`}
                    >
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
  return (
    <p className="mb-3 text-center text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
      {dayLabel(value)}
    </p>
  );
}

function MessageBubble({ message }: { message: InboxMessage }) {
  const isCustomer = message.role === "customer";
  const isAdmin = message.role === "admin";
  const Icon = isAdmin ? ShieldCheck : isCustomer ? UserRound : Bot;

  return (
    <div
      className={`flex items-end gap-2 ${
        isCustomer ? "flex-row-reverse" : ""
      }`}
    >
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-lg border ${
          isAdmin
            ? "border-teal-400/25 bg-teal-400/10 text-teal-300"
            : isCustomer
              ? "border-border bg-muted/50 text-muted-foreground"
              : "border-primary/25 bg-primary/10 text-primary"
        }`}
      >
        <Icon className="size-3.5" />
      </span>

      <div
        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
          isAdmin
            ? "rounded-br-md border border-teal-400/25 bg-teal-400/[0.08] text-foreground"
            : isCustomer
              ? "rounded-br-md border border-border bg-muted/50 text-foreground"
              : "rounded-bl-md border border-primary/20 bg-primary/[0.08] text-foreground"
        }`}
      >
        {isAdmin && (
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-teal-300 uppercase">
            Admin
          </p>
        )}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p
          className={`mt-1 text-[10px] text-muted-foreground ${
            isCustomer || isAdmin ? "text-right" : ""
          }`}
        >
          {message.created_at ? timeFormat.format(new Date(message.created_at)) : ""}
        </p>
      </div>
    </div>
  );
}
