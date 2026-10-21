import { useEffect, useState } from "react";
import {
  ArrowsSplit,
  GoogleLogo,
  OpenAiLogo,
} from "@phosphor-icons/react";
import {
  ArrowUpRight,
  Check,
  KeyRound,
  LoaderCircle,
  Save,
  ShieldCheck,
  Timer,
  Trash2,
  TriangleAlert,
} from "lucide-react";

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
import { useI18n } from "@/lib/i18n";
import { getErrorMessage } from "../services/api";
import {
  deleteAiProvider,
  detectAiModels,
  getAiSettings,
  updateAiSettings,
  type AiProvider,
  type AiSettings,
} from "../services/aiSettings";

const PROVIDERS = [
  {
    provider: "gemini",
    name: "Google Gemini",
    descriptionKey: "ai.provider.gemini",
    icon: GoogleLogo,
    tile: "border-primary/25 bg-primary/10 text-primary",
    docs: "https://aistudio.google.com/app/apikey",
  },
  {
    provider: "openai",
    name: "OpenAI",
    descriptionKey: "ai.provider.openai",
    icon: OpenAiLogo,
    tile: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    docs: "https://platform.openai.com/api-keys",
  },
  {
    provider: "openrouter",
    name: "OpenRouter",
    descriptionKey: "ai.provider.openrouter",
    icon: ArrowsSplit,
    tile: "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-300",
    docs: "https://openrouter.ai/keys",
  },
] as const;

const fieldClass =
  "mt-2 h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-2 focus:ring-primary/10";

