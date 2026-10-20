import { useEffect, useMemo, useState } from "react";
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
  LoaderCircle,
  Save,
  ShieldCheck,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "../services/api";
import {
  getChannel,
  getWorkflowOptions,
  regenerateChannelToken,
  updateChannel,
  type WidgetChannel,
  type WorkflowOption,
} from "../services/channel";

const CHANNEL_CATALOG = [
  {
    id: "widget",
    name: "Website Chat Widget",
    description: "Pasang widget langsung di website dan hubungkan ke workflow entry.",
    icon: ChatCircleDots,
    tile: "border-primary/25 bg-primary/10 text-primary",
    active: true,
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Hubungkan bot Telegram untuk menerima pesan pelanggan.",
    icon: TelegramLogo,
    tile: "border-sky-400/25 bg-sky-400/10 text-sky-400",
    active: false,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "Balas chat WhatsApp Business langsung dari FlowPilot.",
    icon: WhatsappLogo,
    tile: "border-emerald-400/25 bg-emerald-400/10 text-emerald-400",
    active: false,
  },
  {
    id: "instagram",
    name: "Instagram DM",
    description: "Tangani pesan langsung Instagram dalam satu inbox.",
    icon: InstagramLogo,
    tile: "border-pink-400/25 bg-pink-400/10 text-pink-400",
    active: false,
  },
  {
    id: "messenger",
    name: "Messenger",
    description: "Hubungkan Facebook Messenger untuk percakapan pelanggan.",
    icon: MessengerLogo,
    tile: "border-blue-400/25 bg-blue-400/10 text-blue-400",
    active: false,
  },
] as const;

export default function Channel() {
  const [channel, setChannel] = useState<WidgetChannel | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
  const [name, setName] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [welcome, setWelcome] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  function applyChannel(value: WidgetChannel) {
    setChannel(value);
    setName(value.name);
    setWorkflowId(value.workflow_id ? String(value.workflow_id) : "");
    setIsActive(value.is_active);
    setWelcome(value.settings.welcome_message ?? "");
    setPlaceholder(value.settings.placeholder ?? "");
  }

  useEffect(() => {
    let active = true;

    Promise.all([getChannel(), getWorkflowOptions()])
      .then(([channelData, workflowData]) => {
        if (!active) return;
        applyChannel(channelData);
        setWorkflows(workflowData);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(
            getErrorMessage(
              caught,
              "Channel gagal dimuat. Periksa koneksi backend.",
            ),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
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
        },
      });

      applyChannel(updated);
      setEditing(false);
      setNotice("Pengaturan widget berhasil diperbarui.");
    } catch (caught) {
      setError(
        getErrorMessage(caught, "Channel gagal disimpan. Periksa pengaturan."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function regenerate() {
    if (!channel || regenerating) return;
    if (
      !window.confirm(
        "Ganti token widget? Tautan lama langsung berhenti bekerja dan perlu dipasang ulang.",
      )
    ) {
      return;
    }

    setRegenerating(true);
    setError("");
    setNotice("");

    try {
      applyChannel(await regenerateChannelToken());
      setNotice("Token widget berhasil diperbarui.");
    } catch (caught) {
      setError(getErrorMessage(caught, "Token widget gagal diperbarui."));
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
      setError("Tautan gagal disalin. Salin URL secara manual.");
    }
  }

  function openEditor() {
    setError("");
    setEditing(true);
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
              Workspace
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Channel
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Satu widget per akun. Widget memakai workflow entry sebagai titik
              awal, lalu alur lanjutan dijalankan lewat Go To.
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
            {isActive ? "Widget aktif" : "Widget nonaktif"}
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
              Tutup
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
              Tutup
            </Button>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Saluran yang tersedia
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Widget website siap dipakai. Kanal lain segera hadir.
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              1 aktif · 4 coming soon
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {CHANNEL_CATALOG.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  className={`relative flex min-h-52 flex-col rounded-xl border p-4 transition ${
                    item.active
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
                        item.active
                          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                          : "border-border bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      {item.active
                        ? isActive
                          ? "Aktif"
                          : "Nonaktif"
                        : "Coming soon"}
                    </span>
                  </div>

                  <div className="mt-4 min-h-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>

                  {item.active ? (
                    <div className="mt-4 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        title="Edit widget"
                        aria-label="Edit website widget"
                        onClick={openEditor}
                      >
                        <PencilSimple size={15} weight="bold" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        title="Buka widget"
                        aria-label="Buka widget di tab baru"
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
                        title="Ganti token widget"
                        aria-label="Ganti token widget"
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
                      Coming soon
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
                Tautan widget
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Salin URL untuk dipasang atau dibagikan ke pelanggan.
              </p>
            </div>
            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 rounded-lg border border-border bg-background p-3">
                <p className="break-all font-mono text-xs leading-5 text-muted-foreground">
                  {widgetUrl || "Token belum tersedia"}
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
                {copied ? "Tersalin" : "Salin URL"}
              </Button>
            </div>
          </Card>

          <Card className="border-primary/20 bg-primary/[0.04] p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldCheck className="size-4 text-primary" />
              Alur lintas workflow
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Workflow entry dapat memakai Go To untuk berpindah ke workflow
              lanjutan. Workflow lanjutan tidak perlu Trigger dan tetap berada
              dalam audit log session yang sama.
            </p>
          </Card>
        </div>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit website widget</DialogTitle>
            <DialogDescription>
              Atur nama, workflow entry, pesan pembuka, dan placeholder widget.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="channel-name">Nama channel</Label>
                <Input
                  id="channel-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={120}
                  placeholder="Website Chat Widget"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel-workflow">Workflow entry</Label>
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
                          ? "Pilih workflow..."
                          : (entryWorkflows.find(
                              (workflow) => String(workflow.id) === value,
                            )?.name ?? "Workflow")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Belum dipilih</SelectItem>
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
                    Belum ada workflow dengan node Trigger. Tambahkan Trigger
                    pada workflow entry terlebih dahulu.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel-welcome">
                Pesan pembuka{" "}
                <span className="font-normal text-muted-foreground">
                  (opsional)
                </span>
              </Label>
              <Textarea
                id="channel-welcome"
                rows={3}
                value={welcome}
                onChange={(event) => setWelcome(event.target.value)}
                maxLength={1000}
                placeholder="Halo! Ada yang bisa kami bantu?"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Kosongkan jika tidak ingin menampilkan pesan pembuka.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel-placeholder">
                Placeholder input{" "}
                <span className="font-normal text-muted-foreground">
                  (opsional)
                </span>
              </Label>
              <Input
                id="channel-placeholder"
                value={placeholder}
                onChange={(event) => setPlaceholder(event.target.value)}
                maxLength={160}
                placeholder="Tulis pesan..."
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Kosongkan untuk memakai placeholder default.
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
                  Aktifkan widget publik
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  Widget hanya menerima pesan jika aktif dan sudah memiliki
                  workflow entry.
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
              Batal
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
              Update widget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
