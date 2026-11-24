import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TableColumn {
  key: string;
  label: string;
  width?: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
}

interface TableContainerProps {
  children: ReactNode;
  className?: string;
}

export function TableContainer({
  children,
  className,
}: TableContainerProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card/90 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface TableWrapperProps {
  children: ReactNode;
}

export function TableWrapper({ children }: TableWrapperProps) {
  return <div className="overflow-x-auto">{children}</div>;
}

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <table
      className={cn("w-full min-w-full border-collapse text-left", className)}
    >
      {children}
    </table>
  );
}

interface TheadProps {
  children: ReactNode;
}

export function Thead({ children }: TheadProps) {
  return <thead className="border-b border-border bg-muted/30 sticky top-0 z-10">{children}</thead>;
}

interface TrProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Tr({ children, className, onClick }: TrProps) {
  return (
    <tr
      className={cn(
        "border-b border-border/60 transition-colors last:border-b-0",
        onClick && "cursor-pointer hover:bg-muted/35",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

interface ThProps {
  children: ReactNode;
  className?: string;
}

export function Th({ children, className }: ThProps) {
  return (
    <th
      className={cn(
        "px-3.5 py-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase whitespace-nowrap",
        className,
      )}
    >
      {children}
    </th>
  );
}

interface TbodyProps {
  children: ReactNode;
}

export function Tbody({ children }: TbodyProps) {
  return <tbody>{children}</tbody>;
}

interface TdProps {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}

export function Td({ children, className, colSpan }: TdProps) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "px-3.5 py-3 align-middle text-[13px] text-foreground font-normal",
        className,
      )}
    >
      {children}
    </td>
  );
}