export default function AiProviders() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialogProvider, setDialogProvider] = useState<AiProvider | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [defaultModel, setDefaultModel] = useState("");
  const [detectedModels, setDetectedModels] = useState<string[] | null>(null);
  const [dialogError, setDialogError] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [debounceMs, setDebounceMs] = useState("0");
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefError, setPrefError] = useState("");

  useEffect(() => {
    let active = true;

    getAiSettings()
      .then((result) => {
        if (!active) return;

        setSettings(result);
        setDebounceMs(String(result.debounce_ms));
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(getErrorMessage(caught, t("ai.errorLoad")));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // AI settings should only load once per page visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const configuredCount =
    settings?.providers.filter((provider) => provider.configured).length ?? 0;
  const activeCatalog = PROVIDERS.find(
    (provider) => provider.provider === dialogProvider,
  );
  const activeSetting = settings?.providers.find(
    (provider) => provider.provider === dialogProvider,
  );
  const availableModels = detectedModels ?? activeSetting?.models ?? [];

  function openProvider(provider: AiProvider) {
    const setting = settings?.providers.find(
      (candidate) => candidate.provider === provider,
    );

    setDialogProvider(provider);
    setApiKey("");
    setDefaultModel(setting?.default_model ?? setting?.models[0] ?? "");
    setDetectedModels(null);
    setDialogError("");
  }

  function closeDialog() {
    setDialogProvider(null);
    setApiKey("");
    setDefaultModel("");
    setDetectedModels(null);
    setDialogError("");
  }

  async function handleDetect() {
    if (!apiKey.trim() && !activeSetting?.configured) {
      setDialogError(t("ai.keyRequired"));
      return;
    }

    setDetecting(true);
    setDialogError("");

    try {
      const result = await detectAiModels({
        provider: dialogProvider as AiProvider,
        ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
      });

      setDetectedModels(result.models);
      setDefaultModel((current) =>
        current && result.models.includes(current)
          ? current
          : (result.models[0] ?? ""),
      );
    } catch (caught) {
      setDialogError(getErrorMessage(caught, t("ai.errorDetect")));
    } finally {
      setDetecting(false);
    }
  }

  async function handleSave() {
    if (!dialogProvider) return;

    if (!apiKey.trim() && !activeSetting?.configured) {
      setDialogError(t("ai.keyRequiredProvider"));
      return;
    }

    setSaving(true);
    setDialogError("");

    try {
      const result = await updateAiSettings({
        provider: dialogProvider,
        ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
        ...(defaultModel ? { default_model: defaultModel } : {}),
      });

      setSettings(result);
      setNotice(
        t("ai.keySaved", { name: activeCatalog?.name ?? t("ai.providerFallback") }),
      );
      closeDialog();
    } catch (caught) {
      setDialogError(getErrorMessage(caught, t("ai.errorSave")));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!dialogProvider || !activeSetting?.configured) return;

    if (
      !window.confirm(
        t("ai.deleteConfirm", {
          name: activeCatalog?.name ?? t("ai.providerFallback"),
        }),
      )
    ) {
      return;
    }

    setDeleting(true);
    setDialogError("");

    try {
      const result = await deleteAiProvider(dialogProvider);
      setSettings(result);
      setNotice(
        t("ai.keyDeleted", { name: activeCatalog?.name ?? t("ai.providerFallback") }),
      );
      closeDialog();
    } catch (caught) {
      setDialogError(getErrorMessage(caught, t("ai.errorDelete")));
    } finally {
      setDeleting(false);
    }
  }

  async function savePreferences() {
    setPrefSaving(true);
    setPrefError("");

    try {
      const result = await updateAiSettings({
        debounce_ms: Math.max(0, Math.min(5000, Number(debounceMs) || 0)),
      });

      setSettings(result);
      setDebounceMs(String(result.debounce_ms));
      setNotice(t("ai.prefSaved"));
    } catch (caught) {
      setPrefError(getErrorMessage(caught, t("ai.errorPrefs")));
    } finally {
      setPrefSaving(false);
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
              <KeyRound className="size-4" />
              {t("ai.eyebrow")}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {t("nav.apiKeys")}
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("ai.subtitle")}
            </p>
          </div>

          <span
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
              configuredCount > 0
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : "border-amber-400/30 bg-amber-400/10 text-amber-300"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                configuredCount > 0 ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            {configuredCount > 0
              ? t("ai.connectedCount", { count: configuredCount })
              : t("ai.noneConnected")}
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
                {t("ai.catalogTitle")}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t("ai.catalogDescription")}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {t("ai.catalogCount", {
                active: configuredCount,
                unset: PROVIDERS.length - configuredCount,
              })}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {PROVIDERS.map((item) => {
              const Icon = item.icon;
              const setting = settings?.providers.find(
                (provider) => provider.provider === item.provider,
              );
              const configured = setting?.configured ?? false;

              return (
                <button
                  key={item.provider}
                  type="button"
                  onClick={() => openProvider(item.provider)}
                  aria-label={t("ai.configureAria", { name: item.name })}
                  className={`group relative flex min-h-60 flex-col rounded-xl border p-5 text-left transition hover:-translate-y-0.5 ${
                    configured
                      ? "border-primary/30 bg-[linear-gradient(145deg,rgba(59,130,246,0.10),rgba(15,23,42,0.18))] shadow-lg shadow-black/10"
                      : "border-border bg-card/60 hover:border-primary/25 hover:bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`flex size-12 items-center justify-center rounded-xl border ${item.tile}`}
                    >
                      <Icon size={26} weight="fill" />
                    </span>
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-medium ${
                        configured
                          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                          : "border-border bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      {configured ? t("ai.cardConnected") : t("ai.cardNotConfigured")}
                    </span>
                  </div>

                  <div className="mt-4 min-h-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {t(item.descriptionKey)}
                    </p>
                    {configured && (
                      <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground/80">
                        {setting?.default_model ??
                          setting?.models[0] ??
                          t("ai.modelNotChosen")}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-3">
                    <span className="inline-flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                      <KeyRound className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {configured
                          ? t("ai.modelsAvailable", {
                              count: setting?.models.length ?? 0,
                            })
                          : t("ai.keyNotSaved")}
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                      {t("ai.configure")}
                      <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="gap-0 py-0">
            <div className="border-b border-border px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Timer className="size-4 text-muted-foreground" />
                {t("ai.prefTitle")}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t("ai.prefDescription")}
              </p>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px] sm:items-end">
                <div>
                  <Label htmlFor="ai-debounce">{t("ai.debounceLabel")}</Label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      id="ai-debounce-range"
                      type="range"
                      min={0}
                      max={5000}
                      step={100}
                      value={Number(debounceMs) || 0}
                      onChange={(event) => setDebounceMs(event.target.value)}
                      className="h-1.5 w-full cursor-pointer accent-primary"
                    />
                    <span className="w-14 shrink-0 text-right text-xs text-muted-foreground">
                      {Number(debounceMs) || 0} ms
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {t("ai.debounceHint")}
                  </p>
                </div>
                <Input
                  id="ai-debounce"
                  type="number"
                  min={0}
                  max={5000}
                  step={100}
                  value={debounceMs}
                  onChange={(event) => setDebounceMs(event.target.value)}
                  className={fieldClass}
                />
              </div>

              {prefError && (
                <p className="rounded-lg border border-destructive/25 bg-destructive/[0.06] px-3 py-2 text-xs leading-5 text-destructive">
                  {prefError}
                </p>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => void savePreferences()}
                disabled={prefSaving}
              >
                {prefSaving ? <LoaderCircle className="animate-spin" /> : <Save />}
                {t("ai.savePrefs")}
              </Button>
            </div>
          </Card>

          <Card className="border-primary/20 bg-primary/[0.04] p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldCheck className="size-4 text-primary" />
              {t("ai.secureTitle")}
            </div>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
              <li>{t("ai.secure1")}</li>
              <li>{t("ai.secure2")}</li>
              <li>{t("ai.secure3")}</li>
              <li>{t("ai.secure4")}</li>
            </ul>
          </Card>
        </div>
      </div>

      <Dialog
        open={dialogProvider !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {activeCatalog && (
                <span
                  className={`flex size-11 items-center justify-center rounded-xl border ${activeCatalog.tile}`}
                >
                  <activeCatalog.icon size={24} weight="fill" />
                </span>
              )}
              <div>
                <DialogTitle>{activeCatalog?.name ?? t("ai.providerFallback")}</DialogTitle>
                <DialogDescription>
                  {t("ai.dialogDescription")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5">
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs ${
                activeSetting?.configured
                  ? "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-200"
                  : "border-amber-400/25 bg-amber-400/[0.06] text-amber-200"
              }`}
            >
              {activeSetting?.configured ? (
                <Check className="size-4" />
              ) : (
                <TriangleAlert className="size-4" />
              )}
              {activeSetting?.configured
                ? t("ai.keyConfigured", {
                    count: activeSetting.models.length,
                  })
                : t("ai.providerNoKey")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-provider-key">{t("ai.apiKeyLabel")}</Label>
              <Input
                id="ai-provider-key"
                type="password"
                value={apiKey}
                onChange={(event) => {
                  setApiKey(event.target.value);
                  setDetectedModels(null);
                  setDefaultModel("");
                  setDialogError("");
                }}
                autoComplete="new-password"
                spellCheck={false}
                placeholder={
                  activeSetting?.configured
                    ? t("ai.keyPlaceholderExisting")
                    : t("ai.keyPlaceholderNew", {
                        name: activeCatalog?.name ?? t("ai.providerFallback"),
                      })
                }
              />
              <p className="text-xs leading-5 text-muted-foreground">
                {t("ai.keyHint")}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="ai-provider-model">{t("ai.defaultModel")}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleDetect()}
                  disabled={detecting || saving || deleting}
                >
                  {detecting ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <ArrowUpRight />
                  )}
                  {detecting ? t("ai.detecting") : t("ai.detectModels")}
                </Button>
              </div>
              <select
                id="ai-provider-model"
                className={fieldClass}
                value={defaultModel}
                onChange={(event) => setDefaultModel(event.target.value)}
                disabled={availableModels.length === 0}
              >
                {availableModels.length === 0 && (
                  <option value="">{t("ai.detectFirst")}</option>
                )}
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
                {defaultModel &&
                  !availableModels.includes(defaultModel) && (
                    <option value={defaultModel}>{defaultModel}</option>
                  )}
              </select>
              <p className="text-xs leading-5 text-muted-foreground">
                {availableModels.length > 0
                  ? t("ai.modelsAvailableCount", {
                      count: availableModels.length,
                    })
                  : t("ai.detectHint")}
              </p>
            </div>

            {dialogError && (
              <p className="rounded-lg border border-destructive/25 bg-destructive/[0.06] px-3 py-2 text-xs leading-5 text-destructive">
                {dialogError}
              </p>
            )}

            <a
              href={activeCatalog?.docs}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              {t("ai.getKey", {
                name: activeCatalog?.name ?? t("ai.providerFallback"),
              })}
              <ArrowUpRight className="size-3.5" />
            </a>
          </div>

          <DialogFooter className="mt-2 sm:justify-between">
            <div>
              {activeSetting?.configured && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void handleDelete()}
                  disabled={deleting || saving || detecting}
                >
                  {deleting ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Trash2 />
                  )}
                  {t("ai.deleteKey")}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={saving || deleting}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || deleting || detecting}
              >
                {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
                {t("ai.saveKey")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
