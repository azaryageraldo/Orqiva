import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity as ActivityIcon,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  GitFork,
  Headphones,
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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
            <span>{t("activity.success")}</span>
          </span>
        );
      case "running":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/25 bg-sky-500/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-sky-400">
            <span className="size-1.5 animate-pulse rounded-full bg-sky-400" />
            <span>{t("activity.running")}</span>
          </span>
        );
      case "waiting":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-amber-400">
            <span className="size-1.5 rounded-full bg-amber-400" />
            <span>{t("activity.waiting")}</span>
          </span>
        );
      case "escalated":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-indigo-400">
            <span className="size-1.5 rounded-full bg-indigo-400" />
            <span>{t("activity.escalated")}</span>
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-500/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-rose-400">
            <span className="size-1.5 rounded-full bg-rose-400" />
            <span>{t("activity.failed")}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-zinc-400">
            <span>{status}</span>
          </span>
        );
    }
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
              {t("activity.title")}
            </h1>
            <p className="mt-0.5 text-xs text-zinc-400">
              Pantau jalannya percakapan otomatis, status eksekusi alur, dan intervensi admin secara langsung.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadData(page, statusFilter, true)}
            disabled={loading || refreshing}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0c0d11] px-3 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.04] hover:text-zinc-100 disabled:opacity-50"
          >
            <RefreshCw
              className={cn("size-3.5", refreshing && "animate-spin text-primary")}
            />
            <span>{t("activity.refresh")}</span>
          </button>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-white/[0.08] bg-[#0c0d11]/80 p-3.5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-medium">Total Eksekusi</span>
              <ActivityIcon className="size-4 text-zinc-500" />
            </div>
            <div className="mt-2 text-xl font-semibold font-mono tracking-tight text-zinc-100">
              {summary.total}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-3.5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-xs font-medium">Berhasil</span>
              <CheckCircle2 className="size-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-xl font-semibold font-mono tracking-tight text-emerald-300">
              {summary.success}
            </div>
          </div>

          <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.03] p-3.5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-sky-400">
              <span className="text-xs font-medium">Berjalan & Menunggu</span>
              <Clock className="size-4 text-sky-400" />
            </div>
            <div className="mt-2 text-xl font-semibold font-mono tracking-tight text-sky-300">
              {summary.running + summary.waiting}
            </div>
          </div>

          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.03] p-3.5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-indigo-400">
              <span className="text-xs font-medium">Ke Admin</span>
              <Headphones className="size-4 text-indigo-400" />
            </div>
            <div className="mt-2 text-xl font-semibold font-mono tracking-tight text-indigo-300">
              {summary.escalated}
            </div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0c0d11] p-1">
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
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                    isActive
                      ? "bg-white/[0.1] text-zinc-100 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.2 text-[10px] font-mono",
                      isActive
                        ? "bg-white/[0.14] text-zinc-200"
                        : "bg-white/[0.05] text-zinc-500",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px] max-w-[320px]">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-500" />
            <Input
              type="search"
              placeholder={t("activity.detail.searchPlaceholder")}
              aria-label={t("activity.detail.searchAria")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 rounded-lg border-white/[0.08] bg-[#0c0d11] pr-7 pl-8 text-xs text-zinc-200 placeholder:text-zinc-500 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/30 [&::-webkit-search-cancel-button]:hidden"
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
            className="flex items-start justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive"
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
        <TableContainer className="rounded-xl border border-white/[0.08] bg-[#0c0d11]/80 backdrop-blur-sm shadow-xl shadow-black/40">
          <TableWrapper>
            <Table>
              <Thead>
                <Tr className="border-b border-white/[0.08] bg-white/[0.02]">
                  <Th className="w-12 px-4 py-3 text-left font-medium text-xs text-zinc-400">
                    #
                  </Th>
                  <Th className="px-4 py-3 text-left font-medium text-xs text-zinc-400">
                    Pelanggan & Kontak
                  </Th>
                  <Th className="min-w-[180px] px-4 py-3 text-left font-medium text-xs text-zinc-400">
                    Alur Kerja (Workflow)
                  </Th>
                  <Th className="w-36 px-4 py-3 text-left font-medium text-xs text-zinc-400">
                    {t("activity.col.logStatus")}
                  </Th>
                  <Th className="w-48 px-4 py-3 text-left font-medium text-xs text-zinc-400">
                    Waktu Sesi
                  </Th>
                  <Th className="w-24 px-4 py-3 text-right font-medium text-xs text-zinc-400">
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
                      <Td colSpan={6} className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="size-8 animate-pulse rounded-full bg-white/[0.06]" />
                          <div className="space-y-1.5 flex-1">
                            <div className="h-3.5 w-44 animate-pulse rounded bg-white/[0.06]" />
                            <div className="h-2.5 w-28 animate-pulse rounded bg-white/[0.04]" />
                          </div>
                          <div className="h-5 w-20 animate-pulse rounded-full bg-white/[0.04]" />
                        </div>
                      </Td>
                    </Tr>
                  ))
                ) : filteredExecutions.length === 0 ? (
                  <Tr>
                    <Td colSpan={6}>
                      <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
                        <div className="mb-3 flex size-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-zinc-500">
                          {search ? (
                            <AlertCircle className="size-6 text-zinc-400" />
                          ) : (
                            <ActivityIcon className="size-6 text-primary/70" />
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-zinc-200">
                          {search ? t("activity.noMatch") : t("activity.empty")}
                        </h3>
                        <p className="mt-1 max-w-sm text-xs text-zinc-400 leading-relaxed">
                          {search
                            ? t("activity.noMatchHint")
                            : "Belum ada sesi percakapan atau alur kerja yang dijalankan saat ini."}
                        </p>
                        {statusFilter !== "all" && (
                          <button
                            type="button"
                            onClick={() => setStatusFilter("all")}
                            className="mt-4 inline-flex items-center gap-1 rounded-md border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-zinc-100 transition-colors"
                          >
                            <span>Tampilkan semua status</span>
                          </button>
                        )}
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
                        className="group cursor-pointer border-t border-white/[0.06] transition-colors hover:bg-white/[0.025]"
                      >
                        {/* No */}
                        <Td className="w-12 px-4 py-3 font-mono text-xs text-zinc-500">
                          {rowNumber}
                        </Td>

                        {/* Customer & Contact Info */}
                        <Td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-gradient-to-br from-white/[0.08] to-white/[0.02] text-[11px] font-semibold text-zinc-200">
                              {execution.contact_name ? (
                                initials
                              ) : (
                                <User className="size-3.5 text-zinc-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-zinc-100 group-hover:text-primary transition-colors">
                                {contactName}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                                <span>
                                  Sesi #{execution.session_id ?? execution.id}
                                </span>
                                {execution.contact_id && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate max-w-[120px]">
                                      {execution.contact_id}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </Td>

                        {/* Workflow */}
                        <Td className="min-w-[180px] px-4 py-3 align-middle">
                          <div className="flex items-center gap-2">
                            <GitFork className="size-3.5 rotate-90 text-zinc-500 shrink-0" />
                            <span className="truncate text-xs font-medium text-zinc-200">
                              {execution.workflow_name ||
                                `Workflow #${execution.workflow_id}`}
                            </span>
                          </div>
                          {execution.steps_count > 0 && (
                            <p className="mt-0.5 text-[10px] text-zinc-500">
                              {execution.steps_count} langkah dijalankan
                            </p>
                          )}
                        </Td>

                        {/* Status */}
                        <Td className="w-36 px-4 py-3 align-middle">
                          {renderStatusBadge(execution.status)}
                        </Td>

                        {/* Started At */}
                        <Td className="w-48 px-4 py-3 align-middle text-xs text-zinc-400 whitespace-nowrap">
                          {formatDate(execution.started_at, locale)}
                        </Td>

                        {/* Actions */}
                        <Td className="w-24 px-4 py-3 align-middle text-right">
                          <button
                            type="button"
                            title={t("activity.detail.title")}
                            aria-label={t("activity.detail.title")}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenExecution(
                                execution.id,
                                String(execution.workflow_id),
                              );
                            }}
                            className="inline-flex size-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-zinc-100 focus-visible:outline-none"
                          >
                            <ChevronRight className="size-4" />
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

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-1 text-xs text-zinc-400">
          <div>
            Menampilkan halaman <span className="font-mono text-zinc-200">{page}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void loadData(page - 1, statusFilter)}
              disabled={loading || page <= 1}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/[0.08] bg-[#0c0d11] px-2.5 text-xs text-zinc-300 transition hover:bg-white/[0.04] hover:text-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="size-3.5" />
              <span>Sebelumnya</span>
            </button>
            <button
              type="button"
              onClick={() => void loadData(page + 1, statusFilter)}
              disabled={loading || !hasMore}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/[0.08] bg-[#0c0d11] px-2.5 text-xs text-zinc-300 transition hover:bg-white/[0.04] hover:text-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Berikutnya</span>
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
