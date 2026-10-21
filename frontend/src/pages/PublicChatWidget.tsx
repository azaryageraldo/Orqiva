import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  Check,
  LoaderCircle,
  Send,
  TriangleAlert,
  X,
} from "lucide-react";

import orqivaMark from "@/assets/orqiva-mark.png";
import { useI18n, type Language } from "@/lib/i18n";
import {
  getPublicChannel,
  getPublicSession,
  sendPublicMessage,
  startPublicSession,
  type PublicChannel,
  type PublicMessage,
} from "../services/publicChat";

const CONTACT_KEY = "orqiva_contact_id";
const LEGACY_CONTACT_KEY = "flowpilot_contact_id";

const DEFAULT_APPEARANCE = {
  header_color: "#17212b",
  background_color: "#0e1621",
  outgoing_color: "#2b5278",
  accent_color: "#64b5ef",
};

const TIME_FORMATS: Record<Language, Intl.DateTimeFormat> = {
  id: new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }),
  en: new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }),
};

const DATE_FORMATS: Record<Language, Intl.DateTimeFormat> = {
  id: new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
  en: new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
};

function readContactId(): string | undefined {
  try {
    return (
      window.localStorage.getItem(CONTACT_KEY) ??
      window.localStorage.getItem(LEGACY_CONTACT_KEY) ??
      undefined
    );
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

function formatTime(value: string | null, language: Language): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : TIME_FORMATS[language].format(date);
}

function dayKey(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function isSameDay(left: string, right: string): boolean {
  return dayKey(left) === dayKey(right);
}

function readableText(hex: string): string {
  const clean = hex.replace("#", "");
  const value =
    clean.length === 6 ? Number.parseInt(clean, 16) : 0x2b5278;

  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return luminance > 150 ? "#111827" : "#f8fafc";
}

export default function PublicChatWidget({ token }: { token: string }) {
  const { t, language } = useI18n();
  const [channel, setChannel] = useState<PublicChannel | null>(null);
  const [sessionToken, setSessionToken] = useState("");
  const [sessionStatus, setSessionStatus] = useState<
    "active" | "human" | "ended"
  >("active");
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingChannel, setLoadingChannel] = useState(true);
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const started = useRef(false);
  const pendingClientRef = useRef<{ id: string; text: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const embedded =
    typeof window !== "undefined" && window.self !== window.top;

  const appearance = channel?.settings.appearance ?? DEFAULT_APPEARANCE;
  const chatIcon = channel?.icon_urls.chat || orqivaMark;

  const beginSession = useCallback(async () => {
    if (started.current) return;
    started.current = true;
    setStarting(true);
    setError("");

    try {
      const result = await startPublicSession(token, readContactId());
      saveContactId(result.contact_id);
      setChannel(result.channel);
      setSessionToken(result.session_token);
      setSessionStatus(result.status);
      setMessages(result.messages);
      setChatOpen(true);
    } catch {
      started.current = false;
      setError(t("public.startError"));
    } finally {
      setStarting(false);
    }
  }, [token, t]);

  useEffect(() => {
    let active = true;

    getPublicChannel(token)
      .then((result) => {
        if (!active) return;
        setChannel(result);

        if (result.is_active && result.settings.open_mode === "always") {
          void beginSession();
        }
      })
      .catch(() => {
        if (active) {
          setError(t("public.startError"));
        }
      })
      .finally(() => {
        if (active) setLoadingChannel(false);
      });

    return () => {
      active = false;
    };
  }, [token, beginSession, t]);

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
  }, [messages, sending]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();

    if (!sessionToken || !text || sending) return;

    setSending(true);
    setError("");
    setNotice("");
    setDraft("");

    const pending = pendingClientRef.current;
    const clientMessageId =
      pending?.text === text ? pending.id : crypto.randomUUID();
    pendingClientRef.current = { id: clientMessageId, text };

    try {
      const result = await sendPublicMessage(
        sessionToken,
        text,
        clientMessageId,
      );
      pendingClientRef.current = null;
      setMessages(result.messages);
      setSessionStatus(result.session_status);
      setNotice(result.notice ?? "");
    } catch {
      setDraft(text);
      setError(t("public.sendError"));
    } finally {
      setSending(false);
    }
  }

  function closeWidget() {
    window.parent.postMessage({ type: "orqiva:close" }, "*");
  }

  const status = useMemo(() => {
    if (sending) return t("public.typing");
    if (sessionStatus === "human") return t("public.operatorHandling");
    return t("public.online");
  }, [sending, sessionStatus, t]);

  const style = {
    "--tg-header": appearance.header_color,
    "--tg-bg": appearance.background_color,
    "--tg-outgoing": appearance.outgoing_color,
    "--tg-accent": appearance.accent_color,
    "--tg-outgoing-text": readableText(appearance.outgoing_color),
  } as CSSProperties;

  const unavailable =
    !loadingChannel && (!channel || !channel.is_active || Boolean(error && !chatOpen));

  return (
    <div
      className="flex h-dvh min-h-dvh flex-col overflow-hidden bg-[var(--tg-bg)] text-[#f5f5f5]"
      style={style}
    >
      {!chatOpen ? (
        <div className="tg-chat-wallpaper relative flex h-full flex-col">
          {embedded && (
            <button
              type="button"
              onClick={closeWidget}
              className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full bg-black/25 text-white/80 transition hover:bg-black/40"
              aria-label={t("public.closeChat")}
            >
              <X className="size-4" />
            </button>
          )}

          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <div className="relative">
              <span
                className="absolute inset-0 -z-10 rounded-full blur-2xl"
                style={{ backgroundColor: appearance.accent_color, opacity: 0.22 }}
              />
              <img
                src={chatIcon}
                alt=""
                className="size-20 rounded-full object-cover shadow-2xl shadow-black/40 ring-1 ring-white/10"
              />
            </div>

            <h1 className="mt-6 text-xl font-semibold tracking-tight text-white">
              {channel?.name || t("public.customerService")}
            </h1>
            <p className="mt-1.5 max-w-xs text-sm leading-6 text-white/55">
              {channel?.settings.welcome_message ||
                t("public.welcomeFallback")}
            </p>

            {unavailable ? (
              <div className="mt-8 max-w-sm rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                <TriangleAlert className="mx-auto mb-2 size-5 text-amber-300" />
                {error || t("public.unavailableMessage")}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void beginSession()}
                disabled={starting || loadingChannel}
                className="mt-8 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:brightness-110 disabled:opacity-60"
                style={{ backgroundColor: appearance.accent_color }}
              >
                {starting ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {starting ? t("public.opening") : t("public.startChat")}
              </button>
            )}

            {error && !unavailable && (
              <p className="mt-3 max-w-xs text-xs leading-5 text-rose-300">
                {error}
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <header
            className="flex h-14 shrink-0 items-center gap-3 px-3 shadow-sm"
            style={{ backgroundColor: appearance.header_color }}
          >
            {embedded && (
              <button
                type="button"
                onClick={closeWidget}
                className="flex size-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10"
                aria-label={t("public.closeChat")}
              >
                <X className="size-4" />
              </button>
            )}

            <img
              src={chatIcon}
              alt=""
              className="size-9 shrink-0 rounded-full object-cover ring-1 ring-white/10"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {channel?.name || t("public.customerService")}
              </p>
              <p
                className="truncate text-xs"
                style={{ color: appearance.accent_color }}
              >
                {status}
              </p>
            </div>
          </header>

          <main className="tg-chat-wallpaper flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {loadingChannel && !sessionToken ? (
                <ChatSkeleton />
              ) : (
                <>
                  {channel?.settings.welcome_message &&
                    messages.length === 0 && (
                      <Bubble
                        role="assistant"
                        content={channel.settings.welcome_message}
                        time={null}
                        avatar={chatIcon}
                        appearance={appearance}
                        groupEnd
                      />
                    )}

                  {messages.map((message, index) => {
                    const previous = messages[index - 1];
                    const next = messages[index + 1];

                    if (message.role === "system") {
                      return (
                        <div
                          key={message.id}
                          className="flex justify-center py-2"
                        >
                          <p className="max-w-[86%] rounded-full bg-black/25 px-3 py-1 text-center text-[11px] leading-5 text-white/65">
                            {message.content}
                          </p>
                        </div>
                      );
                    }

                    const groupStart =
                      !previous ||
                      previous.role === "system" ||
                      previous.role !== message.role ||
                      !message.created_at ||
                      !previous.created_at ||
                      !isSameDay(previous.created_at, message.created_at);

                    const groupEnd =
                      !next ||
                      next.role === "system" ||
                      next.role !== message.role ||
                      !message.created_at ||
                      !next.created_at ||
                      !isSameDay(next.created_at, message.created_at);

                    return (
                      <div key={message.id}>
                        {groupStart && message.created_at && (
                          <DayDivider
                            value={message.created_at}
                            language={language}
                            today={t("public.today")}
                            yesterday={t("public.yesterday")}
                          />
                        )}
                        <Bubble
                          role={message.role}
                          content={message.content}
                          time={message.created_at}
                          avatar={chatIcon}
                          appearance={appearance}
                          groupStart={groupStart}
                          groupEnd={groupEnd}
                        />
                      </div>
                    );
                  })}

                  {sending && (
                    <div className="flex items-end gap-2 py-1">
                      <img
                        src={chatIcon}
                        alt=""
                        className="size-7 shrink-0 rounded-full object-cover"
                      />
                      <div
                        className="flex items-center gap-1 rounded-2xl rounded-bl-md px-3.5 py-3"
                        style={{ backgroundColor: "#182533" }}
                      >
                        <span className="tg-typing-dot" />
                        <span className="tg-typing-dot" />
                        <span className="tg-typing-dot" />
                      </div>
                    </div>
                  )}

                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {sessionStatus === "ended" && (
              <div className="mx-3 mb-2 rounded-lg bg-black/25 px-3 py-2 text-center text-xs leading-5 text-white/65">
                {t("public.endedNote")}
              </div>
            )}

            {notice && !error && (
              <div className="mx-3 mb-2 flex items-center justify-between gap-3 rounded-lg bg-white/[0.06] px-3 py-2 text-xs leading-5 text-white/70">
                <span className="min-w-0 flex-1">{notice}</span>
                <button
                  type="button"
                  onClick={() => setNotice("")}
                  className="shrink-0 rounded px-1.5 py-0.5 font-medium text-white/80 hover:bg-white/10"
                >
                  {t("common.close")}
                </button>
              </div>
            )}

            {error && sessionToken && (
              <div className="mx-3 mb-2 flex items-center justify-between gap-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                <span className="min-w-0 flex-1">{error}</span>
                <button
                  type="button"
                  onClick={() => setError("")}
                  className="shrink-0 rounded px-1.5 py-0.5 font-medium text-rose-100 hover:bg-white/10"
                >
                  {t("common.close")}
                </button>
              </div>
            )}

            <form
              onSubmit={(event) => void send(event)}
              className="shrink-0 border-t border-white/5 p-3"
            >
              <div className="flex items-end gap-2">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  maxLength={4000}
                  placeholder={
                    channel?.settings.placeholder ||
                    t("public.inputPlaceholder")
                  }
                  aria-label={t("public.messageLabel")}
                  disabled={
                    loadingChannel ||
                    !sessionToken ||
                    sending ||
                    sessionStatus === "ended"
                  }
                  className="h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.06] px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/20 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={
                    !draft.trim() ||
                    loadingChannel ||
                    sending ||
                    !sessionToken ||
                    sessionStatus === "ended"
                  }
                  aria-label={t("public.send")}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full text-white shadow-lg shadow-black/20 transition hover:brightness-110 disabled:opacity-40"
                  style={{ backgroundColor: appearance.accent_color }}
                >
                  {sending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </button>
              </div>
            </form>
          </main>
        </>
      )}
    </div>
  );
}

function DayDivider({
  value,
  language,
  today,
  yesterday,
}: {
  value: string;
  language: Language;
  today: string;
  yesterday: string;
}) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);

  let label = DATE_FORMATS[language].format(date);

  if (isSameDay(value, now.toISOString())) {
    label = today;
  } else if (isSameDay(value, yesterdayDate.toISOString())) {
    label = yesterday;
  }

  return (
    <div className="flex justify-center py-2">
      <span className="rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-medium text-white/60">
        {label}
      </span>
    </div>
  );
}

