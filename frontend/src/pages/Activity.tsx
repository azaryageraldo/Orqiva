import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity as ActivityIcon,
  ChevronRight,
  Search,
  X,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Table, TableContainer, TableWrapper, Tbody, Td, Th, Thead, Tr } from "@/components/table";
import { formatLocale, useI18n } from "@/lib/i18n";
import { getActivity } from "../services/stats";
import { getErrorMessage } from "../services/api";

interface ActivityProps {
  onOpenExecution: (executionId: number, workflowId: string) => void;
}

interface ActivityExecution {
  id: number;
  session_id: number | null;
  contact_id: string | null;
  contact_name: string | null;
  workflow_id: number;
  workflow_name: string | null;
  status: string;
  started_at: string | null;
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function Activity({
  onOpenExecution,
}: ActivityProps) {
  const { language, t } = useI18n();
  const locale = formatLocale(language);
  const [workflows, setWorkflows] = useState<ActivityExecution[]>([]);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const requestRef = useRef(0);

  const loadPage = useCallback(async (targetPage = 1) => {
    const requestId = ++requestRef.current;

    setLoading(true);
    setError("");

    try {
      const result = await getActivity(20, {}, targetPage);

      if (requestId !== requestRef.current) return;

      setWorkflows(result.executions);
      setPage(result.meta.page);
      setLastPage(Math.ceil(result.summary.total / 20));
      setTotal(result.summary.total);
    } catch (caught) {
      setError(getErrorMessage(caught, t("activity.loadError")));
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(search), 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    const requestId = ++requestRef.current;

    getActivity(20, {}, 1)
      .then((result) => {
        if (!active || requestId !== requestRef.current) return;

        setWorkflows(result.executions);
        setPage(result.meta.page);
        setLastPage(Math.ceil(result.summary.total / 20));
        setTotal(result.summary.total);
        setError("");
      })
      .catch((caught: unknown) => {
        if (!active || requestId !== requestRef.current) return;

        setError(getErrorMessage(caught, t("activity.loadError")));
      })
      .finally(() => {
        if (active && requestId === requestRef.current) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [searchQuery, t]);

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

  function formatStatus(status: string): string {
    const labels: Record<string, string> = {
      success: t("activity.success"),
      failed: t("activity.failed"),
      waiting: t("activity.waiting"),
      running: t("activity.running"),
      escalated: t("activity.escalated"),
    };

    return labels[status] || status;
  }

  const from = total === 0 ? 0 : (page - 1) * 20 + 1;
  const to = workflows.length === 0 ? 0 : Math.min(total, from + workflows.length - 1);

  return (
    <section className="min-h-[calc(100vh-4rem)] px-4 py-5 sm:px-6">
      <div className="w-full">
        <h1 className="sr-only">{t("activity.title")}</h1>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full lg:max-w-[320px]">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-600"
                strokeWidth={1.5}
                size={14}
                width={14}
                height={14}
                fill="none"
                stroke="currentColor"
              />
              <Input
                type="search"
                placeholder={t("activity.detail.searchPlaceholder")}
                aria-label={t("activity.detail.searchAria")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 rounded-md border-white/[0.1] bg-[#0d0e11] pr-8 pl-8 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 dark:bg-[#0d0e11] [&::-webkit-search-cancel-button]:hidden"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Hapus pencarian"
                  onClick={() => setSearch("")}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-zinc-500 transition hover:text-zinc-200"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-zinc-500">
                {t("activity.detail.range", { from, to, total })}
              </span>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start justify-between gap-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-[12.5px] text-destructive"
            >
              <p>{error}</p>
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Batalkan pesan error"
                className="text-destructive/70 transition hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          <TableContainer>
            <TableWrapper>
              <Table>
                <Thead>
                  <Tr className="border-b border-white/[0.07] bg-white/[0.02]">
                    <Th className="w-10 text-right last:border-r-0">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => toggleAll()}
                        aria-label={t("activity.col.no")}
                        className="size-3.5 cursor-pointer rounded-[3px] border-white/20 bg-transparent accent-[var(--primary)]"
                      />
                    </Th>
                    <Th className="w-10 text-center">{t("activity.col.no")}</Th>
                    <Th className="min-w-[140px] text-center">{t("activity.col.sessionId")}</Th>
                    <Th className="min-w-[140px] text-center">{t("activity.col.contactId")}</Th>
                    <Th className="min-w-[160px] text-center">{t("activity.col.contactName")}</Th>
                    <Th className="min-w-[140px] text-center">{t("activity.col.sessionCreated")}</Th>
                    <Th className="w-32 text-center">{t("activity.col.logStatus")}</Th>
                    <Th className="min-w-[160px] text-center">{t("activity.col.workflow")}</Th>
                    <Th className="w-28 text-center">{t("activity.col.actions")}</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, index) => (
                      <Tr key={`skeleton-${index}`} className="border-t border-white/[0.06]">
                        <Td colSpan={9} className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <div className="size-3.5 animate-pulse rounded-[3px] bg-white/[0.06]" />
                            <div className="size-7 animate-pulse rounded-md bg-white/[0.06]" />
                            <div className="h-3 w-40 animate-pulse rounded bg-white/[0.06]" />
                            <div className="ml-auto h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
                          </div>
                        </Td>
                      </Tr>
                    ))
                  ) : workflows.length === 0 ? (
                    <Tr>
                      <Td colSpan={9}>
                        <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
                          <span className="mb-3 flex size-10 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] text-zinc-500">
                            <ActivityIcon className="size-5" />
                          </span>
                          <h2 className="text-sm font-medium text-zinc-200">
                            {search ? t("activity.noMatch") : t("activity.empty")}
                          </h2>
                          <p className="mt-1 max-w-sm text-[12.5px] text-zinc-500">
                            {search ? t("activity.noMatchHint") : t("activity.emptyHint")}
                          </p>
                        </div>
                      </Td>
                    </Tr>
                  ) : (
                    workflows.map((execution, index) => {
                      const rowNumber = (page - 1) * 20 + index + 1;

                      return (
                        <Tr
                          key={execution.id}
                          className="group cursor-pointer border-t border-white/[0.06] transition-colors hover:bg-white/[0.025]"
                          onClick={() => onOpenExecution(execution.id, String(execution.workflow_id))}
                        >
                          <Td className="w-10 text-right">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(execution.id)}
                              onClick={(event) => event.stopPropagation()}
                              onChange={() => toggleSelected(execution.id)}
                              className="size-3.5 cursor-pointer rounded-[3px] border-white/20 bg-transparent accent-[var(--primary)]"
                            />
                          </Td>
                          <Td className="w-10 text-center font-mono text-xs text-zinc-400">
                            {rowNumber}
                          </Td>
                          <Td className="min-w-[140px] text-center font-mono text-xs text-muted-foreground">
                            {execution.session_id ?? `#${execution.id}`}
                          </Td>
                          <Td className="min-w-[140px] text-center font-mono text-xs text-muted-foreground">
                            {execution.contact_id ?? "—"}
                          </Td>
                          <Td className="min-w-[160px] text-center text-center">
                            {execution.contact_name ?? t("activity.contactMissing")}
                          </Td>
                          <Td className="min-w-[140px] text-center font-mono text-xs text-muted-foreground">
                            {formatDate(execution.started_at, locale)}
                          </Td>
                          <Td className="w-32 text-center">
                            <span className="text-[11px] font-medium text-zinc-500">
                              {formatStatus(execution.status)}
                            </span>
                          </Td>
                          <Td className="min-w-[160px] text-center text-center">
                            <span className="text-zinc-600">—</span>
                          </Td>
                          <Td className="w-28 text-right">
                            <button
                              type="button"
                              title={t("activity.detail.title")}
                              aria-label={t("activity.detail.title")}
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenExecution(execution.id, String(execution.workflow_id));
                              }}
                              className="flex size-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.07] hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
                            >
                              <ChevronRight size={15} />
                            </button>
                          </Td>
                        </Tr>
                      );
                    })
                  )}
                </Tbody>
              </Table>
            </TableWrapper>
          </TableContainer>

          <div className="flex flex-col gap-2 border-t border-white/[0.07] bg-white/[0.015] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-zinc-500">
              {t("activity.detail.range", { from, to, total })}
            </p>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void loadPage(page - 1)}
                disabled={loading || page <= 1}
                aria-label={t("activity.previous")}
                className="flex size-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.07] hover:text-zinc-200 disabled:opacity-35 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
              >
                <ChevronRight size={14} />
              </button>
              <span className="flex h-6 min-w-6 items-center justify-center rounded-[4px] border border-white/[0.1] bg-white/[0.05] px-1.5 text-[11px] font-medium text-zinc-200">
                {page}
              </span>
              <button
                type="button"
                onClick={() => void loadPage(page + 1)}
                disabled={loading || page >= lastPage}
                aria-label={t("activity.next")}
                className="flex size-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.07] hover:text-zinc-200 disabled:opacity-35 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
