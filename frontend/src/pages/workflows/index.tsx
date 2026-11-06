import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  createWorkflow,
  deleteWorkflow,
  getWorkflows,
  updateWorkflow,
} from "@/services/workflow";
import { getErrorMessage } from "@/services/api";
import type { Workflow as WorkflowItem } from "@/types/workflow";

import WorkflowToolbar from "./components/WorkflowToolbar";
import WorkflowTable from "./components/WorkflowTable";
import WorkflowPagination from "./components/WorkflowPagination";
import WorkflowCreateDialog from "./components/WorkflowCreateDialog";
import WorkflowEditDialog from "./components/WorkflowEditDialog";
import WorkflowDeleteDialog from "./components/WorkflowDeleteDialog";
import WorkflowDeleteSelectedDialog from "./components/WorkflowDeleteSelectedDialog";

const PER_PAGE = 10;

interface WorkflowsProps {
  onOpenWorkflow: (workflowId: string) => void;
  currentUserName?: string;
}

export default function Workflows({
  onOpenWorkflow,
  currentUserName = "",
}: WorkflowsProps) {
  const { language, t } = useI18n();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<WorkflowItem | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [workflowToDeleteSelected, setWorkflowToDeleteSelected] = useState<
    Set<number>
  >(new Set());
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [workflowToEdit, setWorkflowToEdit] = useState<WorkflowItem | null>(
    null,
  );
  const [savingEdit, setSavingEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const requestRef = useRef(0);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "en" ? "en-US" : "id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [language],
  );

  const ownerName = currentUserName || t("header.workspaceAdmin");

  function formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
  }

  const loadWorkflows = useCallback(
    async (targetPage = 1, query = "") => {
      const requestId = ++requestRef.current;

      setLoading(true);
      setError("");

      try {
        const result = await getWorkflows({
          page: targetPage,
          search: query,
        });

        if (requestId !== requestRef.current) return;

        setWorkflows(result.data);
        setPage(result.current_page);
        setLastPage(result.last_page);
        setTotal(result.total);
        setSelectedIds(new Set());
      } catch (caught) {
        if (requestId !== requestRef.current) return;

        setError(getErrorMessage(caught, t("wf.errorLoad")));
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    },
    [t],
  );

  // Debounced search: only update query after user stops typing.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(search), 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  // Fetch when searchQuery or page changes.
  useEffect(() => {
    let active = true;
    const requestId = ++requestRef.current;

    const loadingTimer = window.setTimeout(() => {
      setLoading(true);
    }, 0);

    getWorkflows({ page: 1, search: searchQuery })
      .then((result) => {
        if (!active || requestId !== requestRef.current) return;

        setWorkflows(result.data);
        setPage(result.current_page);
        setLastPage(result.last_page);
        setTotal(result.total);
        setSelectedIds(new Set());
        setError("");
      })
      .catch((caught: unknown) => {
        if (!active || requestId !== requestRef.current) return;

        setError(getErrorMessage(caught, t("wf.errorLoad")));
      })
      .finally(() => {
        if (active && requestId === requestRef.current) setLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(loadingTimer);
    };
  }, [searchQuery, t]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || creating) return;

    setCreating(true);
    setError("");

    try {
      await createWorkflow(name.trim(), description.trim());

      setShowCreate(false);
      setName("");
      setDescription("");
      setSearch("");
      setSearchQuery("");
      await loadWorkflows(1, "");
    } catch (caught) {
      setError(getErrorMessage(caught, t("wf.errorCreate")));
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

      const remaining = workflows.length - 1;
      const targetPage = remaining <= 0 && page > 1 ? page - 1 : page;

      setWorkflowToDelete(null);
      await loadWorkflows(targetPage, searchQuery);
    } catch (caught) {
      setError(getErrorMessage(caught, t("wf.errorDelete")));
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteSelected() {
    if (workflowToDeleteSelected.size === 0 || deletingSelected) return;

    setDeletingSelected(true);
    setError("");

    try {
      await Promise.all(
        Array.from(workflowToDeleteSelected).map((id) =>
          deleteWorkflow(String(id)),
        ),
      );

      setWorkflowToDeleteSelected(new Set());
      setSelectedIds(new Set());
      await loadWorkflows(1, searchQuery);
    } catch (caught) {
      setError(getErrorMessage(caught, t("wf.errorDelete")));
    } finally {
      setDeletingSelected(false);
    }
  }

  async function toggleStatus(item: WorkflowItem) {
    if (statusUpdatingId !== null) return;

    const nextStatus: WorkflowItem["status"] =
      item.status === "active" ? "draft" : "active";

    setStatusUpdatingId(item.id);
    setError("");

    try {
      const updated = await updateWorkflow(String(item.id), {
        status: nextStatus,
      });

      setWorkflows((current) =>
        current.map((workflow) =>
          workflow.id === item.id
            ? {
                ...workflow,
                status: updated.status,
                updated_at: updated.updated_at,
              }
            : workflow,
        ),
      );
    } catch (caught) {
      setError(getErrorMessage(caught, t("wf.errorSave")));
    } finally {
      setStatusUpdatingId(null);
    }
  }

  function beginEdit(workflow: WorkflowItem) {
    setWorkflowToEdit(workflow);
    setEditName(workflow.name);
    setEditDescription(workflow.description ?? "");
    setError("");
  }

  async function saveEdit() {
    if (!workflowToEdit || !editName.trim() || savingEdit) return;

    setSavingEdit(true);
    setError("");
    setSuccess("");
    try {
      const updated = await updateWorkflow(String(workflowToEdit.id), {
        name: editName.trim(),
        description: editDescription.trim() || null,
      });
      setWorkflows((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSuccess(t("wf.saveSuccess"));
      setWorkflowToEdit(null);
      await loadWorkflows(1, searchQuery);
    } catch (caught) {
      setError(getErrorMessage(caught, t("wf.errorSave")));
    } finally {
      setSavingEdit(false);
    }
  }

  function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveEdit();
  }

  const allSelected =
    workflows.length > 0 &&
    workflows.every((item) => selectedIds.has(item.id));

  function toggleAll() {
    setSelectedIds(
      allSelected ? new Set() : new Set(workflows.map((item) => item.id)),
    );
  }

  function toggleSelected(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const to = workflows.length === 0 ? 0 : Math.min(total, from + workflows.length - 1);

  const isSelectedMap = useMemo(
    () =>
      workflows.reduce<Record<number, boolean>>(
        (acc, item) => ({ ...acc, [item.id]: selectedIds.has(item.id) }),
        {},
      ),
    [workflows, selectedIds],
  );

  return (
    <section className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <h1 className="sr-only">{t("nav.workflows")}</h1>

        {workflowToEdit ? (
          <WorkflowEditDialog
            open={Boolean(workflowToEdit)}
            onOpenChange={() => {
              if (!savingEdit) setWorkflowToEdit(null);
            }}
            name={editName}
            description={editDescription}
            saving={savingEdit}
            error={error}
            onNameChange={setEditName}
            onDescriptionChange={setEditDescription}
            onSaveClose={handleEditSubmit}
            onCancel={() => setWorkflowToEdit(null)}
            t={t}
          />
        ) : null}

        {!workflowToEdit && (
          <>
            <WorkflowToolbar
              search={search}
              onSearchChange={setSearch}
              onClearSearch={() => setSearch("")}
              onCreate={() => setShowCreate(true)}
              onDeleteSelected={handleDeleteSelected}
              selectedCount={selectedIds.size}
              t={t}
              className="mb-6"
              deletingSelected={deletingSelected}
            />

            {error && (
              <div
                role="alert"
                className="flex items-start justify-between gap-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-[12.5px] text-destructive mb-4"
              >
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => setError("")}
                  aria-label={t("wf.dismissError")}
                  className="text-destructive/70 transition hover:text-destructive"
                >
                  <XIcon />
                </button>
              </div>
            )}

            {success && (
              <div
                role="status"
                className="flex items-start justify-between gap-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2.5 text-[12.5px] text-primary mb-4"
              >
                <p>{success}</p>
                <button
                  type="button"
                  onClick={() => setSuccess("")}
                  aria-label="Dismiss success message"
                  className="text-primary/70 transition hover:text-primary"
                >
                  <XIcon />
                </button>
              </div>
            )}

            <WorkflowTable
              workflows={workflows}
              loading={loading}
              page={page}
              perPage={PER_PAGE}
              isSelected={isSelectedMap}
              isUpdating={statusUpdatingId}
              ownerName={ownerName}
              formatDate={formatDate}
              t={t}
              onSelectAll={toggleAll}
              onSelectOne={toggleSelected}
              onOpen={(id) => onOpenWorkflow(id)}
              onEdit={beginEdit}
              onDelete={setWorkflowToDelete}
              onToggleStatus={toggleStatus}
              allSelected={allSelected}
            />

            <WorkflowPagination
              page={page}
              lastPage={lastPage}
              from={from}
              to={to}
              total={total}
              loading={loading}
              t={t}
              onPrevious={() => void loadWorkflows(page - 1, searchQuery)}
              onNext={() => void loadWorkflows(page + 1, searchQuery)}
            />
          </>
        )}

        <WorkflowCreateDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          name={name}
          description={description}
          creating={creating}
          error={error}
          onNameChange={setName}
          onDescriptionChange={setDescription}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
          t={t}
        />

        <WorkflowDeleteDialog
          open={Boolean(workflowToDelete)}
          onOpenChange={(open) => {
            if (!open && !deleting) setWorkflowToDelete(null);
          }}
          workflowName={workflowToDelete?.name ?? ""}
          deleting={deleting}
          onConfirm={() => void handleDelete()}
          t={t}
        />

        <WorkflowDeleteSelectedDialog
          open={workflowToDeleteSelected.size > 0}
          onOpenChange={(open) => {
            if (!open && !deletingSelected) setWorkflowToDeleteSelected(new Set());
          }}
          count={workflowToDeleteSelected.size}
          deleting={deletingSelected}
          onConfirm={() => void handleDeleteSelected()}
          t={t}
        />

        {!workflowToEdit && workflows.length === 0 && !search && (
          <div className="mt-6 flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreate(true)}
              className="h-9 rounded-md border-white/[0.1] bg-transparent px-3 text-[12.5px] font-medium text-zinc-300 hover:bg-white/[0.04] hover:text-zinc-100"
            >
              <Plus />
              {t("wf.createShort")}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function XIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6l6 12" />
      <path d="M6 6l12 12" />
    </svg>
  );
}
