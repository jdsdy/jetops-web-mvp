import { TableSkeleton } from "@/components/table-skeleton";

/**
 * Route transition skeleton for personal portal sections.
 */
export default function PersonalPortalLoading() {
  return <TableSkeleton columns={5} rows={6} />;
}
