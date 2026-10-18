import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  LoaderCircle,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  Workflow as WorkflowIcon,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createWorkflow,
  deleteWorkflow,
  getWorkflows,
  updateWorkflow,
} from "../services/workflow";
import type { Workflow as WorkflowItem } from "../types/workflow";

interface WorkflowsProps {
  onOpenWorkflow: (workflowId: string) => void;
  onTestWorkflow: (workflowId: string) => void;
}

const SELECT_CLASS =
  "h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

export default function Workflows({
  onOpenWorkflow,
  onTestWorkflow,
}: WorkflowsProps) {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<WorkflowItem | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [workflowToEdit, setWorkflowToEdit] = useState<WorkflowItem | null>(
    null,
  );
  const [savingEdit, setSavingEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<WorkflowItem["status"]>("draft");

  async function loadWorkflows() {
    setLoading(true);
    setError("");

    try {
      const result = await getWorkflows();
      setWorkflows(result.data);
    } catch {
      setError("Workflow gagal dimuat. Periksa koneksi dan autentikasi API.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    getWorkflows()
      .then((result) => {
        if (active) setWorkflows(result.data);
      })
      .catch(() => {
        if (active) {
          setError("Workflow gagal dimuat. Periksa koneksi dan autentikasi API.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredWorkflows = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return workflows;

    return workflows.filter(
      (workflow) =>
        workflow.name.toLowerCase().includes(query) ||
        (workflow.description ?? "").toLowerCase().includes(query),
    );
  }, [workflows, search]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || creating) return;

    setCreating(true);
    setError("");

    try {
      const created = await createWorkflow(name.trim(), description.trim());

      setWorkflows((current) => [created, ...current]);
      setShowCreate(false);
      setName("");
      setDescription("");
    } catch {
      setError("Workflow gagal dibuat. Periksa koneksi backend dan validasi API.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!workflowToDelete || deleting) return;

    setDeleting(true);
    setError("");

    try {
      await deleteWorkflow(String(workflowToDelete.id));
      setWorkflows((current) =>
        current.filter((item) => item.id !== workflowToDelete.id),
      );
      setWorkflowToDelete(null);
    } catch {
      setError("Workflow gagal dihapus. Periksa koneksi API dan coba lagi.");
    } finally {
      setDeleting(false);
    }
  }

  function beginEdit(workflow: WorkflowItem) {
    setWorkflowToEdit(workflow);
    setEditName(workflow.name);
    setEditDescription(workflow.description ?? "");
    setEditStatus(workflow.status);
    setError("");
  }

  async function saveEdit(openCanvas: boolean) {
    if (!workflowToEdit || !editName.trim() || savingEdit) return;

    setSavingEdit(true);
    setError("");
    try {
      const updated = await updateWorkflow(String(workflowToEdit.id), {
        name: editName.trim(),
        description: editDescription.trim() || null,
        status: editStatus,
      });
      setWorkflows((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setWorkflowToEdit(updated);
      if (openCanvas) onOpenWorkflow(String(updated.id));
    } catch {
      setError(
        "Perubahan workflow gagal disimpan. Periksa koneksi API dan coba lagi.",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveEdit(false);
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full space-y-8">
        {workflowToEdit ? (
          <div className="mx-auto max-w-3xl">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setWorkflowToEdit(null)}
              className="mb-6 text-muted-foreground"
            >
              <ArrowRight className="rotate-180" />
              Kembali ke daftar workflow
            </Button>
            <form
              onSubmit={handleEditSubmit}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
            >
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    Edit workflow
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                    Perbarui detail workflow
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Simpan perubahan sebelum membuka kanvas workflow.
                  </p>
                </div>

                {error && (
                  <p
                    role="alert"
                    className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                  >
                    {error}
                  </p>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Nama workflow</Label>
                    <Input
                      id="edit-name"
                      required
                      maxLength={255}
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className="h-10 dark:bg-input/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-description">
                      Deskripsi{" "}
                      <span className="font-normal text-muted-foreground">
                        (opsional)
                      </span>
                    </Label>
                    <Textarea
                      id="edit-description"
                      rows={4}
                      value={editDescription}
                      onChange={(event) => setEditDescription(event.target.value)}
                      placeholder="Jelaskan fungsi workflow ini"
                      className="dark:bg-input/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-status">Status</Label>
                    <select
                      id="edit-status"
                      value={editStatus}
                      onChange={(event) =>
                        setEditStatus(
                          event.target.value as WorkflowItem["status"],
                        )
                      }
                      className={SELECT_CLASS}
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Draft belum aktif untuk otomasi. Active menandai workflow
                      siap digunakan.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={savingEdit}
                    onClick={() => setWorkflowToEdit(null)}
                    className="h-10 px-4"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={savingEdit || !editName.trim()}
                    className="h-10 px-4"
                  >
                    {savingEdit ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <CheckCircle2 />
                    )}
                    {savingEdit ? "Menyimpan..." : "Simpan perubahan"}
                  </Button>
                  <Button
                    type="button"
                    disabled={savingEdit || !editName.trim()}
                    onClick={() => void saveEdit(true)}
                    className="h-10 px-4"
                  >
                    {savingEdit ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <Pencil />
                    )}
                    Buka kanvas
                  </Button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* Page heading */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  <WorkflowIcon className="size-4" />
                  Workspace
                </div>

                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Workflows
                </h1>

                <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                  Buat, susun, dan kelola otomatisasi alur kerja dalam satu
                  tempat.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => setShowCreate(true)}
                className="h-10 px-4"
              >
                <Plus />
                Buat workflow baru
              </Button>
            </div>

            {/* Controls: search + refresh */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:max-w-md">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Cari workflow..."
                    aria-label="Cari workflow"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-10 pr-9 pl-9 dark:bg-input/30 [&::-webkit-search-cancel-button]:hidden"
                  />
                  {search && (
                    <button
                      type="button"
                      aria-label="Hapus pencarian"
                      onClick={() => setSearch("")}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Menampilkan{" "}
                  <span className="font-medium text-foreground">
                    {filteredWorkflows.length}
                  </span>{" "}
                  dari {workflows.length} workflow
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => void loadWorkflows()}
                disabled={loading}
                className="h-10 px-4"
              >
                {loading ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Activity />
                )}
                {loading ? "Memuat..." : "Segarkan"}
              </Button>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
              >
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => setError("")}
                  aria-label="Abatalkan pesan error"
                  className="text-destructive/70 transition hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-border bg-background text-center">
                <LoaderCircle className="size-7 animate-spin text-primary" />
                <p className="mt-4 text-sm font-medium text-foreground">
                  Memuat workflows
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Mengambil data dari workspace Anda.
                </p>
              </div>
            ) : filteredWorkflows.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/50 p-8 text-center">
                <span className="mb-4 flex size-14 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground">
                  <WorkflowIcon className="size-6" />
                </span>

                <h3 className="mt-2 text-base font-semibold text-foreground">
                  {search
                    ? "Tidak ada workflow yang cocok"
                    : "Workspace Anda siap digunakan"}
                </h3>

                <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                  {search
                    ? "Coba kata kunci nama atau deskripsi yang berbeda."
                    : "Buat workflow pertama Anda untuk mulai membangun otomasi."}
                </p>

                {!search && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowCreate(true)}
                    className="mt-4 text-primary hover:text-primary"
                  >
                    <Plus />
                    Buat workflow
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredWorkflows.map((item) => {
                  const isActive = item.status === "active";

                  return (
                    <article
                      key={item.id}
                      onClick={() => onOpenWorkflow(String(item.id))}
                      className="group flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-ring/50 hover:bg-muted/50 sm:gap-5 sm:p-5"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition group-hover:border-primary/50 group-hover:bg-primary/10 group-hover:text-primary">
                        <WorkflowIcon className="size-[18px]" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-foreground">
                          <button
                            type="button"
                            onClick={() => onOpenWorkflow(String(item.id))}
                            className="text-left hover:underline focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                          >
                            {item.name}
                          </button>
                        </h3>

                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {item.description || "Belum ada deskripsi."}
                        </p>

                        <p className="mt-2 text-xs text-muted-foreground">
                          {item.definition?.nodes?.length ?? 0} node
                          <span className="mx-1 text-border">·</span>
                          Diperbarui{" "}
                          {new Date(item.updated_at).toLocaleDateString("id-ID")}
                        </p>
                      </div>

                      <Badge
                        variant="outline"
                        className={`hidden h-6 shrink-0 px-2.5 sm:inline-flex ${
                          isActive
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                            : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                        }`}
                      >
                        {isActive ? (
                          <CheckCircle2 className="size-3" />
                        ) : (
                          <CircleDashed className="size-3" />
                        )}
                        {item.status}
                      </Badge>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon-lg"
                        aria-label={`Uji coba ${item.name}`}
                        title="Uji coba dengan Chat Widget"
                        onClick={(event) => {
                          event.stopPropagation();
                          onTestWorkflow(String(item.id));
                        }}
                        className="shrink-0 text-muted-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                      >
                        <MessageCircle />
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon-lg"
                        aria-label={`Edit ${item.name}`}
                        title="Edit workflow"
                        onClick={(event) => {
                          event.stopPropagation();
                          beginEdit(item);
                        }}
                        className="shrink-0 text-muted-foreground"
                      >
                        <Pencil />
                      </Button>

                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-lg"
                        aria-label={`Hapus ${item.name}`}
                        title="Hapus workflow"
                        onClick={(event) => {
                          event.stopPropagation();
                          setWorkflowToDelete(item);
                        }}
                        className="shrink-0"
                      >
                        <Trash2 />
                      </Button>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Create workflow dialog */}
        <Dialog
          open={showCreate}
          onOpenChange={(open) => {
            if (!creating) setShowCreate(open);
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Otomasi baru
              </p>
              <DialogTitle>Buat workflow</DialogTitle>
              <DialogDescription>
                Beri nama workflow dan tambahkan deskripsi singkat.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="create-name">Nama workflow</Label>
                <Input
                  id="create-name"
                  autoFocus
                  required
                  maxLength={255}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Contoh: Alur Dukungan Pelanggan"
                  className="h-10 dark:bg-input/30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-description">
                  Deskripsi{" "}
                  <span className="font-normal text-muted-foreground">
                    (opsional)
                  </span>
                </Label>
                <Textarea
                  id="create-description"
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Apa yang akan diotomatisasi workflow ini?"
                  className="dark:bg-input/30"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={creating}
                  onClick={() => setShowCreate(false)}
                  className="h-10 px-4"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={creating || !name.trim()}
                  className="h-10 px-4"
                >
                  {creating ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <ArrowRight />
                  )}
                  {creating ? "Membuat..." : "Buat workflow"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete workflow dialog */}
        <AlertDialog
          open={Boolean(workflowToDelete)}
          onOpenChange={(open) => {
            if (!open && !deleting) setWorkflowToDelete(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-destructive/10 text-destructive">
                <Trash2 />
              </AlertDialogMedia>
              <AlertDialogTitle>Hapus workflow?</AlertDialogTitle>
              <AlertDialogDescription>
                <span className="font-medium text-foreground">
                  {workflowToDelete?.name}
                </span>{" "}
                dan konfigurasi node yang disimpan akan dihapus secara permanen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting} className="h-10 px-4">
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={deleting}
                onClick={() => void handleDelete()}
                className="h-10 px-4"
              >
                {deleting && <LoaderCircle className="animate-spin" />}
                {deleting ? "Menghapus..." : "Hapus workflow"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
