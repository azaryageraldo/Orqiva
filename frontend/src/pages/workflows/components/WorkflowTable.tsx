import { GitFork, Plus } from "lucide-react";
import type { Workflow as WorkflowItem } from "@/types/workflow";
import { Button } from "@/components/ui/button";
import WorkflowRow from "./WorkflowRow";

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

interface WorkflowTableProps {
  workflows: WorkflowItem[];
  loading: boolean;
  isSelected: Record<number, boolean>;
  isUpdating: number | null;
  formatDate: (value: string) => string;
  t: (key: string, params?: Record<string, string | number>) => string;
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: number) => void;
  onOpen: (id: string) => void;
  onEdit: (item: WorkflowItem) => void;
  onDelete: (item: WorkflowItem) => void;
  onToggleStatus: (item: WorkflowItem) => void;
  onCreateNew?: () => void;
  allSelected: boolean;
  searchQuery?: string;
}

export default function WorkflowTable({
  workflows,
  loading,
  isSelected,
  isUpdating,
  formatDate,
  t,
  onSelectAll,
  onSelectOne,
  onOpen,
  onEdit,
  onDelete,
  onToggleStatus,
  onCreateNew,
  allSelected,
  searchQuery,
}: WorkflowTableProps) {
  return (
    <TableContainer className="rounded-xl border border-white/[0.08] bg-[#0c0d11]/80 backdrop-blur-sm shadow-xl shadow-black/40">
      <TableWrapper>
        <Table>
          <Thead>
            <Tr className="border-b border-white/[0.08] bg-white/[0.02]">
              <Th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onSelectAll(!allSelected)}
                  aria-label={t("wf.selectAll")}
                  className="size-3.5 cursor-pointer rounded-[4px] border-white/20 bg-transparent accent-[var(--primary)]"
                />
              </Th>
              <Th className="px-4 py-3 text-left font-medium text-xs text-zinc-400">
                Alur Kerja
              </Th>
              <Th className="w-36 px-4 py-3 text-left font-medium text-xs text-zinc-400">
                {t("wf.col.status")}
              </Th>
              <Th className="w-48 px-4 py-3 text-left font-medium text-xs text-zinc-400">
                Terakhir Diperbarui
              </Th>
              <Th className="w-36 px-4 py-3 text-right font-medium text-xs text-zinc-400">
                {t("wf.col.actions")}
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Tr key={`skeleton-${index}`} className="border-t border-white/[0.06]">
                  <Td colSpan={5} className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-3.5 animate-pulse rounded bg-white/[0.06]" />
                      <div className="size-9 animate-pulse rounded-lg bg-white/[0.06]" />
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-48 animate-pulse rounded bg-white/[0.06]" />
                        <div className="h-2.5 w-72 animate-pulse rounded bg-white/[0.04]" />
                      </div>
                      <div className="ml-auto h-6 w-20 animate-pulse rounded-full bg-white/[0.04]" />
                    </div>
                  </Td>
                </Tr>
              ))
            ) : workflows.length === 0 ? (
              <Tr>
                <Td colSpan={5}>
                  <div className="flex min-h-72 flex-col items-center justify-center px-6 py-14 text-center">
                    <div className="relative mb-4 flex size-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-zinc-400 shadow-inner">
                      <GitFork className="size-7 rotate-90 text-primary/70" />
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-200">
                      {searchQuery ? t("wf.noMatch") : "Belum ada alur kerja"}
                    </h3>
                    <p className="mt-1.5 max-w-sm text-xs text-zinc-400 leading-relaxed">
                      {searchQuery
                        ? "Coba gunakan kata kunci lain atau bersihkan kotak pencarian."
                        : "Rancang alur respon percakapan otomatis Anda untuk menangani pertanyaan pelanggan secara cerdas."}
                    </p>
                    {onCreateNew && !searchQuery && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={onCreateNew}
                        className="mt-5 h-8 gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90"
                      >
                        <Plus className="size-3.5" />
                        <span>{t("wf.newWorkflow")}</span>
                      </Button>
                    )}
                  </div>
                </Td>
              </Tr>
            ) : (
              workflows.map((item) => (
                <WorkflowRow
                  key={item.id}
                  item={item}
                  isSelected={Boolean(isSelected[item.id])}
                  isUpdating={isUpdating === item.id}
                  formatDate={formatDate}
                  t={t}
                  onSelect={onSelectOne}
                  onOpen={onOpen}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleStatus={onToggleStatus}
                />
              ))
            )}
          </Tbody>
        </Table>
      </TableWrapper>
    </TableContainer>
  );
}
