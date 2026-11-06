import { useI18n } from "@/lib/i18n";
import { getSmoothStepPath, type EdgeProps } from "@xyflow/react";

const EDGE_CHIPS: Record<string, string> = {
  true: "border-emerald-400/40 bg-card text-emerald-300",
  false: "border-rose-400/40 bg-card text-rose-300",
};

const EDGE_LABELS: Record<string, string> = {
  true: "editor.ifMatch",
  false: "editor.else",
};

/**
 * Solid flow edge with optional condition branch labels (If match / Else).
 * Edges are always solid — dash animation removed.
 */
export default function FlowEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  sourceHandleId,
}: EdgeProps) {
  const { t } = useI18n();
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 18,
  });

  const branch = sourceHandleId ?? "";
  const stroke =
    branch === "true"
      ? "#34d399"
      : branch === "false"
        ? "#fb7185"
        : "var(--primary)";
  const labelKey = EDGE_LABELS[branch];
  const label = labelKey ? t(labelKey) : undefined;

  return (
    <>
      <path
        d={path}
        fill="none"
        style={{ stroke }}
        strokeWidth={6}
        strokeLinecap="round"
        opacity={0.1}
      />
      <path
        d={path}
        fill="none"
        style={{ stroke }}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {label && (
        <span
          className={`absolute rounded-full border px-2 py-0.5 text-[10px] font-semibold shadow-sm backdrop-blur z-10 ${
            EDGE_CHIPS[branch]
          }`}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 13}px)`,
          }}
        >
          {label}
        </span>
      )}
    </>
  );
}
