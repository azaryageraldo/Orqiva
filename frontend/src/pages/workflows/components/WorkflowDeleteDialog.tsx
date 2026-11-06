import { Trash2 } from "lucide-react";

import ConfirmDialog from "@/components/ui/confirm-dialog";

interface WorkflowDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowName: string;
  deleting: boolean;
  onConfirm: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export default function WorkflowDeleteDialog({
  open,
  onOpenChange,
  workflowName,
  deleting,
  onConfirm,
  t,
}: WorkflowDeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      tone="danger"
      icon={Trash2}
      title={t("wf.deleteQuestion")}
      description={t("wf.deleteDescription", { name: workflowName })}
      cancelLabel={t("common.cancel")}
      confirmLabel={deleting ? t("wf.deleting") : t("wf.deleteAction")}
      loading={deleting}
      onConfirm={onConfirm}
    />
  );
}
