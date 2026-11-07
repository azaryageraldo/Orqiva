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
    async (targetPage = 1, currentFilter = statusFilter, isRefresh = false) => {
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
    [statusFilter, t],
  );

  useEffect(() => {
    void loadData(1, statusFilter);
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
      { id: "all", label: "Semua", count: summary.total },
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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
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
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
              {t("activity.title")}
            </h1>
            <p className="mt-0.5 text-xs text-zinc-400">
              Pantau riwayat sesi percakapan, eksekusi alur AI, dan eskalasi ke admin.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadData(page, statusFilter, true)}
            disabled={loading || refreshing}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-[#0d0e11] px-3 text-xs font-medium text-zinc-300 transition hover:bg-white/5 hover:text-zinc-100 disabled:opacity-50"
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
          <div className="flex flex-wrap items-center gap-1 rounded-md border border-white/10 bg-[#0d0e11] p-1">
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
                      ? "bg-white/10 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "rounded px-1.5 text-[10px] font-mono",
                      isActive
                        ? "bg-white/10 text-zinc-200"
                        : "bg-white/5 text-zinc-500",
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
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-500" />
            <Input
              type="search"
              placeholder={t("activity.detail.searchPlaceholder")}
              aria-label={t("activity.detail.searchAria")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 rounded-md border-white/10 bg-[#0d0e11] pr-7 pl-8 text-xs text-zinc-200 placeholder:text-zinc-500 [&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Hapus pencarian"
                className="absolute top-1/2 right-2 -translate-y-1/2 text-zinc-500 transition hover:text-zinc-200"
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
        <TableContainer className="rounded-md border border-white/10 bg-[#0e0f12]">
          <TableWrapper>
            <Table>
              <Thead>
                <Tr className="border-b border-white/10 bg-white/[0.02]">
                  <Th className="w-12 px-4 py-2.5 text-left font-medium text-xs text-zinc-400">
                    #
                  </Th>
                  <Th className="px-4 py-2.5 text-left font-medium text-xs text-zinc-400">
                    Pelanggan & Sesi
                  </Th>
                  <Th className="min-w-[180px] px-4 py-2.5 text-left font-medium text-xs text-zinc-400">
                    Alur Kerja
                  </Th>
                  <Th className="w-32 px-4 py-2.5 text-left font-medium text-xs text-zinc-400">
                    {t("activity.col.logStatus")}
                  </Th>
                  <Th className="w-48 px-4 py-2.5 text-left font-medium text-xs text-zinc-400">
                    Waktu Sesi
                  </Th>
                  <Th className="w-20 px-4 py-2.5 text-right font-medium text-xs text-zinc-400">
                    Aksi
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <Tr
                      key={`skeleton-${index}`}
                      className="border-t border-white/[0.06]"
                    >
                      <Td colSpan={6} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="size-7 animate-pulse rounded-full bg-white/[0.06]" />
                          <div className="space-y-1.5 flex-1">
                            <div className="h-3 w-40 animate-pulse rounded bg-white/[0.06]" />
                            <div className="h-2 w-24 animate-pulse rounded bg-white/[0.04]" />
                          </div>
                          <div className="h-4 w-16 animate-pulse rounded-full bg-white/[0.04]" />
                        </div>
                      </Td>
                    </Tr>
                  ))
                ) : filteredExecutions.length === 0 ? (
                  <Tr>
                    <Td colSpan={6}>
                      <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
                        <span className="mb-2.5 flex size-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-500">
                          {search ? (
                            <AlertCircle className="size-5 text-zinc-400" />
                          ) : (
                            <ActivityIcon className="size-5 text-zinc-400" />
                          )}
                        </span>
                        <h3 className="text-sm font-medium text-zinc-200">
                          {search ? t("activity.noMatch") : t("activity.empty")}
                        </h3>
                        <p className="mt-1 max-w-sm text-xs text-zinc-500">
                          {search
                            ? t("activity.noMatchHint")
                            : "Belum ada sesi percakapan atau alur kerja yang dijalankan."}
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
                        className="group cursor-pointer border-t border-white/[0.06] transition-colors hover:bg-white/[0.02]"
                      >
                        {/* No */}
                        <Td className="w-12 px-4 py-2.5 font-mono text-xs text-zinc-500">
                          {rowNumber}
                        </Td>

                        {/* Customer & Contact Info */}
                        <Td className="px-4 py-2.5 align-middle">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[10px] font-medium text-zinc-300">
                              {execution.contact_name ? (
                                initials
                              ) : (
                                <User className="size-3 text-zinc-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-zinc-200 group-hover:text-primary transition-colors">
                                {contactName}
                              </p>
                              <p className="text-[11px] font-mono text-zinc-500">
                                #{execution.session_id ?? execution.id}
                                {execution.contact_id && ` · ${execution.contact_id}`}
                              </p>
                            </div>
                          </div>
                        </Td>

                        {/* Workflow */}
                        <Td className="min-w-[180px] px-4 py-2.5 align-middle">
                          <div className="flex items-center gap-1.5">
                            <GitFork className="size-3 rotate-90 text-zinc-500 shrink-0" />
                            <span className="truncate text-xs text-zinc-300">
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
                        <Td className="w-48 px-4 py-2.5 align-middle text-xs text-zinc-400 whitespace-nowrap">
                          {formatDate(execution.started_at, locale)}
                        </Td>

                        {/* Actions */}
                        <Td className="w-20 px-4 py-2.5 align-middle text-right">
                          <span className="text-xs text-zinc-500 group-hover:text-zinc-200 transition-colors">
                            Buka →
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
        <div className="flex items-center justify-between px-1 text-xs text-zinc-400">
          <div>
            Halaman <span className="font-mono text-zinc-200">{page}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void loadData(page - 1, statusFilter)}
              disabled={loading || page <= 1}
              className="inline-flex h-7 items-center gap-1 rounded border border-white/10 bg-[#0d0e11] px-2 text-xs text-zinc-300 transition hover:bg-white/5 hover:text-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="size-3" />
              <span>Sebelumnya</span>
            </button>
            <button
              type="button"
              onClick={() => void loadData(page + 1, statusFilter)}
              disabled={loading || !hasMore}
              className="inline-flex h-7 items-center gap-1 rounded border border-white/10 bg-[#0d0e11] px-2 text-xs text-zinc-300 transition hover:bg-white/5 hover:text-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Berikutnya</span>
              <ChevronRight className="size-3" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
