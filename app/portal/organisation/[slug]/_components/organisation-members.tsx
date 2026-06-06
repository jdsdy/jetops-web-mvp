import type { OrganisationMember } from "@/lib/organisation";

type OrganisationMembersProps = {
  members: OrganisationMember[];
};

/**
 * Lists the members belonging to an organisation.
 */
export function OrganisationMembers({ members }: OrganisationMembersProps) {
  return (
    <section>
      <h2>Members</h2>

      {members.length === 0 ? (
        <p>No members found.</p>
      ) : (
        <ul>
          {members.map((member) => (
            <li key={member.id}>
              <span>{member.display_name ?? "Unknown member"}</span>
              <span> — {member.role}</span>
              {member.is_owner ? <span> (owner)</span> : null}
              {member.is_admin ? <span> (admin)</span> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
