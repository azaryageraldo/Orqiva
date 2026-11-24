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
  onExport?: (item: WorkflowItem) => void;
  onDuplicate?: (item: WorkflowItem) => void;
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
  onExport,
  onDuplicate,
  onCreateNew,
  allSelected,
  searchQuery,
}: WorkflowTableProps) {
  return (
    <TableContainer className="rounded-xl border border-border bg-card/80 backdrop-blur-sm shadow-xl shadow-black/40">
      <TableWrapper>
        <Table>
          <Thead>
            <Tr className="border-b border-border bg-muted/20">
              <Th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onSelectAll(!allSelected)}
                  aria-label={t("wf.selectAll")}
                  className="size-3.5 cursor-pointer rounded-[4px] border-border bg-transparent accent-[var(--primary)]"
                />
              </Th>
              <Th className="px-4 py-3 text-left font-medium text-xs text-muted-foreground">
                Workflow
              </Th>
              <Th className="w-36 px-4 py-3 text-left font-medium text-xs text-muted-foreground">
                {t("wf.col.status")}
              </Th>
              <Th className="w-48 px-4 py-3 text-left font-medium text-xs text-muted-foreground">
                Last Updated
              </Th>
              <Th className="w-36 px-4 py-3 text-right font-medium text-xs text-muted-foreground">
                {t("wf.col.actions")}
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Tr key={`skeleton-${index}`} className="border-t border-border">
                  <Td colSpan={5} className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-3.5 animate-pulse rounded bg-muted/40" />
                      <div className="size-9 animate-pulse rounded-lg bg-muted/40" />
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-48 animate-pulse rounded bg-muted/40" />
                        <div className="h-2.5 w-72 animate-pulse rounded bg-muted/20" />
                      </div>
                      <div className="ml-auto h-6 w-20 animate-pulse rounded-full bg-muted/20" />
                    </div>
                  </Td>
                </Tr>
              ))
            ) : workflows.length === 0 ? (
              <Tr>
                <Td colSpan={5}>
                  <div className="flex min-h-72 flex-col items-center justify-center px-6 py-14 text-center">
                    <div className="relative mb-4 flex size-14 items-center justify-center rounded-2xl border border-border bg-muted/30 text-muted-foreground shadow-inner">
                      <GitFork className="size-7 rotate-90 text-primary/70" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {searchQuery ? t("wf.noMatch") : "No workflows yet"}
                    </h3>
                    <p className="mt-1.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
                      {searchQuery
                        ? "Try another search keyword or clear the search input."
                        : "Design your automated conversation flows to handle customer inquiries intelligently."}
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
                  onExport={onExport}
                  onDuplicate={onDuplicate}
                />
              ))
            )}
          </Tbody>
        </Table>
      </TableWrapper>
    </TableContainer>
  );
}
