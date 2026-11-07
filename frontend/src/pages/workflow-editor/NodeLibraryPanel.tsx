"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Plus, Search, Sparkles, X } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { ScrollArea } from "@/components/ui/scroll-area";

import { LIBRARY_GROUPS, NODE_STYLES, nodeOptions } from "./nodeMeta";
import type { NodeKind } from "./types";

type LibraryStep = "categories" | "items";

export interface NodeLibraryPanelProps {
  open: boolean;
  onClose: () => void;
  onAdd: (label: NodeKind, parentNodeId: string | null) => void;
  parentNodeId: string | null;
}

/**
 * Modern, consistent component library slide-over.
 * - Categorized step-by-step view or instant search.
 * - Visual language (icons, colors, badges, accents) is 100% unified with AutomationNode.
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
  const [search, setSearch] = useState("");

  const handleClose = () => {
    setStep("categories");
    setCategory(null);
    setSearch("");
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

  const handleAddNode = (label: NodeKind) => {
    onAdd(label, parentNodeId);
    setSearch("");
  };

  const currentGroup = category
    ? LIBRARY_GROUPS.find((g) => g.key === category)
    : null;

  const filteredNodes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return nodeOptions.filter((item) => {
      const labelMatch = item.label.toLowerCase().includes(query);
      const descMatch = t(item.descriptionKey).toLowerCase().includes(query);
      return labelMatch || descMatch;
    });
  }, [search, t]);

  const isSearching = search.trim().length > 0;

  return (
    <aside
      className={`absolute inset-y-0 right-0 z-30 flex flex-col w-[380px] max-w-[92vw] border-l border-border bg-card/95 backdrop-blur-xl shadow-2xl transition-transform duration-300 ease-in-out ${
        open ? "translate-x-0" : "translate-x-full pointer-events-none"
      }`}
      aria-label={t("editor.addComponent")}
    >
      {/* Panel Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/80 px-5 py-4">
        <div className="min-w-0 flex-1">
          {isSearching ? (
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {t("editor.allComponents")}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("editor.componentCount", { count: filteredNodes.length })}
              </p>
            </div>
          ) : step === "categories" ? (
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Sparkles size={17} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {t("editor.addComponent")}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("editor.chooseStep")}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={goBack}
                className="group -ml-1 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
              >
                <ArrowLeft
                  size={13}
                  className="transition group-hover:-translate-x-0.5"
                />
                <span>{t("editor.libraryBack")}</span>
              </button>
              <div className="mt-1 flex items-center gap-2">
                {currentGroup && (
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-lg ring-1 ${currentGroup.tone}`}
                  >
                    <currentGroup.icon size={13} weight="duotone" />
                  </span>
                )}
                <h2 className="truncate text-sm font-semibold text-foreground">
                  {currentGroup ? t(currentGroup.titleKey) : ""}
                </h2>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleClose}
          aria-label={t("editor.closeLibrary")}
          className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="border-b border-border/50 px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("editor.searchComponents")}
            className="w-full rounded-lg border border-border/70 bg-background/60 py-2 pr-8 pl-8 text-xs text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Panel Body */}
      <ScrollArea className="h-full px-4 py-3">
        {isSearching ? (
          /* Search Results */
          <div className="space-y-2.5">
            {filteredNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="flex size-11 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
                  <Search size={18} />
                </span>
                <p className="mt-3 text-xs font-medium text-foreground">
                  {t("editor.noComponentsFound")}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Coba kata kunci lain
                </p>
              </div>
            ) : (
              filteredNodes.map((option) => {
                const style = NODE_STYLES[option.label];
                const Icon = style.icon;

                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => handleAddNode(option.label)}
                    className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-border/70 bg-card/60 p-3 text-left transition-all hover:border-primary/40 hover:bg-muted/40 hover:shadow-sm"
                  >
                    <span
                      className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${style.accent} opacity-0 transition-opacity group-hover:opacity-100`}
                    />
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-white/10 ${style.tile} transition-transform group-hover:scale-105`}
                    >
                      <Icon size={19} weight="duotone" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-semibold text-foreground">
                          {option.label}
                        </span>
                        <span
                          className={`inline-flex rounded px-1.5 py-0.5 text-[8.5px] font-semibold tracking-wider uppercase ${style.badge}`}
                        >
                          {option.label}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[11px] leading-4 text-muted-foreground">
                        {t(option.descriptionKey)}
                      </p>
                    </div>

                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground transition-all group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                      <Plus size={13} strokeWidth={2.5} />
                    </span>
                  </button>
                );
              })
            )}
          </div>
        ) : step === "categories" ? (
          /* Step 1: Category Cards */
          <div className="space-y-3">
            {LIBRARY_GROUPS.map((group) => {
              const GroupIcon = group.icon;

              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => goToItems(group.key)}
                  className="group relative flex w-full items-center gap-3.5 rounded-xl border border-border/70 bg-card/60 p-3.5 text-left transition-all hover:border-primary/40 hover:bg-muted/30 hover:shadow-sm"
                  aria-label={t(group.titleKey)}
                >
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ${group.tone} transition-transform group-hover:scale-105`}
                  >
                    <GroupIcon size={20} weight="duotone" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
                        {t(group.titleKey)}
                      </p>
                      <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary">
                        {group.labels.length}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                      {t(group.descriptionKey)}
                    </p>
                  </div>

                  <ChevronRight
                    size={15}
                    className="shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary"
                  />
                </button>
              );
            })}
          </div>
        ) : (
          /* Step 2: Component Items in Selected Category */
          <div className="space-y-2.5">
            {currentGroup?.labels.map((label) => {
              const option = nodeOptions.find((item) => item.label === label);
              if (!option) return null;
              const style = NODE_STYLES[label];
              const Icon = style.icon;

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleAddNode(label)}
                  className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-border/70 bg-card/60 p-3 text-left transition-all hover:border-primary/40 hover:bg-muted/40 hover:shadow-sm"
                >
                  {/* Subtle top accent gradient matching the node card on canvas */}
                  <span
                    className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${style.accent} opacity-0 transition-opacity group-hover:opacity-100`}
                  />

                  {/* Icon badge matching AutomationNode styling */}
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-white/10 ${style.tile} transition-transform group-hover:scale-105`}
                  >
                    <Icon size={19} weight="duotone" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-semibold text-foreground">
                        {label}
                      </span>
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[8.5px] font-semibold tracking-wider uppercase ${style.badge}`}
                      >
                        {label}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] leading-4 text-muted-foreground">
                      {t(option.descriptionKey)}
                    </p>
                  </div>

                  {/* Add action indicator */}
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground transition-all group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                    <Plus size={13} strokeWidth={2.5} />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