function Bubble({
  role,
  content,
  time,
  avatar,
  appearance,
  groupStart = true,
  groupEnd = true,
}: {
  role: PublicMessage["role"];
  content: string;
  time: string | null;
  avatar: string;
  appearance: {
    outgoing_color: string;
    accent_color: string;
  };
  groupStart?: boolean;
  groupEnd?: boolean;
}) {
  const { language } = useI18n();
  const outgoing = role === "customer";
  const outgoingText = readableText(appearance.outgoing_color);

  return (
    <div
      className={`flex items-end gap-2 ${
        outgoing ? "justify-end" : "justify-start"
      } ${groupStart ? "pt-2" : "pt-0.5"}`}
    >
      {!outgoing && (
        <span className="w-7 shrink-0">
          {groupEnd && (
            <img
              src={avatar}
              alt=""
              className="size-7 rounded-full object-cover"
            />
          )}
        </span>
      )}

      <div
        className={`max-w-[78%] px-3 py-2 text-sm leading-5 shadow-sm ${
          outgoing ? "rounded-2xl" : "rounded-2xl"
        } ${outgoing && groupEnd ? "rounded-br-md" : ""} ${
          !outgoing && groupEnd ? "rounded-bl-md" : ""
        }`}
        style={{
          backgroundColor: outgoing ? appearance.outgoing_color : "#182533",
          color: outgoing ? outgoingText : "#f1f5f9",
        }}
      >
        <p className="whitespace-pre-wrap break-words">{content}</p>
        <div
          className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
            outgoing ? "opacity-65" : "text-white/45"
          }`}
        >
          <span>{formatTime(time, language)}</span>
          {outgoing && time && (
            <Check className="size-3" strokeWidth={2.5} />
          )}
        </div>
      </div>
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="space-y-3 pt-2">
      <div className="h-9 w-2/3 animate-pulse rounded-2xl bg-white/[0.06]" />
      <div className="ml-auto h-9 w-1/2 animate-pulse rounded-2xl bg-white/[0.06]" />
      <div className="h-12 w-3/5 animate-pulse rounded-2xl bg-white/[0.06]" />
    </div>
  );
}
