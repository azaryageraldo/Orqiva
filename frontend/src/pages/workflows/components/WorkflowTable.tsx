import type { Workflow as WorkflowItem } from "@/types/workflow";
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
  page: number;
  perPage: number;
  isSelected: Record<number, boolean>;
  isUpdating: number | null;
  ownerName: string;
  formatDate: (value: string) => string;
  t: (key: string, params?: Record<string, string | number>) => string;
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: number) => void;
  onOpen: (id: string) => void;
  onEdit: (item: WorkflowItem) => void;
  onDelete: (item: WorkflowItem) => void;
  onToggleStatus: (item: WorkflowItem) => void;
  allSelected: boolean;
}

export default function WorkflowTable({
  workflows,
  loading,
  page,
  perPage,
  isSelected,
  isUpdating,
  ownerName,
  formatDate,
  t,
  onSelectAll,
  onSelectOne,
  onOpen,
  onEdit,
  onDelete,
  onToggleStatus,
  allSelected,
}: WorkflowTableProps) {
  return (
    <TableContainer>
      <TableWrapper>
        <Table>
          <Thead>
            <Tr className="border-b border-white/[0.07] bg-white/[0.02]">
              <Th className="w-10 text-right">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onSelectAll(!allSelected)}
                  aria-label={t("wf.selectAll")}
                  className="size-3.5 cursor-pointer rounded-[3px] border-white/20 bg-transparent accent-[var(--primary)]"
                />
              </Th>
              <Th className="w-12 text-center">{t("wf.col.no")}</Th>
              <Th className="min-w-[260px] text-center">{t("wf.col.name")}</Th>
              <Th className="w-28 text-center">{t("wf.col.tag")}</Th>
              <Th className="w-32 text-center">{t("wf.col.status")}</Th>
              <Th className="min-w-[120px] text-center">{t("wf.col.createdBy")}</Th>
              <Th className="min-w-[170px] text-center">{t("wf.col.createdAt")}</Th>
              <Th className="min-w-[120px] text-center">{t("wf.col.updatedBy")}</Th>
              <Th className="min-w-[170px] text-center">{t("wf.col.updatedAt")}</Th>
              <Th className="w-28 text-center">{t("wf.col.actions")}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <Tr key={`skeleton-${index}`} className="border-t border-white/[0.06]">
                  <Td colSpan={10} className="px-3 py-3">
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
                <Td colSpan={10}>
                  <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
                    <span className="mb-3 flex size-10 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] text-zinc-500">
                      <span className="size-5" />
                    </span>
                    <h2 className="text-sm font-medium text-zinc-200">
                      {t("wf.workspaceReady")}
                    </h2>
                    <p className="mt-1 max-w-sm text-[12.5px] text-zinc-500">
                      {t("wf.workspaceReadyDescription")}
                    </p>
                  </div>
                </Td>
              </Tr>
            ) : (
              workflows.map((item, index) => (
                <WorkflowRow
                  key={item.id}
                  item={item}
                  index={index}
                  page={page}
                  perPage={perPage}
                  isSelected={isSelected[item.id]}
                  isUpdating={isUpdating === item.id}
                  ownerName={ownerName}
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
