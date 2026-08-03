import { clsx } from "clsx";

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={clsx("w-full", className)}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className }: TableProps) {
  return (
    <thead className={clsx("bg-pearl/50", className)}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className }: TableProps) {
  return (
    <tbody className={clsx("divide-y divide-silver", className)}>
      {children}
    </tbody>
  );
}

export function TableRow({
  children,
  className,
}: TableProps) {
  return (
    <tr
      className={clsx(
        "hover:bg-pearl/50 transition-colors",
        className
      )}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  children,
  className,
}: TableProps) {
  return (
    <th
      className={clsx(
        "px-6 py-3 text-left text-xs font-semibold text-stone uppercase tracking-wider",
        className
      )}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className,
}: TableProps) {
  return (
    <td className={clsx("px-6 py-4 text-sm text-obsidian", className)}>
      {children}
    </td>
  );
}
