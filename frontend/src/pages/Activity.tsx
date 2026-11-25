import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity as ActivityIcon,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  GitFork,
  RefreshCw,
  Search,
  User,
  X,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableContainer,
  TableWrapper,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@/components/table";
import { formatLocale, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  type ActivityExecution,
  type ExecutionStatus,
  getActivity,
} from "../services/stats";
import { getErrorMessage } from "../services/api";

interface ActivityProps {
  onOpenExecution: (executionId: number, workflowId: string) => void;
}

type FilterStatus = "all" | ExecutionStatus;

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getInitials(name: string | null): string {
  if (!name || !name.trim()) return "PL";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function Activity({ onOpenExecution }: ActivityProps) {
  const { language, t } = useI18n();
  const locale = formatLocale(language);

  const [executions, setExecutions] = useState<ActivityExecution[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [summary, setSummary] = useState({
    total: 0,
    success: 0,
    failed: 0,
    waiting: 0,
    running: 0,
    escalated: 0,
  });

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const requestRef = useRef(0);

  const loadData = useCallback(
    async (targetPage = 1, currentFilter: FilterStatus = "all", isRefresh = false) => {
      const requestId = ++requestRef.current;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        const filterParam =
          currentFilter === "all" ? {} : { status: currentFilter };
        const result = await getActivity(20, filterParam, targetPage);

        if (requestId !== requestRef.current) return;

        setExecutions(result.executions);
        setSummary(result.summary);
        setPage(result.meta.page);
        setHasMore(result.meta.has_more);
      } catch (caught) {
        if (requestId !== requestRef.current) return;
        setError(getErrorMessage(caught, t("activity.loadError")));
      } finally {
        if (requestId === requestRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [t],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(1, statusFilter), 0);
    return () => window.clearTimeout(timer);
  }, [loadData, statusFilter]);

  const filteredExecutions = useMemo(() => {
    if (!search.trim()) return executions;
    const q = search.toLowerCase();
    return executions.filter(
      (item) =>
        (item.contact_name && item.contact_name.toLowerCase().includes(q)) ||
        (item.contact_id && item.contact_id.toLowerCase().includes(q)) ||
        (item.workflow_name && item.workflow_name.toLowerCase().includes(q)) ||
        String(item.session_id || item.id).includes(q),
    );
  }, [executions, search]);

  const filterTabs: Array<{ id: FilterStatus; label: string; count: number }> =
    [
      { id: "all", label: "All", count: summary.total },
      { id: "success", label: t("activity.success"), count: summary.success },
      { id: "running", label: t("activity.running"), count: summary.running },
      { id: "waiting", label: t("activity.waiting"), count: summary.waiting },
      {
        id: "escalated",
        label: t("activity.escalated"),
        count: summary.escalated,
      },
      { id: "failed", label: t("activity.failed"), count: summary.failed },
    ];

  function renderStatusBadge(status: ExecutionStatus) {
    switch (status) {
      case "success":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <span>{t("activity.success")}</span>
          </span>
        );
      case "running":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-400">
            <span className="size-1.5 rounded-full bg-sky-400" />
            <span>{t("activity.running")}</span>
          </span>
        );
      case "waiting":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
            <span className="size-1.5 rounded-full bg-amber-400" />
            <span>{t("activity.waiting")}</span>
          </span>
        );
      case "escalated":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-400">
            <span className="size-1.5 rounded-full bg-indigo-400" />
            <span>{t("activity.escalated")}</span>
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-400">
            <span className="size-1.5 rounded-full bg-rose-400" />
            <span>{t("activity.failed")}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            <span>{status}</span>
          </span>
        );
    }
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] px-4 py-5 sm:px-6 lg:px-8">
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground font-heading">
              {t("activity.title")}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Monitor conversation history, AI workflow executions, and escalations.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadData(page, statusFilter, true)}
            disabled={loading || refreshing}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted/40 disabled:opacity-50"
          >
            <RefreshCw
              className={cn("size-3.5", refreshing && "animate-spin text-primary")}
            />
            <span>{t("activity.refresh")}</span>
          </button>
        </div>

        {/* Toolbar & Filter Tabs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-card p-1">
            {filterTabs.map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setPage(1);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "rounded px-1.5 text-[10px] font-mono",
                      isActive
                        ? "bg-primary/20 text-primary font-bold"
                        : "bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px] sm:max-w-[280px]">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t("activity.detail.searchPlaceholder")}
              aria-label={t("activity.detail.searchAria")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 rounded-md border-border bg-card pr-7 pl-8 text-xs text-foreground placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-4 rounded-md border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-destructive/70 transition hover:text-destructive"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Table Container */}
        <TableContainer className="rounded-xl border border-border bg-card/80 backdrop-blur-sm shadow-xl shadow-black/40">
          <TableWrapper>
            <Table>
              <Thead>
                <Tr className="border-b border-border bg-muted/20">
                  <Th className="w-12 px-4 py-2.5 text-left font-medium text-xs text-muted-foreground">
                    #
                  </Th>
                  <Th className="px-4 py-2.5 text-left font-medium text-xs text-muted-foreground">
                    Customer & Session
                  </Th>
                  <Th className="min-w-[180px] px-4 py-2.5 text-left font-medium text-xs text-muted-foreground">
                    Workflow
                  </Th>
                  <Th className="w-32 px-4 py-2.5 text-left font-medium text-xs text-muted-foreground">
                    {t("activity.col.logStatus")}
                  </Th>
                  <Th className="w-48 px-4 py-2.5 text-left font-medium text-xs text-muted-foreground">
                    Session Time
                  </Th>
                  <Th className="w-20 px-4 py-2.5 text-right font-medium text-xs text-muted-foreground">
                    Action
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <Tr
                      key={`skeleton-${index}`}
                      className="border-t border-border"
                    >
                      <Td colSpan={6} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="size-7 animate-pulse rounded-full bg-muted/40" />
                          <div className="space-y-1.5 flex-1">
                            <div className="h-3 w-40 animate-pulse rounded bg-muted/40" />
                            <div className="h-2 w-24 animate-pulse rounded bg-muted/20" />
                          </div>
                          <div className="h-4 w-16 animate-pulse rounded-full bg-muted/20" />
                        </div>
                      </Td>
                    </Tr>
                  ))
                ) : filteredExecutions.length === 0 ? (
                  <Tr>
                    <Td colSpan={6}>
                      <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
                        <span className="mb-2.5 flex size-10 items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground">
                          {search ? (
                            <AlertCircle className="size-5 text-muted-foreground" />
                          ) : (
                            <ActivityIcon className="size-5 text-muted-foreground" />
                          )}
                        </span>
                        <h3 className="text-sm font-medium text-foreground">
                          {search ? t("activity.noMatch") : t("activity.empty")}
                        </h3>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                          {search
                            ? t("activity.noMatchHint")
                            : "No conversations or workflow executions yet."}
                        </p>
                      </div>
                    </Td>
                  </Tr>
                ) : (
                  filteredExecutions.map((execution, index) => {
                    const rowNumber = (page - 1) * 20 + index + 1;
                    const contactName =
                      execution.contact_name || t("activity.contactMissing");
                    const initials = getInitials(execution.contact_name);

                    return (
                      <Tr
                        key={execution.id}
                        onClick={() =>
                          onOpenExecution(
                            execution.id,
                            String(execution.workflow_id),
                          )
                        }
                        className="group cursor-pointer border-t border-border transition-colors hover:bg-muted/30"
                      >
                        {/* No */}
                        <Td className="w-12 px-4 py-2.5 font-mono text-xs text-muted-foreground">
                          {rowNumber}
                        </Td>

                        {/* Customer & Contact Info */}
                        <Td className="px-4 py-2.5 align-middle">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 text-[10px] font-medium text-foreground">
                              {execution.contact_name ? (
                                initials
                              ) : (
                                <User className="size-3 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                                {contactName}
                              </p>
                              <p className="text-[11px] font-mono text-muted-foreground">
                                #{execution.session_id ?? execution.id}
                                {execution.contact_id && ` · ${execution.contact_id}`}
                              </p>
                            </div>
                          </div>
                        </Td>

                        {/* Workflow */}
                        <Td className="min-w-[180px] px-4 py-2.5 align-middle">
                          <div className="flex items-center gap-1.5">
                            <GitFork className="size-3 rotate-90 text-muted-foreground shrink-0" />
                            <span className="truncate text-xs text-foreground/90">
                              {execution.workflow_name ||
                                `Workflow #${execution.workflow_id}`}
                            </span>
                          </div>
                        </Td>

                        {/* Status */}
                        <Td className="w-32 px-4 py-2.5 align-middle">
                          {renderStatusBadge(execution.status)}
                        </Td>

                        {/* Started At */}
                        <Td className="w-48 px-4 py-2.5 align-middle text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(execution.started_at, locale)}
                        </Td>

                        {/* Actions */}
                        <Td className="w-20 px-4 py-2.5 align-middle text-right">
                          <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                            Open →
                          </span>
                        </Td>
                      </Tr>
                    );
                  })
                )}
              </Tbody>
            </Table>
          </TableWrapper>
        </TableContainer>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <div>
            Page <span className="font-mono text-foreground font-medium">{page}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void loadData(page - 1, statusFilter)}
              disabled={loading || page <= 1}
              className="inline-flex h-7 items-center gap-1 rounded border border-border bg-card px-2 text-xs text-foreground transition hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="size-3" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              onClick={() => void loadData(page + 1, statusFilter)}
              disabled={loading || !hasMore}
              className="inline-flex h-7 items-center gap-1 rounded border border-border bg-card px-2 text-xs text-foreground transition hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Next</span>
              <ChevronRight className="size-3" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
