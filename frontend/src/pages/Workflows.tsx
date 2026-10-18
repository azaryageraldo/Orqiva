
import { useEffect, useMemo, useRef, useState } from "react";
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

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 h-10 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-50 disabled:cursor-not-allowed";
const PRIMARY = "bg-sky-500 text-white hover:bg-sky-400";
const SECONDARY =
  "border border-input bg-background text-foreground hover:bg-muted";
const DANGER = "bg-red-500 text-white hover:bg-red-400";

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
  const [workflowToDelete, setWorkflowToDelete] = useState<WorkflowItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [workflowToEdit, setWorkflowToEdit] = useState<WorkflowItem | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<WorkflowItem["status"]>("draft");
  const editFormRef = useRef<HTMLFormElement>(null);

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
    void loadWorkflows();
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
      setError("Perubahan workflow gagal disimpan. Periksa koneksi API dan coba lagi.");
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
            <button
              type="button"
              onClick={() => setWorkflowToEdit(null)}
              className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-white"
            >
              <ArrowRight className="rotate-180" size={16} /> Kembali ke daftar workflow
            </button>
            <form
              ref={editFormRef}
              onSubmit={handleEditSubmit}
              className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm"
            >
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
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
                  <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-300">
                    {error}
                  </p>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Nama workflow
                    </label>
                    <input
                      required
                      maxLength={255}
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Deskripsi <span className="font-normal text-muted-foreground">(opsional)</span>
                    </label>
                    <textarea
                      rows={4}
                      value={editDescription}
                      onChange={(event) => setEditDescription(event.target.value)}
                      placeholder="Jelaskan fungsi workflow ini"
                      className="w-full resize-y rounded-lg border border-input bg-background px-3.5 py-3 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-ring focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(event) =>
                        setEditStatus(event.target.value as WorkflowItem["status"])
                      }
                      className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Draft belum aktif untuk otomasi. Active menandai workflow siap digunakan.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={savingEdit}
                    onClick={() => setWorkflowToEdit(null)}
                    className={`${BTN_BASE} ${SECONDARY}`}
                  >
                    Batal
                  </button>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="submit"
                      disabled={savingEdit || !editName.trim()}
                      className={`${BTN_BASE} ${SECONDARY}`}
                    >
                      {savingEdit ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      {savingEdit ? "Menyimpan..." : "Simpan perubahan"}
                    </button>
                    <button
                      type="button"
                      disabled={savingEdit || !editName.trim()}
                      onClick={() => {
                        if (editFormRef.current?.reportValidity()) void saveEdit(true);
                      }}
                      className={`${BTN_BASE} ${PRIMARY}`}
                    >
                      {savingEdit ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <Pencil size={16} />
                      )}
                      Buka kanvas
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* Page heading */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <WorkflowIcon size={15} />
                  Workspace
                </div>

                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Workflows
                </h1>

                <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                  Buat, susun, dan kelola otomatisasi alur kerja dalam satu tempat.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className={`${BTN_BASE} ${PRIMARY}`}
              >
                <Plus size={17} />
                Buat workflow baru
              </button>
            </div>

            {/* Controls: search + refresh */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex w-full items-center gap-3 rounded-lg border border-input bg-background px-3 py-2.5 transition focus-within:border-ring focus-within:ring-1 focus-within:ring-ring sm:max-w-md">
                  <Search size={17} className="shrink-0 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder="Cari workflow..."
                    aria-label="Cari workflow"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50 [&::-webkit-search-cancel-button]:hidden"
                  />
                  {search && (
                    <button
                      type="button"
                      aria-label="Hapus pencarian"
                      onClick={() => setSearch("")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X size={17} />
                    </button>
                  )}
                </label>

                <p className="text-xs text-muted-foreground">
                  Menampilkan{" "}
                  <span className="font-medium text-foreground">
                    {filteredWorkflows.length}
                  </span>{" "}
                  dari {workflows.length} workflow
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadWorkflows()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LoaderCircle
                  size={15}
                  className={loading ? "animate-spin" : "hidden"}
                />
                {!loading && <Activity size={15} />}
                {loading ? "Memuat..." : "Segarkan"}
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start justify-between gap-4 rounded-lg border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-300"
              >
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => setError("")}
                  aria-label="Abatalkan pesan error"
                  className="text-red-400/70 hover:text-red-300"
                >
                  <X size={17} />
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-border bg-background text-center">
                <LoaderCircle size={28} className="animate-spin text-sky-500" />
                <p className="mt-4 text-sm font-medium text-foreground">
                  Memuat workflows
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Mengambil data dari workspace Anda.
                </p>
              </div>
            ) : filteredWorkflows.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/50 p-8 text-center">
                <span className="flex size-14 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground mb-4">
                  <WorkflowIcon size={24} />
                </span>

                <h3 className="mt-2 text-base font-semibold text-foreground">
                  {search
                    ? "Tidak ada workflow yang cocok"
                    : "Workspace Anda siap digunakan"}
                </h3>

                <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                  {search
                    ? "Coba kata kunci nama atau deskripsi yang berbeda."
                    : "Buat workflow pertama Anda untuk mulai membangun otomatisasi."}
                </p>

                {!search && (
                  <button
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-sky-500 hover:bg-sky-500/10 transition"
                  >
                    <Plus size={16} />
                    Buat workflow
                  </button>
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
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-zinc-400 transition group-hover:border-sky-400/50 group-hover:bg-sky-400/10 group-hover:text-sky-400">
                        <WorkflowIcon size={18} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-foreground group-hover:text-white">
                          <button
                            type="button"
                            onClick={() => onOpenWorkflow(String(item.id))}
                            className="text-left hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            {item.name}
                          </button>
                        </h3>

                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {item.description || "Belum ada deskripsi."}
                        </p>

                        <p className="mt-2 text-xs text-muted-foreground">
                          {item.definition?.nodes?.length ?? 0} node
                          <span className="mx-1 text-zinc-700">·</span>
                          Diperbarui{" "}
                          {new Date(item.updated_at).toLocaleDateString("id-ID")}
                        </p>
                      </div>

                      <span
                        className={`hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium sm:inline-flex ${
                          isActive
                            ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300"
                            : "border-amber-400/20 bg-amber-400/[0.08] text-amber-300"
                        }`}
                      >
                        {isActive ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <CircleDashed size={12} />
                        )}
                        {item.status}
                      </span>

                      <button
                        type="button"
                        aria-label={`Uji coba ${item.name}`}
                        title="Uji coba dengan Chat Widget"
                        onClick={(event) => {
                          event.stopPropagation();
                          onTestWorkflow(String(item.id));
                        }}
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-zinc-400 transition hover:border-sky-400/50 hover:bg-sky-400/10 hover:text-sky-400"
                      >
                        <MessageCircle size={15} />
                      </button>

                      <button
                        type="button"
                        aria-label={`Edit ${item.name}`}
                        title="Edit workflow"
                        onClick={(event) => {
                          event.stopPropagation();
                          beginEdit(item);
                        }}
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-zinc-400 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        type="button"
                        aria-label={`Hapus ${item.name}`}
                        title="Hapus workflow"
                        onClick={(event) => {
                          event.stopPropagation();
                          setWorkflowToDelete(item);
                        }}
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-red-400/15 text-red-400/80 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-300"
                      >
                        <Trash2 size={15} />
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Create workflow modal */}
        {showCreate && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setShowCreate(false);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-title"
              className="my-auto w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Otomasi baru
                  </p>
                  <h2 id="create-title" className="mt-1 text-lg font-semibold text-foreground">
                    Buat workflow
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Beri nama workflow dan tambahkan deskripsi singkat.
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Tutup dialog"
                  disabled={creating}
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="mt-6 space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Nama workflow
                  </label>
                  <input
                    autoFocus
                    required
                    maxLength={255}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Contoh: Alur Dukungan Pelanggan"
                    className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-ring focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Deskripsi <span className="font-normal text-muted-foreground">(opsional)</span>
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Apa yang akan diotomatisasi workflow ini?"
                    className="w-full resize-y rounded-lg border border-input bg-background px-3.5 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-ring focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={creating}
                    onClick={() => setShowCreate(false)}
                    className={`${BTN_BASE} ${SECONDARY}`}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !name.trim()}
                    className={`${BTN_BASE} ${PRIMARY}`}
                  >
                    {creating && (
                      <LoaderCircle size={16} className="animate-spin" />
                    )}
                    {creating ? "Membuat..." : "Buat workflow"}
                    {!creating && <ArrowRight size={16} />}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {/* Delete workflow dialog */}
        {workflowToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
          >
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-title"
              className="my-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8"
            >
              <span className="flex size-10 items-center justify-center rounded-lg border border-red-400/20 bg-red-400/[0.08] text-red-400 mb-4">
                <Trash2 size={18} />
              </span>
              <h2 id="delete-title" className="text-lg font-semibold text-foreground">
                Hapus workflow?
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                <span className="font-medium text-foreground">
                  {workflowToDelete.name}
                </span>{" "}
                dan konfigurasi node yang disimpan akan dihapus secara permanen.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setWorkflowToDelete(null)}
                  className={`${BTN_BASE} ${SECONDARY}`}
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void handleDelete()}
                  className={`${BTN_BASE} ${DANGER}`}
                >
                  {deleting && <LoaderCircle size={16} className="animate-spin" />}
                  {deleting ? "Menghapus..." : "Hapus workflow"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </section>
  );
}
