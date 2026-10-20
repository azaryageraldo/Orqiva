import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Inbox as InboxIcon,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import ExecutionStatusBadge from "../components/ExecutionStatusBadge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { getErrorMessage } from "../services/api";
import {
  getConversation,
  getInbox,
  type InboxConversation,
  type InboxDetail,
  type InboxMessage,
} from "../services/inbox";
import type { ExecutionStatus } from "../services/stats";

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

const STATUS_META: Record<
  ExecutionStatus,
  { label: string; dot: string }
> = {
  success: { label: "Sukses", dot: "bg-emerald-400" },
  failed: { label: "Gagal", dot: "bg-destructive" },
  waiting: { label: "Menunggu", dot: "bg-amber-400" },
  running: { label: "Berjalan", dot: "bg-primary" },
  escalated: { label: "Ke admin", dot: "bg-teal-400" },
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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function systemTone(variant: InboxMessage["variant"]): string {
  if (variant === "error") {
    return "border-destructive/25 bg-destructive/[0.06] text-destructive";
  }

  if (variant === "escalated") {
    return "border-teal-400/25 bg-teal-400/[0.06] text-teal-200";
  }

  return "border-border bg-muted/40 text-muted-foreground";
}

function dayKey(value: string | null): string {
  const date = parseDate(value);
  return date ? date.toDateString() : "unknown";
}

function dayLabel(value: string | null): string {
  const date = parseDate(value);
  return date ? dayFormat.format(date) : "Tanggal tidak diketahui";
}

export default function Inbox() {
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<InboxDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState("");
  const [detailReload, setDetailReload] = useState(0);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError("");

    try {
      const result = await getInbox();
      setConversations(result);
      setSelectedId((current) =>
        current !== null &&
        result.some((item) => item.execution_id === current)
          ? current
          : null,
      );
    } catch (caught) {
      setListError(
        getErrorMessage(
          caught,
          "Riwayat percakapan gagal dimuat. Periksa koneksi backend.",
        ),
      );
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    getInbox()
      .then((result) => {
        if (!active) return;

        setConversations(result);
        setSelectedId(
          window.matchMedia("(min-width: 1024px)").matches
            ? (result[0]?.execution_id ?? null)
            : null,
        );
      })
      .catch((caught: unknown) => {
        if (active) {
          setListError(
            getErrorMessage(
              caught,
              "Riwayat percakapan gagal dimuat. Periksa koneksi backend.",
            ),
          );
        }
      })
      .finally(() => {
        if (active) setListLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (selectedId === null) return;

    let active = true;

    getConversation(selectedId)
      .then((result) => {
        if (active) setDetail(result);
      })
      .catch((caught: unknown) => {
        if (active) {
          setDetailError(
            getErrorMessage(
              caught,
              "Detail percakapan gagal dimuat. Coba lagi.",
            ),
          );
        }
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedId, detailReload]);

  function openConversation(executionId: number) {
    setSelectedId(executionId);
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
  }

  function retryDetail() {
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    setDetailReload((current) => current + 1);
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (!needle) return conversations;

    return conversations.filter((conversation) =>
      [
        conversation.customer_name,
        conversation.workflow_name ?? "",
        conversation.last_message,
      ].some((value) => value.toLowerCase().includes(needle)),
    );
  }, [conversations, query]);

  const selectedConversation =
    conversations.find((item) => item.execution_id === selectedId) ?? null;

  const messages = detail?.messages ?? [];
  const status = selectedConversation?.last_status ?? detail?.status ?? "success";
  const statusMeta = STATUS_META[status];

  return (
    <section className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-4">
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
              Riwayat percakapan pelanggan dari seluruh workflow.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
              {conversations.length} percakapan
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadList()}
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
                  placeholder="Cari nama atau pesan..."
                  aria-label="Cari percakapan"
                  className="h-9 pl-8 dark:bg-input/30"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {listLoading && conversations.length === 0 ? (
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
                    {query ? "Percakapan tidak ditemukan" : "Inbox masih kosong"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {query
                      ? "Coba kata kunci lain."
                      : "Percakapan akan muncul setelah pelanggan mengirim pesan lewat Chat Widget."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {filtered.map((conversation) => {
                    const isActive =
                      conversation.execution_id === selectedId;
                    const meta = STATUS_META[conversation.last_status];

                    return (
                      <li key={`${conversation.workflow_id}-${conversation.conversation_id}`}>
                        <button
                          type="button"
                          onClick={() => openConversation(conversation.execution_id)}
                          className={`flex w-full items-start gap-3 px-3 py-3 text-left transition ${
                            isActive
                              ? "bg-primary/[0.08]"
                              : "hover:bg-muted/40"
                          }`}
                        >
                          <span
                            className={`flex size-9 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold ${
                              isActive
                                ? "border-primary/30 bg-primary/15 text-primary"
                                : "border-border bg-muted/50 text-muted-foreground"
                            }`}
                          >
                            {initials(conversation.customer_name)}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className="truncate text-sm font-medium text-foreground">
                                {conversation.customer_name}
                              </span>
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {listTime(conversation.last_activity_at)}
                              </span>
                            </span>

                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {conversation.last_message}
                            </span>

                            <span className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <span
                                  className={`size-1.5 rounded-full ${meta.dot}`}
                                />
                                {meta.label}
                              </span>
                              <span className="text-muted-foreground/50">·</span>
                              <span className="truncate">
                                {conversation.workflow_name || "Workflow"}
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
                  Pilih percakapan
                </p>
                <p className="mt-1 max-w-xs text-sm leading-6 text-muted-foreground">
                  Pilih salah satu percakapan di kiri untuk melihat riwayat
                  pesannya.
                </p>
              </div>
            ) : detailLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : detailError || !detail ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <p className="text-sm text-destructive">
                  {detailError || "Detail percakapan tidak tersedia."}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={retryDetail}
                  className="mt-3"
                >
                  Coba lagi
                </Button>
              </div>
            ) : (
              <>
                <header className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-3 sm:px-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Kembali ke daftar percakapan"
                    onClick={() => setSelectedId(null)}
                    className="lg:hidden"
                  >
                    <ArrowLeft />
                  </Button>

                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-sm font-semibold text-primary">
                    {initials(detail.customer_name)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <h2 className="truncate text-sm font-semibold text-foreground">
                        {detail.customer_name}
                      </h2>
                      <ExecutionStatusBadge status={status} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {detail.workflow_name || "Workflow"} ·{" "}
                      {messages.length} pesan
                    </p>
                  </div>

                  <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[10px] font-medium text-muted-foreground sm:inline-flex">
                    <span className={`size-1.5 rounded-full ${statusMeta.dot}`} />
                    {statusMeta.label}
                  </span>
                </header>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
                  {messages.length === 0 ? (
                    <div className="flex h-full min-h-52 flex-col items-center justify-center text-center">
                      <Bot className="size-7 text-muted-foreground" />
                      <p className="mt-3 text-sm text-muted-foreground">
                        Belum ada pesan pada percakapan ini.
                      </p>
                    </div>
                  ) : (
                    messages.map((message, index) => {
                      const previous = messages[index - 1];
                      const showDay =
                        index === 0 ||
                        dayKey(previous.created_at) !== dayKey(message.created_at);

                      if (message.role === "system") {
                        return (
                          <Fragment key={message.id}>
                            {showDay && (
                              <p className="text-center text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                                {dayLabel(message.created_at)}
                              </p>
                            )}
                            <div className="flex justify-center">
                              <p
                                className={`max-w-[85%] rounded-full border px-3 py-1.5 text-center text-[11px] leading-5 ${systemTone(message.variant)}`}
                              >
                                {message.content}
                              </p>
                            </div>
                          </Fragment>
                        );
                      }

                      const isAssistant = message.role === "assistant";

                      return (
                        <Fragment key={message.id}>
                          {showDay && (
                            <p className="text-center text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                              {dayLabel(message.created_at)}
                            </p>
                          )}
                          <div
                            className={`flex items-end gap-2 ${
                              isAssistant ? "flex-row-reverse" : ""
                            }`}
                          >
                            <span
                              className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${
                                isAssistant
                                  ? "border border-primary/25 bg-primary/10 text-primary"
                                  : "border border-border bg-muted/50 text-muted-foreground"
                              }`}
                            >
                              {isAssistant ? (
                                <Bot className="size-3.5" />
                              ) : (
                                <UserRound className="size-3.5" />
                              )}
                            </span>

                            <div
                              className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                                isAssistant
                                  ? "rounded-br-md border border-primary/20 bg-primary/[0.09] text-foreground"
                                  : "rounded-bl-md border border-border bg-muted/50 text-foreground"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                              <p
                                className={`mt-1 text-[10px] text-muted-foreground ${
                                  isAssistant ? "text-right" : ""
                                }`}
                              >
                                {message.created_at
                                  ? timeFormat.format(
                                      new Date(message.created_at),
                                    )
                                  : ""}
                              </p>
                            </div>
                          </div>
                        </Fragment>
                      );
                    })
                  )}
                </div>

                <footer className="flex shrink-0 items-center justify-center gap-2 border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
                  <ShieldCheck className="size-3.5" />
                  Riwayat percakapan bersifat read-only.
                </footer>
              </>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}
