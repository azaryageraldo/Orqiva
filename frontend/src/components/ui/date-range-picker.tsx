"use client";

import * as React from "react";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
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
  label = "Rentang tanggal",
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [hoveredDate, setHoveredDate] = React.useState<Date | null>(null);

  const isSelected = (date: Date) => {
    if (!value?.from || !value?.to) return false;
    return (
      date >= startOfDay(value.from) && date <= endOfDay(value.to)
    );
  };

  const isInRange = (date: Date) => {
    if (!value?.from || !hoveredDate) return false;
    const start = startOfDay(value.from);
    const end = endOfDay(value.to || value.from);
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
    if (!value?.from) {
      onChange({ from: date, to: null });
    } else if (!value?.to) {
      onChange({
        from: date < value.from ? date : value.from,
        to: date < value.from ? value.from : date,
      });
    } else {
      onChange({ from: date, to: null });
    }
  };

  const handleClear = () => {
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
    setCurrentMonth(subDays(currentMonth, 30));
  };

  const goToNextMonth = () => {
    setCurrentMonth(subDays(currentMonth, -30));
  };

  const hasValue = value && value.from !== null;
  const fromDate = hasValue ? value.from : null;
  const toDate = value?.to ?? null;
  const displayValue = hasValue ? (
    <>
      {format(fromDate!, "dd MMM")}
      {toDate !== null && <span className="ml-1">— {format(toDate, "dd MMM yyyy")}</span>}
    </>
  ) : (
    <span className="text-muted-foreground">Pilih tanggal</span>
  );

  const buttonVariant = hasValue ? "default" : "outline";

  return (
    <div className={cn("relative inline-block", className)}>
      <div className="relative inline-flex items-center gap-2 w-full">
        <Button
          variant={buttonVariant}
          className={cn(
            "w-full px-3 py-2 text-left text-[11px] font-medium",
            hasValue
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "border border-white/10 hover:bg-white/5 hover:text-zinc-200",
          )}
          onClick={() => setOpen(true)}
        >
          {displayValue}
          <Calendar className="mr-2 size-3.5 text-muted-foreground" />
        </Button>
        {hasValue && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 p-0 text-muted-foreground hover:bg-white/10 hover:text-zinc-200"
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
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-[300px] p-4 max-h-[450px] overflow-y-auto">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-sm">{label}</SheetTitle>
          </SheetHeader>
          <Separator className="my-2" />

          <div className="flex items-center justify-between mb-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 p-0 text-muted-foreground hover:bg-white/5"
              onClick={goToPreviousMonth}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="text-xs font-medium text-foreground">
              {monthLabel}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 p-0 text-muted-foreground hover:bg-white/5"
              onClick={goToNextMonth}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-[9px] font-medium text-muted-foreground mb-2">
            {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
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
                  onClick={() => handleDateClick(date)}
                  onMouseEnter={() => setHoveredDate(date)}
                  onMouseLeave={() => setHoveredDate(null)}
                  className={cn(
                    "h-7 w-7 rounded-md text-[10px] transition-colors flex items-center justify-center",
                    !isSameMonth && "text-muted-foreground/30",
                    selected &&
                      "bg-primary text-primary-foreground",
                    inRange && "bg-primary/5",
                    today && !selected && "ring-1 ring-ring ring-primary",
                    !selected && !inRange && "hover:bg-white/5"
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={!value?.from || !value?.to}
            >
              Terapkan
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
