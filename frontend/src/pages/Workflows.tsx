
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Activity,
  ArrowRight,
  Boxes,
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
    } catch (err) {
      console.error("Failed to load workflows:", err);
      setError(
        "Workflow gagal dimuat. Periksa koneksi dan autentikasi API.",
      );
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

  const activeCount = workflows.filter(
    (item) => item.status === "active",
  ).length;

  const draftCount = workflows.filter(
    (item) => item.status === "draft",
  ).length;

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || creating) return;

    setCreating(true);
    setError("");

    try {
      const created = await createWorkflow(
        name.trim(),
        description.trim(),
      );

      setWorkflows((current) => [created, ...current]);
      setShowCreate(false);
      setName("");
      setDescription("");
    } catch (err) {
      console.error("Failed to create workflow:", err);
      setError(
        "Workflow gagal dibuat. Periksa koneksi backend dan validasi API.",
      );
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
    } catch (err) {
      console.error("Failed to delete workflow:", err);
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
      setWorkflows((current) => current.map((item) => item.id === updated.id ? updated : item));
      setWorkflowToEdit(updated);
      if (openCanvas) onOpenWorkflow(String(updated.id));
    } catch (err) {
      console.error("Failed to update workflow details:", err);
      setError("Perubahan workflow gagal disimpan. Periksa koneksi API dan coba lagi.");
    } finally {
      setSavingEdit(false);
    }
  }

  function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveEdit(false);
  }

  const buttonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-[#09090b] px-4 py-6 text-zinc-100 sm:px-6 lg:px-8">
      <div className="w-full space-y-8">
        {workflowToEdit ? (
          <div className="mx-auto max-w-3xl">
            <button type="button" onClick={() => setWorkflowToEdit(null)} className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white">
              <ArrowRight className="rotate-180" size={16} /> Back to workflows
            </button>
            <form ref={editFormRef} onSubmit={handleEditSubmit} className="overflow-hidden rounded-2xl border border-white/10 bg-[#111318]">
              <div className="border-b border-white/[0.08] px-6 py-5 sm:px-8">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">Workflow settings</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Edit workflow</h1>
                <p className="mt-1 text-sm text-zinc-400">Perbarui detail dasar sebelum membuka kanvas workflow.</p>
              </div>
              {error && <p role="alert" className="mx-6 mt-5 rounded-lg border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-300 sm:mx-8">{error}</p>}
              <div className="space-y-5 px-6 py-6 sm:px-8">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-zinc-200">Nama workflow</span>
                  <input required maxLength={255} value={editName} onChange={(event) => setEditName(event.target.value)} className="h-11 w-full rounded-lg border border-white/10 bg-[#090a0d] px-3.5 text-sm text-white outline-none transition focus:border-sky-400/50" />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-zinc-200">Deskripsi <span className="font-normal text-zinc-500">(opsional)</span></span>
                  <textarea rows={4} value={editDescription} onChange={(event) => setEditDescription(event.target.value)} placeholder="Jelaskan fungsi workflow ini" className="w-full resize-y rounded-lg border border-white/10 bg-[#090a0d] px-3.5 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-sky-400/50" />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-zinc-200">Status</span>
                  <select value={editStatus} onChange={(event) => setEditStatus(event.target.value as WorkflowItem["status"])} className="h-11 w-full rounded-lg border border-white/10 bg-[#090a0d] px-3.5 text-sm text-white outline-none focus:border-sky-400/50">
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                  </select>
                  <span className="block text-xs leading-5 text-zinc-500">Draft belum aktif untuk otomasi. Active menandai workflow siap digunakan.</span>
                </label>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-white/[0.08] px-6 py-4 sm:flex-row sm:justify-between sm:px-8">
                <button type="button" onClick={() => setWorkflowToEdit(null)} disabled={savingEdit} className={`${buttonClass} border border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07]`}>Cancel</button>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button type="submit" disabled={savingEdit || !editName.trim()} className={`${buttonClass} border border-white/10 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08]`}>
                  {savingEdit ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {savingEdit ? "Saving..." : "Save changes"}
                </button>
                <button type="button" disabled={savingEdit || !editName.trim()} onClick={() => { if (editFormRef.current?.reportValidity()) void saveEdit(true); }} className={`${buttonClass} bg-sky-500 text-white hover:bg-sky-400`}>
                  {savingEdit ? <LoaderCircle size={16} className="animate-spin" /> : <Pencil size={16} />}
                  Open workflow canvas
                  {!savingEdit && <ArrowRight size={16} />}
                </button>
                </div>
              </div>
            </form>
          </div>
        ) : <>
        {/* Page heading */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
              <span className="size-1.5 rounded-full bg-sky-400" />
              Automation workspace
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Workflows
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
              Build, organize, and manage your automated workflows in one
              place.
            </p>
          </div>

                      <button
            type="button"
            onClick={() => setShowCreate(true)}
            className={`${buttonClass} bg-sky-500 text-white shadow-lg shadow-sky-950/30 hover:bg-sky-400`}
          >
            <Plus size={17} />
            New workflow
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">Total workflows</p>
              <span className="flex size-10 items-center justify-center rounded-xl bg-sky-400/10 text-sky-400">
                <Boxes size={19} />
              </span>
            </div>

            <p className="mt-5 text-3xl font-semibold tracking-tight text-white">
              {workflows.length}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Workflows in your workspace
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">Active workflows</p>
              <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                <Activity size={19} />
              </span>
            </div>

            <p className="mt-5 text-3xl font-semibold tracking-tight text-white">
              {activeCount}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Ready for automation
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-5 sm:col-span-2 xl:col-span-1">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">Drafts</p>
              <span className="flex size-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                <CircleDashed size={19} />
              </span>
            </div>

            <p className="mt-5 text-3xl font-semibold tracking-tight text-white">
              {draftCount}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Still being configured
            </p>
          </div>
        </div>

        {/* Workflow list */}
        <div className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Your workflows
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Manage your saved automations.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadWorkflows()}
              disabled={loading}
              className={`${buttonClass} border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]`}
            >
              <LoaderCircle
                size={15}
                className={loading ? "animate-spin" : "hidden"}
              />
              {!loading && <Activity size={15} />}
              Refresh
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex h-11 w-full items-center gap-3 rounded-xl border border-white/10 bg-[#111114] px-3.5 transition focus-within:border-sky-400/50 sm:max-w-md">
              <Search size={17} className="shrink-0 text-zinc-500" />

              <input
                type="search"
                placeholder="Search workflows..."
                aria-label="Search workflows"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
              />

              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                  className="text-zinc-500 hover:text-white"
                >
                  <X size={15} />
                </button>
              )}
            </label>

            <p className="text-xs text-zinc-500">
              Showing{" "}
              <span className="font-medium text-zinc-300">
                {filteredWorkflows.length}
              </span>{" "}
              of {workflows.length} workflows
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start justify-between gap-4 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-300"
            >
              <p>{error}</p>

              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-[#111114] text-center">
              <LoaderCircle
                size={27}
                className="animate-spin text-sky-400"
              />

              <p className="mt-4 text-sm font-medium text-zinc-200">
                Loading workflows
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Fetching data from your workspace.
              </p>
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#111114]/70 px-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-400">
                <Boxes size={23} />
              </span>

              <h3 className="mt-4 text-base font-semibold text-white">
                {search
                  ? "No matching workflows"
                  : "Your workspace is ready"}
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                {search
                  ? "Try a different name or description."
                  : "Create your first workflow to start building an automation."}
              </p>

              {!search && (
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className={`${buttonClass} mt-5 bg-sky-500 text-white hover:bg-sky-400`}
                >
                  <Plus size={16} />
                  Create workflow
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWorkflows.map((item) => {
                const isActive = item.status === "active";

                return (
                  <article
                    key={item.id}
                    onClick={() => onOpenWorkflow(String(item.id))}
                    className="group flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#111114] p-4 transition hover:border-sky-400/25 hover:bg-[#15171c] sm:gap-4 sm:p-5"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-zinc-300 transition group-hover:border-sky-400/20 group-hover:bg-sky-400/10 group-hover:text-sky-300">
                      <WorkflowIcon size={20} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-zinc-100">
                        <button
                          type="button"
                          onClick={() => onOpenWorkflow(String(item.id))}
                          className="text-left hover:text-white focus-visible:outline-none focus-visible:underline"
                        >
                        {item.name}
                        </button>
                      </h3>

                      <p className="mt-1 truncate text-sm text-zinc-500">
                        {item.description || "No description added."}
                      </p>

                      <p className="mt-2 text-xs text-zinc-600">
                        {item.definition?.nodes?.length ?? 0} nodes
                        <span className="mx-2 text-zinc-700">·</span>
                        Updated{" "}
                        {new Date(item.updated_at).toLocaleDateString(
                          "id-ID",
                        )}
                      </p>
                    </div>

                    <span
                      className={`hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium sm:inline-flex ${
                        isActive
                          ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300"
                          : "border-amber-400/20 bg-amber-400/[0.07] text-amber-300"
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
                      aria-label={`Test chat widget for ${item.name}`}
                      title="Test with Chat Widget"
                      onClick={(event) => {
                        event.stopPropagation();
                        onTestWorkflow(String(item.id));
                      }}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                      }}
                      className={`${buttonClass} shrink-0 border border-sky-400/20 bg-sky-400/[0.07] px-3 text-sky-300 hover:border-sky-400/40 hover:bg-sky-400/15`}
                    >
                      <MessageCircle size={16} />
                      <span className="hidden lg:inline">Test Chat</span>
                    </button>

                    <button
                      type="button"
                      aria-label={`Edit ${item.name}`}
                      title="Edit workflow"
                      onClick={(event) => {
                        event.stopPropagation();
                        beginEdit(item);
                      }}
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      type="button"
                      aria-label={`Delete ${item.name}`}
                      title="Delete workflow"
                      onClick={(event) => {
                        event.stopPropagation();
                        setWorkflowToDelete(item);
                      }}
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-red-400/15 text-red-300/80 transition hover:border-red-400/35 hover:bg-red-400/10 hover:text-red-200"
                    >
                      <Trash2 size={15} />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>
        </>}
      </div>

      {/* Create workflow modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !creating) {
              setShowCreate(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-title"
            className="my-auto w-full max-w-lg rounded-2xl border border-white/10 bg-[#111114] p-5 shadow-2xl shadow-black/50 sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">
                  New automation
                </p>

                <h2
                  id="create-title"
                  className="mt-2 text-xl font-semibold text-white"
                >
                  Create workflow
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Give your workflow a name and description.
                </p>
              </div>

              <button
                type="button"
                aria-label="Close dialog"
                disabled={creating}
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-6 space-y-5">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-zinc-200">
                  Workflow name
                </span>

                <input
                  autoFocus
                  required
                  maxLength={255}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Customer Support Flow"
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#09090b] px-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/10"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-zinc-200">
                  Description{" "}
                  <span className="font-normal text-zinc-500">
                    (optional)
                  </span>
                </span>

                <textarea
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What should this workflow automate?"
                  className="w-full resize-y rounded-xl border border-white/10 bg-[#09090b] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/10"
                />
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-white/[0.08] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => setShowCreate(false)}
                  className={`${buttonClass} border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating || !name.trim()}
                  className={`${buttonClass} bg-sky-500 text-white hover:bg-sky-400`}
                >
                  {creating && (
                    <LoaderCircle
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {creating ? "Creating..." : "Create workflow"}

                  {!creating && <ArrowRight size={16} />}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {workflowToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-workflow-title"
            className="my-auto w-full max-w-md rounded-2xl border border-white/10 bg-[#111114] p-5 shadow-2xl shadow-black/50 sm:p-6"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-red-400/10 text-red-300">
              <Trash2 size={18} />
            </span>
            <h2 id="delete-workflow-title" className="mt-4 text-lg font-semibold text-white">
              Delete workflow?
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              <span className="font-medium text-zinc-200">{workflowToDelete.name}</span> and its saved node configuration will be permanently removed.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setWorkflowToDelete(null)}
                className={`${buttonClass} border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDelete()}
                className={`${buttonClass} bg-red-500 text-white hover:bg-red-400`}
              >
                {deleting && <LoaderCircle size={15} className="animate-spin" />}
                {deleting ? "Deleting..." : "Delete workflow"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
