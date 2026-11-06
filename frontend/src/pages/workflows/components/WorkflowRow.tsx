import { Pencil, Trash2 } from "lucide-react";

import type { Workflow as WorkflowItem } from "@/types/workflow";
import WorkflowStatusToggle from "./WorkflowStatusToggle";

interface WorkflowRowProps {
  item: WorkflowItem;
  index: number;
  page: number;
  perPage: number;
  isSelected: boolean;
  isUpdating: boolean;
  ownerName: string;
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
  index,
  page,
  perPage,
  isSelected,
  isUpdating,
  ownerName,
  formatDate,
  t,
  onSelect,
  onOpen,
  onEdit,
  onDelete,
  onToggleStatus,
}: WorkflowRowProps) {
  const isActive = item.status === "active";
  const rowNumber = (page - 1) * perPage + index + 1;

  return (
    <tr className="group border-t border-white/[0.06] transition-colors hover:bg-white/[0.025]">
      <td className="w-10 px-3 py-2.5 text-right">
        <input
          type="checkbox"
          checked={isSelected}
          onClick={(event) => event.stopPropagation()}
          onChange={() => onSelect(item.id)}
          aria-label={t("wf.selectOne", { name: item.name })}
          className="size-3.5 cursor-pointer rounded-[3px] border-white/20 bg-transparent accent-[var(--primary)]"
        />
      </td>

      <td className="w-12 tabular-nums text-center text-[11px] text-zinc-400">
        {rowNumber}
      </td>

      <td className="px-3 py-2.5 align-middle last:border-r-0">
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(String(item.id));
            }}
            className="max-w-[280px] truncate text-left text-xs font-medium text-zinc-100 transition hover:text-primary hover:underline"
          >
            {item.name}
          </button>
          {item.description && (
            <p className="max-w-[320px] truncate text-left text-[10px] text-zinc-600">
              {item.description}
            </p>
          )}
        </div>
      </td>

      <td className="w-28 px-3 py-2.5 align-middle text-center last:border-r-0 text-[11px] text-zinc-400">
        <span className="text-zinc-600">—</span>
      </td>

      <td className="w-32 px-3 py-2.5 align-middle text-center last:border-r-0 text-[11px] text-zinc-400">
        <WorkflowStatusToggle
          isActive={isActive}
          isUpdating={isUpdating}
          onToggle={() => onToggleStatus(item)}
          labelActive={t("wf.on")}
          labelInactive={t("wf.off")}
          ariaLabel={t("wf.toggleStatus", { name: item.name })}
        />
      </td>

      <td className="min-w-[120px] px-3 py-2.5 align-middle text-center truncate last:border-r-0 text-[11px] text-zinc-400">
        {ownerName}
      </td>
      <td className="min-w-[170px] px-3 py-2.5 align-middle text-center whitespace-nowrap last:border-r-0 text-[11px] text-zinc-400">
        {formatDate(item.created_at)}
      </td>
      <td className="min-w-[120px] px-3 py-2.5 align-middle text-center truncate last:border-r-0 text-[11px] text-zinc-400">
        {ownerName}
      </td>
      <td className="min-w-[170px] px-3 py-2.5 align-middle text-center whitespace-nowrap last:border-r-0 text-[11px] text-zinc-400">
        {formatDate(item.updated_at)}
      </td>

      <td className="w-28 px-3 py-2.5 align-middle text-center last:border-r-0 text-[11px] text-zinc-400">
        <div className="flex items-center justify-center gap-0.5">
          <button
            type="button"
            title={t("wf.editTitle")}
            aria-label={t("wf.editAria", { name: item.name })}
            onClick={(event) => {
              event.stopPropagation();
              onEdit(item);
            }}
            className="flex size-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.07] hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            title={t("wf.deleteTitle")}
            aria-label={t("wf.deleteAria", { name: item.name })}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(item);
            }}
            className="flex size-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}
