import Skeleton from "react-loading-skeleton";

import { portalThClassName } from "@/components/portal-styles";

type TableSkeletonProps = {
  columns?: number;
  rows?: number;
};

/**
 * Skeleton placeholder matching the organisation portal table layout.
 */
export function TableSkeleton({ columns = 4, rows = 5 }: TableSkeletonProps) {
  return (
    <div className="overflow-x-auto rounded-sm border border-neutral-200 bg-white">
      <table className="min-w-full divide-y divide-neutral-200">
        <thead className="bg-neutral-50">
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index} className={portalThClassName}>
                <Skeleton width={80} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 bg-white">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, columnIndex) => (
                <td key={columnIndex} className="px-4 py-3">
                  <Skeleton />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
