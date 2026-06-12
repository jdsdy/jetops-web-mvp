import { TableSkeleton } from "@/components/table-skeleton";

/**
 * Route transition skeleton for organisation portal sections.
 */
export default function OrganisationPortalLoading() {
  return <TableSkeleton columns={5} rows={6} />;
}
