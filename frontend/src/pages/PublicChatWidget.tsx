import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Bot,
  LoaderCircle,
  MessageCircle,
  Send,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "../services/api";
import {
  getPublicSession,
  sendPublicMessage,
  startPublicSession,
  type PublicChannel,
  type PublicMessage,
} from "../services/publicChat";

const CONTACT_KEY = "flowpilot_contact_id";

const timeFormat = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
});

function readContactId(): string | undefined {
  try {
    return window.localStorage.getItem(CONTACT_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function saveContactId(contactId: string) {
  try {
    window.localStorage.setItem(CONTACT_KEY, contactId);
  } catch {
    // Private browsing can disable storage; the session still works.
  }
}

function formatTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : timeFormat.format(date);
}

export default function PublicChatWidget({ token }: { token: string }) {
  const [channel, setChannel] = useState<PublicChannel | null>(null);
  const [sessionToken, setSessionToken] = useState("");
  const [contactId, setContactId] = useState("");
  const [sessionStatus, setSessionStatus] = useState<
    "active" | "human" | "ended"
  >("active");
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const started = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    startPublicSession(token, readContactId())
      .then((result) => {
        saveContactId(result.contact_id);
        setChannel(result.channel);
        setSessionToken(result.session_token);
        setContactId(result.contact_id);
        setSessionStatus(result.status);
        setMessages(result.messages);
      })
      .catch((caught: unknown) => {
        setError(
          getErrorMessage(
            caught,
            "Widget tidak dapat dibuka. Periksa tautan atau hubungi admin.",
          ),
        );
      })
      .finally(() => setLoading(false));

    /*
     * Jangan membatalkan hasil start saat StrictMode melepas effect pertama.
     * Ref `started` mencegah request kedua; hasil request pertama tetap
     * dipakai oleh instance komponen yang sama.
     */
    return () => undefined;
  }, [token]);

  useEffect(() => {
    if (!sessionToken) return;

    let active = true;
    const poll = async () => {
      try {
        const result = await getPublicSession(sessionToken);
        if (!active) return;
        setMessages(result.messages);
        setSessionStatus(result.status);
        setChannel(result.channel);
      } catch {
        // Polling errors are recoverable; the next interval retries.
      }
    };

    const timer = window.setInterval(() => void poll(), 2500);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [sessionToken]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending, notice]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();

    if (!sessionToken || !text || sending) return;

    setSending(true);
    setError("");
    setNotice("");
    setDraft("");

    try {
      const result = await sendPublicMessage(sessionToken, text);
      setMessages(result.messages);
      setSessionStatus(result.session_status);
      setNotice(result.notice ?? "");
    } catch (caught) {
      setDraft(text);
      setError(
        getErrorMessage(
          caught,
          "Pesan gagal dikirim. Periksa koneksi lalu coba lagi.",
        ),
      );
    } finally {
      setSending(false);
    }
  }

  const welcome = channel?.settings.welcome_message?.trim();

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#080a0e] text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.12),transparent_34%)]"
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-3 py-4 sm:px-6 sm:py-8">
        <header className="flex items-center gap-3 rounded-t-2xl border border-b-0 border-border bg-card/90 px-4 py-3.5 backdrop-blur sm:px-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
            <MessageCircle className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-foreground">
              {channel?.name || "Customer Support"}
            </h1>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {sessionStatus === "human"
                ? "Admin sedang menangani percakapan"
                : channel?.workflow_name
                  ? `AI · ${channel.workflow_name}`
                  : "AI customer service"}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[10px] text-muted-foreground">
            <span
              className={`size-1.5 rounded-full ${
                sessionStatus === "human" ? "bg-teal-400" : "bg-emerald-400"
              }`}
            />
            {sessionStatus === "human" ? "Admin" : "AI"}
          </span>
        </header>

        <main className="flex min-h-0 flex-1 flex-col rounded-b-2xl border border-border bg-card/70 backdrop-blur">
          <div className="min-h-[52dvh] flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:min-h-[58dvh] sm:px-5">
            {loading ? (
              <div className="flex h-full min-h-64 items-center justify-center">
                <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : error && messages.length === 0 ? (
              <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 text-center">
                <span className="flex size-12 items-center justify-center rounded-xl border border-destructive/25 bg-destructive/10 text-destructive">
                  <TriangleAlert className="size-5" />
                </span>
                <p className="mt-4 text-sm font-medium text-foreground">
                  Widget tidak tersedia
                </p>
                <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                  {error}
                </p>
              </div>
            ) : (
              <>
                {welcome && messages.length === 0 && (
                  <Bubble
                    role="assistant"
                    content={welcome}
                    time={null}
                  />
                )}

                {messages.map((message) =>
                  message.role === "system" ? (
                    <div key={message.id} className="flex justify-center">
                      <p
                        className={`max-w-[88%] rounded-full border px-3 py-1.5 text-center text-[11px] leading-5 ${
                          message.variant === "escalated"
                            ? "border-teal-400/25 bg-teal-400/[0.07] text-teal-200"
                            : "border-border bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        {message.content}
                      </p>
                    </div>
                  ) : (
                    <Bubble
                      key={message.id}
                      role={message.role}
                      content={message.content}
                      time={message.created_at}
                    />
                  ),
                )}

                {sending && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Bot className="size-4" />
                    AI sedang mengetik...
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {notice && (
            <div className="border-t border-border bg-teal-400/[0.05] px-4 py-2.5 text-center text-xs text-teal-200">
              {notice}
            </div>
          )}

          {error && messages.length > 0 && (
            <div className="border-t border-destructive/20 bg-destructive/[0.06] px-4 py-2.5 text-center text-xs text-destructive">
              {error}
            </div>
          )}

          <form
            onSubmit={(event) => void send(event)}
            className="border-t border-border p-3 sm:p-4"
          >
            <div className="flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={1}
                maxLength={4000}
                placeholder={channel?.settings.placeholder || "Tulis pesan..."}
                aria-label="Pesan"
                disabled={loading || !sessionToken || sending}
                className="max-h-36 min-h-11 resize-none"
              />
              <Button
                type="submit"
                size="icon-lg"
                disabled={!draft.trim() || loading || sending || !sessionToken}
                aria-label="Kirim pesan"
                className="shrink-0"
              >
                {sending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Send />
                )}
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground/70">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="size-3" />
                {sessionStatus === "human"
                  ? "Admin sedang menangani percakapan ini."
                  : sessionStatus === "ended"
                    ? "Sesi telah berakhir. Muat ulang widget untuk memulai lagi."
                    : "Percakapan ini dilayani AI dan dapat diambil alih admin."}
              </span>
              {contactId && (
                <span className="font-mono">ID {contactId}</span>
              )}
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

function Bubble({
  role,
  content,
  time,
}: {
  role: PublicMessage["role"];
  content: string;
  time: string | null;
}) {
  if (role === "admin") {
    return (
      <div className="flex items-end justify-end gap-2">
        <div className="max-w-[82%] rounded-2xl rounded-br-md border border-teal-400/25 bg-teal-400/[0.08] px-3.5 py-2.5 text-sm leading-6 text-foreground">
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-teal-300 uppercase">
            Admin
          </p>
          <p className="whitespace-pre-wrap break-words">{content}</p>
          <p className="mt-1 text-right text-[10px] text-muted-foreground">
            {formatTime(time)}
          </p>
        </div>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-teal-400/25 bg-teal-400/10 text-teal-300">
          <ShieldCheck className="size-3.5" />
        </span>
      </div>
    );
  }

  const isAssistant = role === "assistant";

  return (
    <div
      className={`flex items-end gap-2 ${isAssistant ? "" : "flex-row-reverse"}`}
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
        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
          isAssistant
            ? "rounded-bl-md border border-primary/20 bg-primary/[0.08] text-foreground"
            : "rounded-br-md border border-border bg-muted/50 text-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{content}</p>
        <p
          className={`mt-1 text-[10px] text-muted-foreground ${
            isAssistant ? "" : "text-right"
          }`}
        >
          {formatTime(time)}
        </p>
      </div>
    </div>
  );
}
