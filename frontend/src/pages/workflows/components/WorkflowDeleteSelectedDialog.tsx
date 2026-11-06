import { Trash2 } from "lucide-react";

import ConfirmDialog from "@/components/ui/confirm-dialog";

interface WorkflowDeleteSelectedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  deleting: boolean;
  onConfirm: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export default function WorkflowDeleteSelectedDialog({
  open,
  onOpenChange,
  count,
  deleting,
  onConfirm,
  t,
}: WorkflowDeleteSelectedDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      tone="danger"
      icon={Trash2}
      title={t("wf.deleteSelectedTitle")}
      description={t("wf.deleteSelectedDesc", { count })}
      cancelLabel={t("common.cancel")}
      confirmLabel={deleting ? t("wf.deleting") : t("wf.deleteSelected", { count })}
      loading={deleting}
      onConfirm={onConfirm}
    />
  );
}
