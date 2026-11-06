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
        "overflow-hidden rounded-md border border-white/[0.08] bg-[#0e0f12]",
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
  return <thead>{children}</thead>;
}

interface TrProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Tr({ children, className, onClick }: TrProps) {
  return (
    <tr className={className} onClick={onClick}>
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
    <th className={cn("px-3 py-2.5 text-[11px] font-medium whitespace-nowrap text-zinc-500 last:border-r-0", className)}>
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
      className={cn("px-3 py-2.5 align-middle text-[11px] text-zinc-400 last:border-r-0", className)}
    >
      {children}
    </td>
  );
}
