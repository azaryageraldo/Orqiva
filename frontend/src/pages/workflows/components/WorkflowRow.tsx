import { ArrowUpRight, GitFork, Pencil, Trash2 } from "lucide-react";

import type { Workflow as WorkflowItem } from "@/types/workflow";
import WorkflowStatusToggle from "./WorkflowStatusToggle";

interface WorkflowRowProps {
  item: WorkflowItem;
  isSelected: boolean;
  isUpdating: boolean;
  formatDate: (value: string) => string;
  t: (key: string, params?: Record<string, string | number>) => string;
  onSelect: (id: number) => void;
  onOpen: (id: string) => void;
  onEdit: (item: WorkflowItem) => void;
  onDelete: (item: WorkflowItem) => void;
  onToggleStatus: (item: WorkflowItem) => void;
}

export default function WorkflowRow({
  item,
  isSelected,
  isUpdating,
  formatDate,
  t,
  onSelect,
  onOpen,
  onEdit,
  onDelete,
  onToggleStatus,
}: WorkflowRowProps) {
  const isActive = item.status === "active";

  return (
    <tr
      onClick={() => onOpen(String(item.id))}
      className="group cursor-pointer border-t border-white/[0.06] transition-colors hover:bg-white/[0.025]"
    >
      <td
        className="w-10 px-4 py-3.5"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(item.id)}
          aria-label={t("wf.selectOne", { name: item.name })}
          className="size-3.5 cursor-pointer rounded-[4px] border-white/20 bg-transparent accent-[var(--primary)]"
        />
      </td>

      <td className="px-4 py-3.5 align-middle">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 group-hover:border-primary/30 group-hover:bg-primary/[0.06] group-hover:text-primary transition-colors">
            <GitFork className="size-4 rotate-90" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-zinc-100 group-hover:text-primary transition-colors">
                {item.name}
              </span>
            </div>
            {item.description ? (
              <p className="mt-0.5 truncate text-xs text-zinc-400">
                {item.description}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-zinc-600 italic">
                Tanpa deskripsi
              </p>
            )}
          </div>
        </div>
      </td>

      <td
        className="w-36 px-4 py-3.5 align-middle"
        onClick={(event) => event.stopPropagation()}
      >
        <WorkflowStatusToggle
          isActive={isActive}
          isUpdating={isUpdating}
          onToggle={() => onToggleStatus(item)}
          labelActive={t("wf.on")}
          labelInactive={t("wf.off")}
          ariaLabel={t("wf.toggleStatus", { name: item.name })}
        />
      </td>

      <td className="w-48 px-4 py-3.5 align-middle text-xs text-zinc-400 whitespace-nowrap">
        {formatDate(item.updated_at)}
      </td>

      <td
        className="w-36 px-4 py-3.5 align-middle text-right"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            title="Buka Editor Canvas"
            aria-label="Buka Editor Canvas"
            onClick={() => onOpen(String(item.id))}
            className="flex size-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-primary/[0.1] hover:text-primary focus-visible:outline-none"
          >
            <ArrowUpRight className="size-4" />
          </button>
          <button
            type="button"
            title={t("wf.editTitle")}
            aria-label={t("wf.editAria", { name: item.name })}
            onClick={() => onEdit(item)}
            className="flex size-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-zinc-200 focus-visible:outline-none"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            title={t("wf.deleteTitle")}
            aria-label={t("wf.deleteAria", { name: item.name })}
            onClick={() => onDelete(item)}
            className="flex size-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-destructive/15 hover:text-destructive focus-visible:outline-none"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
