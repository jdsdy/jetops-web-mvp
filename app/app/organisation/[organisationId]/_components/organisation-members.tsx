import { PortalTable } from "@/components/portal-table";
import { portalTdClassName } from "@/components/portal-styles";
import type { OrganisationMember } from "@/lib/organisation";

type OrganisationMembersProps = {
  members: OrganisationMember[];
};

/**
 * Read-only table of organisation members.
 */
export function OrganisationMembers({ members }: OrganisationMembersProps) {
  if (members.length === 0) {
    return <p className="text-sm text-aviation-slate">No members found.</p>;
  }

  return (
    <PortalTable columns={["Name", "Role", "Access"]}>
      {members.map((member) => (
        <tr key={member.id} className="hover:bg-neutral-50">
          <td className={portalTdClassName}>
            {member.display_name ?? "Unknown member"}
          </td>
          <td className={portalTdClassName}>{member.role}</td>
          <td className={portalTdClassName}>
            {member.is_owner ? "Owner" : member.is_admin ? "Admin" : "Member"}
          </td>
        </tr>
      ))}
    </PortalTable>
  );
}
