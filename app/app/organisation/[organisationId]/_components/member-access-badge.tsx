import { getMemberAccessBadgeLabel } from "@/lib/organisation";
import type { OrganisationMember } from "@/lib/organisation";

type MemberAccessBadgeProps = {
  member: Pick<OrganisationMember, "is_owner" | "is_admin">;
  className?: string;
};

/**
 * Renders the member access label beside a display name, e.g. (owner).
 */
export function MemberAccessBadge({
  member,
  className = "ml-2 text-xs text-aviation-slate",
}: MemberAccessBadgeProps) {
  return <span className={className}>({getMemberAccessBadgeLabel(member)})</span>;
}

type MemberNameWithBadgeProps = {
  member: OrganisationMember;
};

/**
 * Renders a member display name with their access badge.
 */
export function MemberNameWithBadge({ member }: MemberNameWithBadgeProps) {
  return (
    <>
      {member.display_name ?? "Unknown member"}
      <MemberAccessBadge member={member} />
    </>
  );
}
