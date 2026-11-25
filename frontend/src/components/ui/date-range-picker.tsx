"use client";

import * as React from "react";
import { addMonths, endOfDay, format, startOfDay, subMonths } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  value: { from: Date | null; to: Date | null } | null;
  onChange: (value: { from: Date | null; to: Date | null } | null) => void;
  label?: string;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  label = "Date range",
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<{ from: Date | null; to: Date | null } | null>(value);
  const [hoveredDate, setHoveredDate] = React.useState<Date | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraft(value);
      setHoveredDate(null);
    }
    setOpen(nextOpen);
  };

  const isSelected = (date: Date) => {
    if (!draft?.from || !draft?.to) return false;
    return (
      date >= startOfDay(draft.from) && date <= endOfDay(draft.to)
    );
  };

  const isInRange = (date: Date) => {
    if (!draft?.from || !hoveredDate) return false;
    const start = startOfDay(draft.from);
    const end = endOfDay(draft.to || draft.from);
    const d = startOfDay(date);
    const h = startOfDay(hoveredDate);

    if (d >= start && d <= h) return true;
    if (d >= h && d <= end) return true;
    return false;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handleDateClick = (date: Date) => {
    if (!draft?.from) {
      setDraft({ from: date, to: null });
    } else if (!draft?.to) {
      setDraft({
        from: date < draft.from ? date : draft.from,
        to: date < draft.from ? draft.from : date,
      });
    } else {
      setDraft({ from: date, to: null });
    }
  };

  const handleClear = () => {
    setDraft(null);
    onChange(null);
  };

  const generateMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    const startOffset = firstDay.getDay();
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    const endOffset = 6 - lastDay.getDay();
    for (let i = 1; i <= endOffset; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const monthLabel = format(currentMonth, "MMMM yyyy");

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  const hasValue = Boolean(value?.from);
  const fromDate = value?.from ?? null;
  const toDate = value?.to ?? null;
  const displayValue = fromDate ? (
    <>
      {format(fromDate, "dd MMM")}
      {toDate !== null && <span className="ml-1">— {format(toDate, "dd MMM yyyy")}</span>}
    </>
  ) : (
    <span className="text-muted-foreground">Select dates</span>
  );

  const buttonVariant = hasValue ? "default" : "outline";

  return (
    <div className={cn("relative inline-block", className)}>
      <div className="relative inline-flex items-center gap-1.5 w-full">
        <Button
          type="button"
          variant={buttonVariant}
          className={cn(
            "w-full px-3 py-2 text-left text-[11px] font-medium justify-between gap-2",
            hasValue
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "border border-border hover:bg-muted/40",
          )}
          onClick={() => handleOpenChange(true)}
        >
          <span className="truncate">{displayValue}</span>
          <Calendar className={cn("size-3.5 shrink-0", hasValue ? "text-primary-foreground" : "text-muted-foreground")} />
        </Button>
        {hasValue && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Clear date range"
            className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
              setOpen(false);
            }}
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="w-[300px] p-4 max-h-[450px] overflow-y-auto">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-sm">{label}</SheetTitle>
          </SheetHeader>
          <Separator className="my-2" />

          <div className="flex items-center justify-between mb-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Previous month"
              className="h-7 w-7 p-0 text-muted-foreground hover:bg-muted/40"
              onClick={goToPreviousMonth}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="text-xs font-medium text-foreground">
              {monthLabel}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Next month"
              className="h-7 w-7 p-0 text-muted-foreground hover:bg-muted/40"
              onClick={goToNextMonth}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-[9px] font-medium text-muted-foreground mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {generateMonth(
              currentMonth.getFullYear(),
              currentMonth.getMonth()
            ).map((date) => {
              const selected = isSelected(date);
              const inRange = isInRange(date);
              const today = isToday(date);
              const isSameMonth = date.getMonth() === currentMonth.getMonth();

              return (
                <button
                  key={date.getTime()}
                  type="button"
                  onClick={() => handleDateClick(date)}
                  onMouseEnter={() => setHoveredDate(date)}
                  onMouseLeave={() => setHoveredDate(null)}
                  className={cn(
                    "h-7 w-7 rounded-md text-[10px] transition-colors flex items-center justify-center",
                    !isSameMonth && "text-muted-foreground/30",
                    selected &&
                      "bg-primary text-primary-foreground",
                    inRange && !selected && "bg-primary/10",
                    today && !selected && "ring-1 ring-primary",
                    !selected && !inRange && "hover:bg-muted/40"
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDraft(value);
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
              disabled={!draft?.from || !draft?.to}
            >
              Apply
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
