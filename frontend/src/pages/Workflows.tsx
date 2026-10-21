import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  LoaderCircle,
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
import { getErrorMessage } from "../services/api";
import { useI18n } from "@/lib/i18n";

interface WorkflowsProps {
  onOpenWorkflow: (workflowId: string) => void;
}

const SELECT_CLASS =
  "h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

export default function Workflows({ onOpenWorkflow }: WorkflowsProps) {
  const { language, t } = useI18n();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
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
  const requestRef = useRef(0);

  const loadWorkflows = useCallback(
    async (targetPage = 1, query = "") => {
      const requestId = ++requestRef.current;

      setLoading(true);
      setError("");

      try {
        const result = await getWorkflows({ page: targetPage, search: query });

        if (requestId !== requestRef.current) return;

        setWorkflows(result.data);
        setPage(result.current_page);
        setLastPage(result.last_page);
        setTotal(result.total);
      } catch (caught) {
        if (requestId !== requestRef.current) return;

        setError(getErrorMessage(caught, t("wf.errorLoad")));
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(search), 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    const requestId = ++requestRef.current;

    getWorkflows({ page: 1, search: searchQuery })
      .then((result) => {
        if (!active || requestId !== requestRef.current) return;

        setWorkflows(result.data);
        setPage(result.current_page);
        setLastPage(result.last_page);
        setTotal(result.total);
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
    } catch (caught) {
      setError(getErrorMessage(caught, t("wf.errorSave")));
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
              {t("wf.back")}
            </Button>
            <form
              onSubmit={handleEditSubmit}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
            >
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    {t("wf.editEyebrow")}
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                    {t("wf.editHeading")}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("wf.editDescription")}
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
                    <Label htmlFor="edit-name">{t("wf.nameLabel")}</Label>
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
                      {t("wf.descriptionLabel")}{" "}
                      <span className="font-normal text-muted-foreground">
                        {t("wf.optional")}
                      </span>
                    </Label>
                    <Textarea
                      id="edit-description"
                      rows={4}
                      value={editDescription}
                      onChange={(event) => setEditDescription(event.target.value)}
                      placeholder={t("wf.descriptionPlaceholder")}
                      className="dark:bg-input/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-status">{t("wf.statusLabel")}</Label>
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
                      <option value="draft">{t("wf.status.draft")}</option>
                      <option value="active">{t("wf.status.active")}</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      {t("wf.statusHint")}
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
                    {t("common.cancel")}
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
                    {savingEdit ? t("wf.saving") : t("wf.saveChanges")}
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
                    {t("wf.openCanvas")}
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
                  {t("wf.eyebrow")}
                </div>

                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Workflows
                </h1>

                <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                  {t("wf.subtitle")}
                </p>
              </div>

              <Button
                type="button"
                onClick={() => setShowCreate(true)}
                className="h-10 px-4"
              >
                <Plus />
                {t("wf.create")}
              </Button>
            </div>

            {/* Controls: search + refresh */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:max-w-md">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={t("wf.searchPlaceholder")}
                    aria-label={t("wf.searchAria")}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-10 pr-9 pl-9 dark:bg-input/30 [&::-webkit-search-cancel-button]:hidden"
                  />
                  {search && (
                    <button
                      type="button"
                      aria-label={t("wf.clearSearch")}
                      onClick={() => setSearch("")}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {t("wf.showing", {
                    shown: workflows.length,
                    total,
                  })}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => void loadWorkflows(page, searchQuery)}
                disabled={loading}
                className="h-10 px-4"
              >
                {loading ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Activity />
                )}
                {loading ? t("wf.loading") : t("wf.refresh")}
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
                  aria-label={t("wf.dismissError")}
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
                  {t("wf.loadingTitle")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("wf.loadingDescription")}
                </p>
              </div>
            ) : workflows.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/50 p-8 text-center">
                <span className="mb-4 flex size-14 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground">
                  <WorkflowIcon className="size-6" />
                </span>

                <h3 className="mt-2 text-base font-semibold text-foreground">
                  {search
                    ? t("wf.noMatch")
                    : t("wf.workspaceReady")}
                </h3>

                <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                  {search
                    ? t("wf.noMatchDescription")
                    : t("wf.workspaceReadyDescription")}
                </p>

                {!search && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowCreate(true)}
                    className="mt-4 text-primary hover:text-primary"
                  >
                    <Plus />
                    {t("wf.createShort")}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {workflows.map((item) => {
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
                          {item.description || t("wf.noDescription")}
                        </p>

                        <p className="mt-2 text-xs text-muted-foreground">
                          {t("wf.nodeCount", {
                            count: item.definition?.nodes?.length ?? 0,
                          })}
                          <span className="mx-1 text-border">·</span>
                          {t("wf.updated", {
                            date: new Date(item.updated_at).toLocaleDateString(
                              language === "en" ? "en-US" : "id-ID",
                            ),
                          })}
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
                        {t(`wf.status.${item.status}`)}
                      </Badge>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon-lg"
                        aria-label={t("wf.editAria", { name: item.name })}
                        title={t("wf.editTitle")}
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
                        aria-label={t("wf.deleteAria", { name: item.name })}
                        title={t("wf.deleteTitle")}
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

            {lastPage > 1 && (
              <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row">
                <p className="text-xs text-muted-foreground">
                  {t("wf.pageOf", { page, last: lastPage })}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 px-3"
                    onClick={() => void loadWorkflows(page - 1, searchQuery)}
                    disabled={loading || page <= 1}
                  >
                    {t("wf.previous")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 px-3"
                    onClick={() => void loadWorkflows(page + 1, searchQuery)}
                    disabled={loading || page >= lastPage}
                  >
                    {t("wf.next")}
                  </Button>
                </div>
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
                {t("wf.newAutomation")}
              </p>
              <DialogTitle>{t("wf.createTitle")}</DialogTitle>
              <DialogDescription>
                {t("wf.createDescription")}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="create-name">{t("wf.nameLabel")}</Label>
                <Input
                  id="create-name"
                  autoFocus
                  required
                  maxLength={255}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t("wf.createPlaceholder")}
                  className="h-10 dark:bg-input/30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-description">
                  {t("wf.descriptionLabel")}{" "}
                  <span className="font-normal text-muted-foreground">
                    {t("wf.optional")}
                  </span>
                </Label>
                <Textarea
                  id="create-description"
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={t("wf.createDescriptionPlaceholder")}
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
                  {t("common.cancel")}
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
                  {creating ? t("wf.creating") : t("wf.createTitle")}
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
              <AlertDialogTitle>{t("wf.deleteQuestion")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("wf.deleteDescription", {
                  name: workflowToDelete?.name ?? "",
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting} className="h-10 px-4">
                {t("common.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={deleting}
                onClick={() => void handleDelete()}
                className="h-10 px-4"
              >
                {deleting && <LoaderCircle className="animate-spin" />}
                {deleting ? t("wf.deleting") : t("wf.deleteAction")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
