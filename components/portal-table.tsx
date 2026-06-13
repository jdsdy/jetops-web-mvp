import type { ReactNode } from "react";

import {
  portalTableBodyClassName,
  portalTableClassName,
  portalTableHeadClassName,
  portalThClassName,
} from "@/components/portal-styles";

type PortalTableProps = {
  columns: string[];
  children: ReactNode;
};

/**
 * Shared table chrome for organisation portal lists.
 */
export function PortalTable({ columns, children }: PortalTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={portalTableClassName}>
        <thead className={portalTableHeadClassName}>
          <tr>
            {columns.map((column) => (
              <th key={column} className={portalThClassName}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={portalTableBodyClassName}>{children}</tbody>
      </table>
    </div>
  );
}
