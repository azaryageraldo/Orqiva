import {
  CheckCircle2,
  CircleDashed,
  Handshake,
  LoaderCircle,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import type { ExecutionStatus } from "../services/stats";

const EXECUTION_STATUS_META: Record<
  ExecutionStatus,
  { labelKey: string; className: string; icon: typeof CheckCircle2 }
> = {
  success: {
    labelKey: "dashboard.status.success",
    className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    icon: CheckCircle2,
  },
  failed: {
    labelKey: "dashboard.status.failed",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
    icon: XCircle,
  },
  waiting: {
    labelKey: "dashboard.status.waiting",
    className: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    icon: CircleDashed,
  },
  running: {
    labelKey: "dashboard.status.running",
    className: "border-primary/30 bg-primary/10 text-primary",
    icon: LoaderCircle,
  },
  escalated: {
    labelKey: "dashboard.status.escalated",
    className: "border-teal-400/30 bg-teal-400/10 text-teal-300",
    icon: Handshake,
  },
};

export default function ExecutionStatusBadge({
  status,
}: {
  status: ExecutionStatus;
}) {
  const { t } = useI18n();
  const meta = EXECUTION_STATUS_META[status];
  const Icon = meta.icon;

  return (
    <Badge
      variant="outline"
      className={`h-6 shrink-0 px-2.5 ${meta.className}`}
    >
      <Icon className="size-3" />
      {t(meta.labelKey)}
    </Badge>
  );
}
