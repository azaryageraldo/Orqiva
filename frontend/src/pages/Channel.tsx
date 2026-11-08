import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowSquareOut,
  ArrowsClockwise,
  ChatCircleDots,
  Check,
  Copy,
  InstagramLogo,
  MessengerLogo,
  PaperPlaneRight,
  PencilSimple,
  TelegramLogo,
  WhatsappLogo,
} from "@phosphor-icons/react";
import {
  ImagePlus,
  LoaderCircle,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import orqivaMark from "@/assets/orqiva-mark.png";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { getErrorMessage } from "../services/api";
import {
  createChannel,
  deleteChannelIcon,
  getChannel,
  getWorkflowOptions,
  listChannels,
  regenerateChannelToken,
  updateChannel,
  updateChannelById,
  uploadChannelIcon,
  type ChannelAppearance,
  type ChannelIconKind,
  type ChannelOpenMode,
  type WidgetChannel,
  type WorkflowOption,
} from "../services/channel";

const CHANNEL_CATALOG = [
  {
    id: "widget",
    nameKey: "channel.widgetName",
    descriptionKey: "channel.widgetDescription",
    icon: ChatCircleDots,
    tile: "border-primary/25 bg-primary/10 text-primary",
    active: true,
  },
  {
    id: "telegram",
    nameKey: "channel.telegram",
    descriptionKey: "channel.telegramDescription",
    icon: TelegramLogo,
    tile: "border-sky-400/25 bg-sky-400/10 text-sky-400",
    active: true,
  },
  {
    id: "whatsapp",
    nameKey: "channel.whatsapp",
    descriptionKey: "channel.whatsappDescription",
    icon: WhatsappLogo,
    tile: "border-emerald-400/25 bg-emerald-400/10 text-emerald-400",
    active: false,
  },
  {
    id: "instagram",
    nameKey: "channel.instagram",
    descriptionKey: "channel.instagramDescription",
    icon: InstagramLogo,
    tile: "border-pink-400/25 bg-pink-400/10 text-pink-400",
    active: false,
  },
  {
    id: "messenger",
    nameKey: "channel.messenger",
    descriptionKey: "channel.messengerDescription",
    icon: MessengerLogo,
    tile: "border-blue-400/25 bg-blue-400/10 text-blue-400",
    active: false,
  },
] as const;

const TELEGRAM_APPEARANCE: ChannelAppearance = {
  header_color: "#17212b",
  background_color: "#0e1621",
  outgoing_color: "#2b5278",
  accent_color: "#64b5ef",
};

export default function Channel() {
  const { t } = useI18n();
  const [channel, setChannel] = useState<WidgetChannel | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
  const [name, setName] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [welcome, setWelcome] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [openMode, setOpenMode] = useState<ChannelOpenMode>("manual");
  const [appearance, setAppearance] =
    useState<ChannelAppearance>(TELEGRAM_APPEARANCE);
  const [icons, setIcons] = useState<{
    chat: string | null;
    launcher: string | null;
  }>({ chat: null, launcher: null });
  const [uploadingIcon, setUploadingIcon] = useState<ChannelIconKind | null>(
    null,
  );
  const chatIconInput = useRef<HTMLInputElement>(null);
  const launcherIconInput = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [snippetCopied, setSnippetCopied] = useState(false);
  const [telegram, setTelegram] = useState<WidgetChannel | null>(null);
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [telegramName, setTelegramName] = useState("Telegram");
  const [telegramWorkflowId, setTelegramWorkflowId] = useState("");
  const [telegramActive, setTelegramActive] = useState(false);
  const [botToken, setBotToken] = useState("");
  const [telegramSaving, setTelegramSaving] = useState(false);

  function applyChannel(value: WidgetChannel) {
    setChannel(value);
    setName(value.name);
    setWorkflowId(value.workflow_id ? String(value.workflow_id) : "");
    setIsActive(value.is_active);
    setWelcome(value.settings.welcome_message ?? "");
    setPlaceholder(value.settings.placeholder ?? "");
    setOpenMode(value.settings.open_mode ?? "manual");
    setAppearance({
      ...TELEGRAM_APPEARANCE,
      ...value.settings.appearance,
    });
    setIcons({
      chat: value.icon_urls?.chat ?? null,
      launcher: value.icon_urls?.launcher ?? null,
    });
  }

  useEffect(() => {
    let active = true;

    Promise.all([getChannel(), getWorkflowOptions(), listChannels()])
      .then(([channelData, workflowData, channels]) => {
        if (!active) return;
        applyChannel(channelData);
        setWorkflows(workflowData);

        const bot =
          channels.find((item) => item.type === "telegram") ?? null;

        setTelegram(bot);

        if (bot) {
          setTelegramName(bot.name);
          setTelegramWorkflowId(
            bot.workflow_id ? String(bot.workflow_id) : "",
          );
          setTelegramActive(bot.is_active);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(getErrorMessage(caught, t("channel.errorLoad")));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // Channel data should only load once per page visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entryWorkflows = useMemo(
    () =>
      workflows.filter((workflow) =>
        workflow.nodes.some(
          (node) => node.type === "Trigger" || node.type === "trigger",
        ),
      ),
    [workflows],
  );

  const widgetUrl = channel
    ? `${window.location.origin}/widget/${channel.public_token}`
    : "";

  const widgetSnippet = channel
    ? `<script src="${window.location.origin}/orqiva-widget.js" data-orqiva-token="${channel.public_token}" async></script>`
    : "";

  async function save() {
    if (!channel || saving) return;
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const updated = await updateChannel({
        name: name.trim() || channel.name,
        workflow_id: workflowId ? Number(workflowId) : null,
        is_active: isActive,
        settings: {
          welcome_message: welcome.trim(),
          placeholder: placeholder.trim(),
          open_mode: openMode,
          appearance,
        },
      });

      applyChannel(updated);
      setEditing(false);
      setNotice(t("channel.noticeSaved"));
    } catch (caught) {
      setError(getErrorMessage(caught, t("channel.errorSave")));
    } finally {
      setSaving(false);
    }
  }

  async function regenerate() {
    if (!channel || regenerating) return;
    if (
      !window.confirm(
        t("channel.confirmRegenerate"),
      )
    ) {
      return;
    }

    setRegenerating(true);
    setError("");
    setNotice("");

    try {
      applyChannel(await regenerateChannelToken());
      setNotice(t("channel.noticeRegenerated"));
    } catch (caught) {
      setError(getErrorMessage(caught, t("channel.errorToken")));
    } finally {
      setRegenerating(false);
    }
  }

  async function copyWidgetUrl() {
    if (!widgetUrl) return;

    try {
      await navigator.clipboard.writeText(widgetUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(t("channel.errorCopyUrl"));
    }
  }

  async function copyWidgetSnippet() {
    if (!widgetSnippet) return;

    try {
      await navigator.clipboard.writeText(widgetSnippet);
      setSnippetCopied(true);
      window.setTimeout(() => setSnippetCopied(false), 1800);
    } catch {
      setError(t("channel.errorCopySnippet"));
    }
  }

  function openEditor() {
    setError("");
    setEditing(true);
  }

  function openTelegram() {
    setError("");
    setBotToken("");

    if (telegram) {
      setTelegramName(telegram.name);
      setTelegramWorkflowId(
        telegram.workflow_id ? String(telegram.workflow_id) : "",
      );
      setTelegramActive(telegram.is_active);
    }

    setTelegramOpen(true);
  }

  async function saveTelegram() {
    if (telegramSaving) return;

    const token = botToken.trim();

    if (!telegram && !token) {
      setError(t("channel.telegramTokenRequired"));
      return;
    }

    setTelegramSaving(true);
    setError("");
    setNotice("");

    const payload = {
      name: telegramName.trim() || "Telegram",
      workflow_id: telegramWorkflowId ? Number(telegramWorkflowId) : null,
      is_active: telegramActive,
      ...(token ? { bot_token: token } : {}),
    };

    try {
      const saved = telegram
        ? await updateChannelById(telegram.id, payload)
        : await createChannel({ type: "telegram", ...payload, bot_token: token });

      setTelegram(saved);
      setTelegramName(saved.name);
      setTelegramWorkflowId(
        saved.workflow_id ? String(saved.workflow_id) : "",
      );
      setTelegramActive(saved.is_active);
      setBotToken("");
      setTelegramOpen(false);
      setNotice(t("channel.telegramSaved"));
    } catch (caught) {
      setError(getErrorMessage(caught, t("channel.telegramError")));
    } finally {
      setTelegramSaving(false);
    }
  }

  async function changeIcon(kind: ChannelIconKind, file?: File) {
    if (!file || uploadingIcon) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError(t("channel.iconTypeError"));
      return;
    }

    if (file.size > 1024 * 1024) {
      setError(t("channel.iconSizeError"));
      return;
    }

    setUploadingIcon(kind);
    setError("");
    setNotice("");

    try {
      applyChannel(await uploadChannelIcon(kind, file));
      setNotice(t("channel.iconSaved"));
    } catch (caught) {
      setError(getErrorMessage(caught, t("channel.iconError")));
    } finally {
      setUploadingIcon(null);
    }
  }

  async function removeIcon(kind: ChannelIconKind) {
    if (uploadingIcon) return;

    setUploadingIcon(kind);
    setError("");
    setNotice("");

    try {
      applyChannel(await deleteChannelIcon(kind));
      setNotice(t("channel.iconRemoved"));
    } catch (caught) {
      setError(getErrorMessage(caught, t("channel.iconError")));
    } finally {
      setUploadingIcon(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const entryWorkflowName =
    entryWorkflows.find((workflow) => String(workflow.id) === workflowId)
      ?.name ?? t("channel.noneSelected");

  return (
    <section className="min-h-[calc(100vh-3rem)] bg-background">
      <div className="w-full px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <div className="mb-4">
          <h1 className="text-[1.5rem] leading-tight font-semibold tracking-[-0.02em] text-foreground">
            Channel Connector
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Add and set the channels you want to connect to
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <span>{error}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setError("")}
            >
              {t("common.close")}
            </Button>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"
          >
            <span className="inline-flex items-center gap-2">
              <Check className="size-4" />
              {notice}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setNotice("")}
              className="text-emerald-200 hover:text-emerald-100"
            >
              {t("common.close")}
            </Button>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,390px)] 2xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-4">
            {/* Featured widget */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]">
              <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(300px,350px)] 2xl:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
                <div className="flex flex-col p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                      <ChatCircleDots size={22} weight="fill" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-foreground">
                        {t("channel.widgetName")}
                      </h2>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                        {t("channel.widgetDescription")}
                      </p>
                    </div>
                    <span
                      className={`ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                        isActive
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                          : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-amber-400"}`}
                      />
                      {isActive
                        ? t("channel.widgetActive")
                        : t("channel.widgetInactive")}
                    </span>
                  </div>

                  <dl className="mt-5 grid gap-2 sm:grid-cols-2">
                    <div className="min-w-0 rounded-lg border border-border/70 bg-background/40 px-3 py-2.5">
                      <dt className="text-[10.5px] tracking-[0.06em] text-muted-foreground">
                        {t("channel.workflowLabel")}
                      </dt>
                      <dd
                        className="mt-1 truncate text-[12.5px] font-medium text-foreground"
                        title={entryWorkflowName}
                      >
                        {entryWorkflowName}
                      </dd>
                    </div>
                    <div className="min-w-0 rounded-lg border border-border/70 bg-background/40 px-3 py-2.5">
                      <dt className="text-[10.5px] tracking-[0.06em] text-muted-foreground">
                        {t("channel.openModeTitle")}
                      </dt>
                      <dd className="mt-1 truncate text-[12.5px] font-medium text-foreground">
                        {openMode === "always"
                          ? t("channel.openModeAlways")
                          : t("channel.openModeManual")}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    <Button type="button" size="sm" onClick={openEditor}>
                      <PencilSimple size={15} weight="bold" />
                      {t("channel.editWidgetTitle")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(widgetUrl, "_blank", "noopener,noreferrer")
                      }
                      disabled={!widgetUrl}
                    >
                      <ArrowSquareOut size={15} weight="bold" />
                      {t("channel.openWidgetTitle")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void regenerate()}
                      disabled={regenerating}
                    >
                      <ArrowsClockwise
                        size={15}
                        weight="bold"
                        className={regenerating ? "animate-spin" : undefined}
                      />
                      {t("channel.regenerateTitle")}
                    </Button>
                  </div>
                </div>

                {/* Live widget preview */}
                <div className="relative overflow-hidden border-t border-border bg-[#0b0c11] md:border-t-0 md:border-l">
                  <div className="tg-chat-wallpaper pointer-events-none absolute inset-0 opacity-70" />
                  <div className="relative flex h-full min-h-[320px] flex-col items-center justify-center gap-3 p-5 2xl:min-h-[380px]">
                    <div
                      className="w-full max-w-[290px] overflow-hidden rounded-2xl border border-white/10 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.9)] 2xl:max-w-[320px]"
                      style={{ backgroundColor: appearance.background_color }}
                    >
                      <div
                        className="flex items-center gap-2.5 px-3.5 py-3"
                        style={{ backgroundColor: appearance.header_color }}
                      >
                        <img
                          src={icons.chat || orqivaMark}
                          alt=""
                          className="size-8 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[11.5px] font-semibold text-white">
                            {name || t("channel.namePlaceholder")}
                          </p>
                          <p className="flex items-center gap-1 text-[9.5px] text-white/55">
                            <span
                              className="size-1.5 rounded-full"
                              style={{
                                backgroundColor: isActive
                                  ? "#34d399"
                                  : "#f59e0b",
                              }}
                            />
                            {isActive
                              ? t("public.online")
                              : t("channel.widgetOffline")}
                          </p>
                        </div>
                        <span
                          className="ml-auto text-sm leading-none text-white/40"
                          aria-hidden="true"
                        >
                          &#8943;
                        </span>
                      </div>

                      <div className="space-y-1.5 px-3 py-3">
                        {welcome.trim() && (
                          <div className="max-w-[82%] rounded-xl rounded-tl-sm bg-white/10 px-2.5 py-1.5 text-[10px] leading-4 text-white/85 backdrop-blur">
                            {welcome.trim()}
                          </div>
                        )}
                        <div
                          className="max-w-[78%] rounded-xl rounded-tl-sm px-2.5 py-1.5 text-[10px] leading-4 text-white/85"
                          style={{ backgroundColor: "#182533" }}
                        >
                          {t("channel.previewIncoming")}
                        </div>
                        <div
                          className="ml-auto max-w-[78%] rounded-xl rounded-tr-sm px-2.5 py-1.5 text-[10px] leading-4 text-white/90"
                          style={{ backgroundColor: appearance.outgoing_color }}
                        >
                          {t("channel.previewOutgoing")}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 px-3 pb-3">
                        <div className="min-w-0 flex-1 truncate rounded-full bg-black/25 px-3 py-1.5 text-[10px] text-white/40">
                          {placeholder.trim() ||
                            t("channel.placeholderPlaceholder")}
                        </div>
                        <span
                          className="flex size-7 shrink-0 items-center justify-center rounded-full text-white"
                          style={{ backgroundColor: appearance.accent_color }}
                        >
                          <PaperPlaneRight size={13} weight="fill" />
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground/70">
                      {t("channel.previewTitle")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Install */}
            <h2 className="px-1 text-sm font-semibold text-foreground">
              {t("channel.installTitle")}
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                <h2 className="text-sm font-semibold text-foreground">
                  {t("channel.linkTitle")}
                </h2>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                  {t("channel.linkDescription")}
                </p>
                <div className="mt-3 rounded-lg border border-border bg-background/60 p-3">
                  <p className="font-mono text-[11px] leading-5 break-all text-muted-foreground">
                    {widgetUrl || t("channel.tokenUnavailable")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => void copyWidgetUrl()}
                  disabled={!widgetUrl}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? t("channel.copiedUrl") : t("channel.copyUrl")}
                </Button>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                <h2 className="text-sm font-semibold text-foreground">
                  {t("channel.widgetSnippet")}
                </h2>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                  {t("channel.widgetSnippetDescription")}
                </p>
                <pre className="mt-3 max-h-[92px] overflow-auto rounded-lg border border-border bg-background/60 p-3 font-mono text-[10.5px] leading-5 text-muted-foreground">
                  <code>
                    {widgetSnippet || t("channel.tokenUnavailable")}
                  </code>
                </pre>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => void copyWidgetSnippet()}
                  disabled={!widgetSnippet}
                >
                  {snippetCopied ? <Check size={14} /> : <Copy size={14} />}
                  {snippetCopied
                    ? t("channel.snippetCopied")
                    : t("channel.copySnippet")}
                </Button>
              </div>
            </div>
          </div>

          {/* Channel catalog rail */}
          <div className="min-w-0 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">
                    {t("channel.catalogTitle")}
                  </h2>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                    {t("channel.catalogDescription")}
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {CHANNEL_CATALOG.map((item) => {
                  const Icon = item.icon;
                  const isTelegram = item.id === "telegram";
                  const available = item.active || isTelegram;
                  const connected = isTelegram ? telegram !== null : true;
                  const cardActive = isTelegram
                    ? Boolean(telegram?.is_active)
                    : isActive;
                  const badgeLabel = !available
                    ? t("channel.cardComingSoon")
                    : !connected
                      ? t("channel.cardNotConnected")
                      : cardActive
                        ? t("channel.cardActive")
                        : t("channel.cardInactive");

                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                        available
                          ? "border-border/80 bg-background/40 hover:border-primary/25"
                          : "border-border/60 bg-card/30"
                      }`}
                    >
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${item.tile}`}
                      >
                        <Icon size={18} weight="fill" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p
                            className={`truncate text-[12.5px] font-medium ${
                              available
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {t(item.nameKey)}
                          </p>
                          <span
                            className={`rounded-full border px-1.5 py-px text-[9.5px] font-medium ${
                              !available
                                ? "border-border bg-muted/30 text-muted-foreground"
                                : cardActive
                                  ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                                  : "border-amber-400/25 bg-amber-400/10 text-amber-300"
                            }`}
                          >
                            {badgeLabel}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                          {t(item.descriptionKey)}
                        </p>

                        <div className="mt-2">
                          {isTelegram ? (
                            <Button
                              type="button"
                              variant={telegram ? "outline" : "default"}
                              size="sm"
                              className="h-7 w-full text-[11px]"
                              onClick={openTelegram}
                            >
                              <TelegramLogo size={13} weight="bold" />
                              {telegram
                                ? t("channel.telegramManage")
                                : t("channel.telegramConnect")}
                            </Button>
                          ) : item.active ? (
                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[11px]"
                                onClick={openEditor}
                              >
                                <PencilSimple size={12} weight="bold" />
                                {t("channel.editWidgetTitle")}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                title={t("channel.openWidgetTitle")}
                                aria-label={t("channel.openWidgetTitle")}
                                onClick={() =>
                                  window.open(
                                    widgetUrl,
                                    "_blank",
                                    "noopener,noreferrer",
                                  )
                                }
                                disabled={!widgetUrl}
                              >
                                <ArrowSquareOut size={13} weight="bold" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                title={t("channel.regenerateTitle")}
                                aria-label={t("channel.regenerateTitle")}
                                onClick={() => void regenerate()}
                                disabled={regenerating}
                              >
                                <ArrowsClockwise
                                  size={13}
                                  weight="bold"
                                  className={
                                    regenerating ? "animate-spin" : undefined
                                  }
                                />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60">
                              {t("channel.cardComingSoon")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] p-4">
              <div className="flex items-center gap-2 text-[12.5px] font-medium text-foreground">
                <ShieldCheck size={15} className="text-primary" />
                {t("channel.crossTitle")}
              </div>
              <p className="mt-1.5 text-[11.5px] leading-5 text-muted-foreground">
                {t("channel.crossDescription")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("channel.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("channel.dialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="channel-name">{t("channel.nameLabel")}</Label>
                <Input
                  id="channel-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={120}
                  placeholder={t("channel.namePlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel-workflow">{t("channel.workflowLabel")}</Label>
                <Select
                  value={workflowId || "none"}
                  onValueChange={(value) =>
                    setWorkflowId(!value || value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger id="channel-workflow" className="w-full">
                    <SelectValue>
                      {(value) =>
                        !value || value === "none"
                          ? t("channel.selectWorkflow")
                          : (entryWorkflows.find(
                              (workflow) => String(workflow.id) === value,
                            )?.name ?? t("channel.workflowFallback"))
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("channel.noneSelected")}</SelectItem>
                    {entryWorkflows.map((workflow) => (
                      <SelectItem key={workflow.id} value={String(workflow.id)}>
                        {workflow.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {entryWorkflows.length === 0 && (
                  <p className="flex items-start gap-2 text-xs leading-5 text-amber-300">
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                    {t("channel.noTriggerWarning")}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel-welcome">
                {t("channel.welcomeLabel")}{" "}
                <span className="font-normal text-muted-foreground">
                  {t("channel.optional")}
                </span>
              </Label>
              <Textarea
                id="channel-welcome"
                rows={3}
                value={welcome}
                onChange={(event) => setWelcome(event.target.value)}
                maxLength={1000}
                placeholder={t("channel.welcomePlaceholder")}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                {t("channel.welcomeHint")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel-placeholder">
                {t("channel.placeholderLabel")}{" "}
                <span className="font-normal text-muted-foreground">
                  {t("channel.optional")}
                </span>
              </Label>
              <Input
                id="channel-placeholder"
                value={placeholder}
                onChange={(event) => setPlaceholder(event.target.value)}
                maxLength={160}
                placeholder={t("channel.placeholderPlaceholder")}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                {t("channel.placeholderHint")}
              </p>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("channel.openModeTitle")}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {t("channel.openModeDescription")}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
                    openMode === "manual"
                      ? "border-primary/40 bg-primary/[0.06]"
                      : "border-border bg-background"
                  }`}
                >
                  <input
                    type="radio"
                    name="channel-open-mode"
                    className="mt-0.5 size-4 accent-primary"
                    checked={openMode === "manual"}
                    onChange={() => setOpenMode("manual")}
                  />
                  <span>
                    <span className="block text-sm font-medium text-foreground">
                      {t("channel.openModeManual")}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {t("channel.openModeManualHint")}
                    </span>
                  </span>
                </label>
                <label
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
                    openMode === "always"
                      ? "border-primary/40 bg-primary/[0.06]"
                      : "border-border bg-background"
                  }`}
                >
                  <input
                    type="radio"
                    name="channel-open-mode"
                    className="mt-0.5 size-4 accent-primary"
                    checked={openMode === "always"}
                    onChange={() => setOpenMode("always")}
                  />
                  <span>
                    <span className="block text-sm font-medium text-foreground">
                      {t("channel.openModeAlways")}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {t("channel.openModeAlwaysHint")}
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("channel.appearanceTitle")}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {t("channel.appearanceDescription")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAppearance(TELEGRAM_APPEARANCE)}
                >
                  <RotateCcw />
                  {t("channel.resetColors")}
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ColorField
                  id="channel-header-color"
                  label={t("channel.headerColor")}
                  value={appearance.header_color}
                  onChange={(value) =>
                    setAppearance((current) => ({
                      ...current,
                      header_color: value,
                    }))
                  }
                />
                <ColorField
                  id="channel-background-color"
                  label={t("channel.backgroundColor")}
                  value={appearance.background_color}
                  onChange={(value) =>
                    setAppearance((current) => ({
                      ...current,
                      background_color: value,
                    }))
                  }
                />
                <ColorField
                  id="channel-outgoing-color"
                  label={t("channel.outgoingColor")}
                  value={appearance.outgoing_color}
                  onChange={(value) =>
                    setAppearance((current) => ({
                      ...current,
                      outgoing_color: value,
                    }))
                  }
                />
                <ColorField
                  id="channel-accent-color"
                  label={t("channel.accentColor")}
                  value={appearance.accent_color}
                  onChange={(value) =>
                    setAppearance((current) => ({
                      ...current,
                      accent_color: value,
                    }))
                  }
                />
              </div>

              <div
                className="overflow-hidden rounded-lg border border-white/10"
                style={{ backgroundColor: appearance.background_color }}
              >
                <div
                  className="flex items-center gap-2 px-3 py-2"
                  style={{ backgroundColor: appearance.header_color }}
                >
                  <img
                    src={icons.chat || orqivaMark}
                    alt=""
                    className="size-6 rounded-full object-cover"
                  />
                  <span className="text-xs font-medium text-white">
                    {name || t("channel.namePlaceholder")}
                  </span>
                  <span
                    className="ml-auto size-2 rounded-full"
                    style={{ backgroundColor: appearance.accent_color }}
                  />
                </div>
                <div className="space-y-2 p-3">
                  <div
                    className="max-w-[78%] rounded-lg px-2.5 py-1.5 text-[11px] text-white/90"
                    style={{ backgroundColor: "#182533" }}
                  >
                    {t("channel.previewIncoming")}
                  </div>
                  <div
                    className="ml-auto max-w-[78%] rounded-lg px-2.5 py-1.5 text-[11px] text-white/90"
                    style={{ backgroundColor: appearance.outgoing_color }}
                  >
                    {t("channel.previewOutgoing")}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("channel.iconsTitle")}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {t("channel.iconsDescription")}
                </p>
              </div>

              <input
                ref={chatIconInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  void changeIcon("chat", file);
                }}
              />
              <input
                ref={launcherIconInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  void changeIcon("launcher", file);
                }}
              />

              {(
                [
                  {
                    kind: "chat" as const,
                    label: t("channel.chatIcon"),
                    hint: t("channel.chatIconHint"),
                    input: chatIconInput,
                  },
                  {
                    kind: "launcher" as const,
                    label: t("channel.launcherIcon"),
                    hint: t("channel.launcherIconHint"),
                    input: launcherIconInput,
                  },
                ] as const
              ).map((item) => (
                <div
                  key={item.kind}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-3"
                >
                  <img
                    src={icons[item.kind] || orqivaMark}
                    alt=""
                    className="size-11 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                      {item.hint}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingIcon !== null}
                      onClick={() => item.input.current?.click()}
                    >
                      {uploadingIcon === item.kind ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <ImagePlus />
                      )}
                      {t("channel.uploadIcon")}
                    </Button>
                    {icons[item.kind] && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title={t("channel.removeIcon")}
                        aria-label={t("channel.removeIcon")}
                        disabled={uploadingIcon !== null}
                        onClick={() => void removeIcon(item.kind)}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <p className="text-xs leading-5 text-muted-foreground">
                {t("channel.iconHint")}
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-primary"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  {t("channel.activateLabel")}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {t("channel.activateHint")}
                </span>
              </span>
            </label>
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
              {t("channel.updateWidget")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={telegramOpen} onOpenChange={setTelegramOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("channel.telegramDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("channel.telegramDialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {telegram && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                <TelegramLogo
                  size={16}
                  weight="fill"
                  className="text-sky-400"
                />
                <span className="font-medium text-foreground">
                  {telegram.external_id
                    ? t("channel.telegramConnectedAs", {
                        username: telegram.external_id,
                      })
                    : t("channel.cardNotConnected")}
                </span>
                {telegram.last_error && (
                  <span className="w-full leading-5 text-destructive">
                    {t("channel.telegramLastError", {
                      error: telegram.last_error,
                    })}
                  </span>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="telegram-token">
                {t("channel.botTokenLabel")}
              </Label>
              <Input
                id="telegram-token"
                type="password"
                autoComplete="off"
                value={botToken}
                onChange={(event) => setBotToken(event.target.value)}
                maxLength={200}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                {telegram?.has_credentials
                  ? t("channel.botTokenKeepHint")
                  : t("channel.botTokenHint")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegram-name">{t("channel.nameLabel")}</Label>
              <Input
                id="telegram-name"
                value={telegramName}
                onChange={(event) => setTelegramName(event.target.value)}
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegram-workflow">
                {t("channel.workflowLabel")}
              </Label>
              <Select
                value={telegramWorkflowId || "none"}
                onValueChange={(value) =>
                  setTelegramWorkflowId(
                    !value || value === "none" ? "" : value,
                  )
                }
              >
                <SelectTrigger id="telegram-workflow" className="w-full">
                  <SelectValue>
                    {(value) =>
                      !value || value === "none"
                        ? t("channel.selectWorkflow")
                        : (entryWorkflows.find(
                            (workflow) => String(workflow.id) === value,
                          )?.name ?? t("channel.workflowFallback"))
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    {t("channel.noneSelected")}
                  </SelectItem>
                  {entryWorkflows.map((workflow) => (
                    <SelectItem key={workflow.id} value={String(workflow.id)}>
                      {workflow.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {entryWorkflows.length === 0 && (
                <p className="flex items-start gap-2 text-xs leading-5 text-amber-300">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                  {t("channel.noTriggerWarning")}
                </p>
              )}
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-primary"
                checked={telegramActive}
                onChange={(event) => setTelegramActive(event.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  {t("channel.activateLabel")}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {t("channel.telegramActivateHint")}
                </span>
              </span>
            </label>
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTelegramOpen(false)}
              disabled={telegramSaving}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void saveTelegram()}
              disabled={telegramSaving}
            >
              {telegramSaving ? <LoaderCircle className="animate-spin" /> : <Save />}
              {t("channel.telegramSave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="size-8 cursor-pointer rounded-md border-0 bg-transparent p-0"
        />
        <span className="font-mono text-xs text-muted-foreground uppercase">
          {value}
        </span>
      </div>
    </div>
  );
}
