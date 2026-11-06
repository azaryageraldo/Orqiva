import { ChevronLeft, ChevronRight } from "lucide-react";

interface WorkflowPaginationProps {
  page: number;
  lastPage: number;
  from: number;
  to: number;
  total: number;
  loading: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  onPrevious: () => void;
  onNext: () => void;
}

export default function WorkflowPagination({
  page,
  lastPage,
  from,
  to,
  total,
  loading,
  t,
  onPrevious,
  onNext,
}: WorkflowPaginationProps) {
  return (
    <div className="flex flex-col gap-2 border-t border-white/[0.07] bg-white/[0.015] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[11px] text-zinc-500">
        {t("wf.range", { from, to, total })}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrevious}
          disabled={loading || page <= 1}
          aria-label={t("wf.previous")}
          className="flex size-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.07] hover:text-zinc-200 disabled:opacity-35 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="flex h-6 min-w-6 items-center justify-center rounded-[4px] border border-white/[0.1] bg-white/[0.05] px-1.5 text-[11px] font-medium text-zinc-200">
          {page}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={loading || page >= lastPage}
          aria-label={t("wf.next")}
          className="flex size-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.07] hover:text-zinc-200 disabled:opacity-35 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
