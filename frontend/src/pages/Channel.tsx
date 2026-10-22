import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowSquareOut,
  ArrowsClockwise,
  ChatCircleDots,
  Check,
  Copy,
  Globe,
  InstagramLogo,
  MessengerLogo,
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
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

  return (
    <section className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              <Globe className="size-4" weight="duotone" />
              {t("channel.eyebrow")}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Channel
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("channel.subtitle")}
            </p>
          </div>

          <span
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
              isActive
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : "border-amber-400/30 bg-amber-400/10 text-amber-300"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-amber-400"}`}
            />
            {isActive ? t("channel.widgetActive") : t("channel.widgetInactive")}
          </span>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
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
            className="flex items-center justify-between gap-4 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"
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

        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {t("channel.catalogTitle")}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t("channel.catalogDescription")}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {t("channel.catalogCount", {
                active: 1 + (telegram ? 1 : 0),
                soon: 3,
              })}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {CHANNEL_CATALOG.map((item) => {
              const Icon = item.icon;
              const isTelegram = item.id === "telegram";
              const available = item.active || isTelegram;
              const connected = isTelegram ? telegram !== null : true;
              const cardActive = isTelegram ? Boolean(telegram?.is_active) : isActive;
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
                  className={`relative flex min-h-52 flex-col rounded-xl border p-4 transition ${
                    available
                      ? "border-primary/30 bg-[linear-gradient(145deg,rgba(59,130,246,0.10),rgba(15,23,42,0.18))] shadow-lg shadow-black/10"
                      : "border-border bg-card/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`flex size-11 items-center justify-center rounded-xl border ${item.tile}`}
                    >
                      <Icon size={24} weight="fill" />
                    </span>
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-medium ${
                        !available
                          ? "border-border bg-muted/40 text-muted-foreground"
                          : cardActive
                            ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                            : "border-amber-400/25 bg-amber-400/10 text-amber-300"
                      }`}
                    >
                      {badgeLabel}
                    </span>
                  </div>

                  <div className="mt-4 min-h-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      {t(item.nameKey)}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {t(item.descriptionKey)}
                    </p>
                  </div>

                  {isTelegram ? (
                    <Button
                      type="button"
                      variant={telegram ? "outline" : "default"}
                      size="sm"
                      className="mt-4 w-full"
                      onClick={openTelegram}
                    >
                      <TelegramLogo size={15} weight="bold" />
                      {telegram
                        ? t("channel.telegramManage")
                        : t("channel.telegramConnect")}
                    </Button>
                  ) : item.active ? (
                    <div className="mt-4 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        title={t("channel.editWidgetTitle")}
                        aria-label={t("channel.editWidgetTitle")}
                        onClick={openEditor}
                      >
                        <PencilSimple size={15} weight="bold" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        title={t("channel.openWidgetTitle")}
                        aria-label={t("channel.openWidgetTitle")}
                        onClick={() =>
                          window.open(widgetUrl, "_blank", "noopener,noreferrer")
                        }
                        disabled={!widgetUrl}
                      >
                        <ArrowSquareOut size={15} weight="bold" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        title={t("channel.regenerateTitle")}
                        aria-label={t("channel.regenerateTitle")}
                        onClick={() => void regenerate()}
                        disabled={regenerating}
                      >
                        <ArrowsClockwise
                          size={15}
                          weight="bold"
                          className={regenerating ? "animate-spin" : undefined}
                        />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled
                      className="mt-4 w-full"
                    >
                      {t("channel.cardComingSoon")}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="gap-0 py-0">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">
                {t("channel.linkTitle")}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t("channel.linkDescription")}
              </p>
            </div>
            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 rounded-lg border border-border bg-background p-3">
                <p className="break-all font-mono text-xs leading-5 text-muted-foreground">
                  {widgetUrl || t("channel.tokenUnavailable")}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void copyWidgetUrl()}
                disabled={!widgetUrl}
                className="shrink-0"
              >
                {copied ? <Check /> : <Copy />}
                {copied ? t("channel.copiedUrl") : t("channel.copyUrl")}
              </Button>
            </div>
          </Card>

          <Card className="border-primary/20 bg-primary/[0.04] p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldCheck className="size-4 text-primary" />
              {t("channel.crossTitle")}
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {t("channel.crossDescription")}
            </p>
          </Card>
        </div>

        <Card className="gap-0 py-0">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {t("channel.widgetSnippet")}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t("channel.widgetSnippetDescription")}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void copyWidgetSnippet()}
              disabled={!widgetSnippet}
            >
              {snippetCopied ? <Check /> : <Copy />}
              {snippetCopied
                ? t("channel.snippetCopied")
                : t("channel.copySnippet")}
            </Button>
          </div>
          <div className="p-5">
            <pre className="overflow-x-auto rounded-lg border border-border bg-background p-4 font-mono text-xs leading-6 text-muted-foreground">
              <code>{widgetSnippet || t("channel.tokenUnavailable")}</code>
            </pre>
          </div>
        </Card>
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
