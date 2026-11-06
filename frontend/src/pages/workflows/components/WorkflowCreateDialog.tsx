import { LoaderCircle, Sparkles } from "lucide-react";

import AppDialog from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FORM_ID = "workflow-create-form";

interface WorkflowCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  description: string;
  creating: boolean;
  error: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  t: (key: string) => string;
}

export default function WorkflowCreateDialog({
  open,
  onOpenChange,
  name,
  description,
  creating,
  error,
  onNameChange,
  onDescriptionChange,
  onSubmit,
  onClose,
  t,
}: WorkflowCreateDialogProps) {
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      eyebrow={t("wf.newAutomation")}
      title={t("wf.createTitle")}
      description={t("wf.createDescription")}
      icon={Sparkles}
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={creating}
            onClick={onClose}
            className="h-9 px-3.5 text-[13px]"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={creating || !name.trim()}
            className="h-9 px-3.5 text-[13px]"
          >
            {creating ? <LoaderCircle className="animate-spin" /> : null}
            {creating ? t("wf.creating") : t("wf.createTitle")}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="create-name" className="text-xs text-muted-foreground">
            {t("wf.nameLabel")}
          </Label>
          <Input
            id="create-name"
            autoFocus
            required
            maxLength={255}
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder={t("wf.createPlaceholder")}
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="create-description"
            className="text-xs text-muted-foreground"
          >
            {t("wf.descriptionLabel")}{" "}
            <span className="font-normal text-muted-foreground/70">
              {t("wf.optional")}
            </span>
          </Label>
          <Textarea
            id="create-description"
            rows={4}
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder={t("wf.createDescriptionPlaceholder")}
            className="resize-none"
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive"
          >
            {error}
          </p>
        ) : null}
      </form>
    </AppDialog>
  );
}
