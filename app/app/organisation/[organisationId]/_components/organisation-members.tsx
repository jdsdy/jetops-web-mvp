import { PortalTable } from "@/components/portal-table";
import {
  portalDesktopOnlyClassName,
  portalMobileListClassName,
  portalMobileListItemClassName,
  portalTdClassName,
} from "@/components/portal-styles";
import type { OrganisationMember } from "@/lib/organisation";

import { MemberNameWithBadge } from "@/app/app/organisation/[organisationId]/_components/member-access-badge";

type OrganisationMembersProps = {
  members: OrganisationMember[];
};

/**
 * Read-only list of organisation members.
 */
export function OrganisationMembers({ members }: OrganisationMembersProps) {
  if (members.length === 0) {
    return <p className="text-sm text-aviation-slate">No members found.</p>;
  }

  return (
    <>
      <ul className={portalMobileListClassName}>
        {members.map((member) => (
          <li key={member.id} className={portalMobileListItemClassName}>
            <p className="font-medium text-neutral-900">
              <MemberNameWithBadge member={member} />
            </p>
            <p className="mt-1 text-sm text-aviation-slate">{member.role}</p>
          </li>
        ))}
      </ul>

      <div className={portalDesktopOnlyClassName}>
        <PortalTable columns={["Name", "Role"]}>
          {members.map((member) => (
            <tr key={member.id} className="hover:bg-neutral-50">
              <td className={portalTdClassName}>
                <MemberNameWithBadge member={member} />
              </td>
              <td className={portalTdClassName}>{member.role}</td>
            </tr>
          ))}
        </PortalTable>
      </div>
    </>
  );
}
