import { ArrowLeft, CheckCircle2, LoaderCircle } from "lucide-react";

import AppDialog from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FORM_ID = "workflow-edit-form";

interface WorkflowEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  description: string;
  saving: boolean;
  error: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSaveClose: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export default function WorkflowEditDialog({
  open,
  onOpenChange,
  name,
  description,
  saving,
  error,
  onNameChange,
  onDescriptionChange,
  onSaveClose,
  onCancel,
  t,
}: WorkflowEditDialogProps) {
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      eyebrow={t("wf.editEyebrow")}
      title={t("wf.editHeading")}
      description={t("wf.editDescription")}
      icon={ArrowLeft}
      size="lg"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={onCancel}
            className="h-9 px-3.5 text-[13px]"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={saving || !name.trim()}
            className="h-9 px-3.5 text-[13px]"
          >
            {saving ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <CheckCircle2 />
            )}
            {saving ? t("wf.saving") : t("wf.saveChanges")}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={onSaveClose} className="space-y-5">
        {error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive"
          >
            {error}
          </p>
        ) : null}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name" className="text-xs text-muted-foreground">
              {t("wf.nameLabel")}
            </Label>
            <Input
              id="edit-name"
              required
              maxLength={255}
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="edit-description"
              className="text-xs text-muted-foreground"
            >
              {t("wf.descriptionLabel")}{" "}
              <span className="font-normal text-muted-foreground/70">
                {t("wf.optional")}
              </span>
            </Label>
            <Textarea
              id="edit-description"
              rows={4}
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder={t("wf.descriptionPlaceholder")}
              className="resize-none"
            />
          </div>
        </div>
      </form>
    </AppDialog>
  );
}
