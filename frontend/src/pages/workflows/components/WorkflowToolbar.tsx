import { Plus, Search, X, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WorkflowToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onCreate: () => void;
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
  onCreate,
  onDeleteSelected,
  selectedCount,
  t,
  className,
  deletingSelected,
}: WorkflowToolbarProps) {
  return (
    <div className={cn(className, "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between")}>
      <div className="relative w-full lg:max-w-[320px]">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-600"
        />
        <Input
          type="search"
          placeholder={t("wf.searchShort")}
          aria-label={t("wf.searchAria")}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-9 rounded-md border-white/[0.1] bg-[#0d0e11] pr-8 pl-8 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 dark:bg-[#0d0e11] [&::-webkit-search-cancel-button]:hidden"
        />
        {search && (
          <button
            type="button"
            aria-label={t("wf.clearSearch")}
            onClick={onClearSearch}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-zinc-500 transition hover:text-zinc-200"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {selectedCount > 0 && (
          <Button
            type="button"
            variant="destructive"
            disabled={deletingSelected}
            onClick={onDeleteSelected}
            className="h-9 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 px-3 text-[12.5px] font-medium transition-colors"
          >
            <Trash2 size={14} />
            {t("wf.deleteSelected", { count: selectedCount })}
          </Button>
        )}
        <Button
          type="button"
          onClick={onCreate}
          className="h-9 rounded-md bg-primary px-3 text-[12.5px] font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus />
          {t("wf.newWorkflow")}
        </Button>
      </div>
    </div>
  );
}
