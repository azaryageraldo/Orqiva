import { useRef } from "react";
import { Plus, Search, Trash2, Upload, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type WorkflowFilterStatus = "all" | "active" | "inactive";

interface WorkflowToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  statusFilter: WorkflowFilterStatus;
  onStatusFilterChange: (status: WorkflowFilterStatus) => void;
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
  onCreate: () => void;
  onImport?: (file: File) => void;
  importing?: boolean;
  onDeleteSelected: () => void;
  selectedCount: number;
  t: (key: string, params?: Record<string, string | number>) => string;
  className?: string;
  deletingSelected: boolean;
}

export default function WorkflowToolbar({
  search,
  onSearchChange,
  onClearSearch,
  statusFilter,
  onStatusFilterChange,
  totalCount,
  activeCount,
  inactiveCount,
  onCreate,
  onImport,
  importing,
  onDeleteSelected,
  selectedCount,
  t,
  className,
  deletingSelected,
}: WorkflowToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filterTabs: Array<{ id: WorkflowFilterStatus; label: string; count: number }> = [
    { id: "all", label: "All", count: totalCount },
    { id: "active", label: t("wf.on"), count: activeCount },
    { id: "inactive", label: t("wf.off"), count: inactiveCount },
  ];

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter Pills */}
        <div className="inline-flex items-center rounded-lg border border-border bg-card p-1">
          {filterTabs.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onStatusFilterChange(tab.id)}
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

        {/* Search Input */}
        <div className="relative min-w-[220px] flex-1 sm:max-w-[280px]">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-500" />
          <Input
            type="search"
            placeholder={t("wf.searchShort")}
            aria-label={t("wf.searchAria")}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-8 rounded-lg border-border bg-card pr-7 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/30 [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button
              type="button"
              aria-label={t("wf.clearSearch")}
              onClick={onClearSearch}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-zinc-500 transition hover:text-zinc-200"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {selectedCount > 0 && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={deletingSelected}
            onClick={onDeleteSelected}
            className="h-8 gap-1.5 rounded-lg bg-destructive/90 px-3 text-xs font-medium text-destructive-foreground hover:bg-destructive"
          >
            <Trash2 className="size-3.5" />
            <span>{t("wf.deleteSelected", { count: selectedCount })}</span>
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onImport) {
              onImport(file);
              e.target.value = "";
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={importing}
          onClick={() => fileInputRef.current?.click()}
          className="h-8 gap-1.5 rounded-lg border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <Upload className="size-3.5" />
          <span>{importing ? "Importing..." : "Import"}</span>
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onCreate}
          className="h-8 gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90"
        >
          <Plus className="size-3.5" />
          <span>{t("wf.newWorkflow")}</span>
        </Button>
      </div>
    </div>
  );
}
