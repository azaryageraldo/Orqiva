"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { ScrollArea } from "@/components/ui/scroll-area";

import { LIBRARY_GROUPS } from "./nodeMeta";
import { nodeOptions } from "./nodeMeta";
import type { NodeKind } from "./types";

type LibraryStep = "categories" | "items";

export interface NodeLibraryPanelProps {
  open: boolean;
  onClose: () => void;
  onAdd: (label: NodeKind, parentNodeId: string | null) => void;
  parentNodeId: string | null;
}

/**
 * Two-step component library slide-over.
 * Step 1 shows category cards (Add a Trigger / Add an Action / If Else / Condition).
 * Step 2 shows matching components for the chosen category.
 */
export default function NodeLibraryPanel({
  open,
  onClose,
  onAdd,
  parentNodeId,
}: NodeLibraryPanelProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<LibraryStep>("categories");
  const [category, setCategory] = useState<string | null>(null);

  const handleClose = () => {
    setStep("categories");
    setCategory(null);
    onClose();
  };

  const goToItems = (key: string) => {
    setCategory(key);
    setStep("items");
  };

  const goBack = () => {
    setStep("categories");
    setCategory(null);
  };

  const currentGroup = category ? LIBRARY_GROUPS.find((g) => g.key === category) : null;

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 flex flex-col max-w-full transition-transform duration-300 ease-in-out ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-full flex-col overflow-hidden bg-card border-l border-border shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            {step === "categories" ? (
              <>
                <h2 className="text-sm font-semibold text-foreground">
                  {t("editor.addComponent")}
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {t("editor.chooseStep")}
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                  {t("editor.libraryBack")}
                </button>
                <h2 className="mt-1 text-sm font-semibold text-foreground truncate">
                  {currentGroup ? t(currentGroup.titleKey) : ""}
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground truncate">
                  {currentGroup ? t(currentGroup.descriptionKey) : ""}
                </p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label={t("editor.closeLibrary")}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <ScrollArea className="h-full p-4">
          <div className="space-y-5">
            {step === "categories" ? (
              <>
                {LIBRARY_GROUPS.map((group) => (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => goToItems(group.key)}
                    className="flex w-full flex-col gap-3 rounded-xl border px-4 py-4 text-left transition group hover:border-primary/30 hover:bg-primary/[0.03]"
                    aria-label={t(group.titleKey)}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ${group.tone}`}
                      >
                        <group.icon size={18} weight="duotone" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {t(group.titleKey)}
                      </p>
                      <p className="mt-1 truncate text-[10px] leading-4 text-muted-foreground">
                        {t(group.descriptionKey)}
                      </p>
                    </div>
                    <span className="self-end text-xs font-medium text-muted-foreground/60 group-hover:text-primary">
                      {group.labels.length} komponen
                    </span>
                  </button>
                ))}
              </>
            ) : (
              <>
                {currentGroup?.labels.map((label) => {
                  const option = nodeOptions.find((item) => item.label === label);
                  if (!option) return null;
                  const Icon = option.icon;

                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => onAdd(label, parentNodeId)}
                      className="group flex w-full min-w-0 items-center gap-3 rounded-lg border border-border bg-muted/40 p-3 text-left transition hover:border-primary/30 hover:bg-primary/[0.045]"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                        <Icon size={17} weight="duotone" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-foreground">
                          {label}
                        </span>
                        <span className="mt-1 block truncate text-[10px] leading-4 text-muted-foreground">
                          {t(option.descriptionKey)}
                        </span>
                      </span>

                      <span className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <span className="size-3.5 text-[10px] font-bold">+</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
