"use client";

import { useCallback, useEffect, useState } from "react";

import type { OrganisationMember } from "@/lib/organisation";

type UserManagementProps = {
  slug: string;
  currentUserId: string;
};

type PendingInvite = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
};

type ApiErrorResponse = {
  error?: string;
};

/**
 * Admin controls for organisation members and pending invites.
 */
export function UserManagement({ slug, currentUserId }: UserManagementProps) {
  const [members, setMembers] = useState<OrganisationMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [roleDrafts, setRoleDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [invitePending, setInvitePending] = useState(false);
  const [memberPendingId, setMemberPendingId] = useState<number | null>(null);
  const [invitePendingId, setInvitePendingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [membersResponse, invitesResponse] = await Promise.all([
      fetch(`/api/organisations/${slug}/members`),
      fetch(`/api/organisations/${slug}/invites`),
    ]);

    const membersResult = (await membersResponse.json()) as
      | OrganisationMember[]
      | ApiErrorResponse;
    const invitesResult = (await invitesResponse.json()) as
      | PendingInvite[]
      | ApiErrorResponse;

    if (!membersResponse.ok) {
      setError(
        "error" in membersResult
          ? (membersResult.error ?? "Failed to load members")
          : "Failed to load members",
      );
      setLoading(false);
      return;
    }

    if (!invitesResponse.ok) {
      setError(
        "error" in invitesResult
          ? (invitesResult.error ?? "Failed to load invites")
          : "Failed to load invites",
      );
      setLoading(false);
      return;
    }

    const nextMembers = Array.isArray(membersResult) ? membersResult : [];
    setMembers(nextMembers);
    setRoleDrafts(
      Object.fromEntries(nextMembers.map((member) => [member.id, member.role])),
    );
    setInvites(Array.isArray(invitesResult) ? invitesResult : []);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleInviteSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInvitePending(true);
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/organisations/${slug}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        f_name: formData.get("f_name"),
        l_initial: formData.get("l_initial"),
        role: formData.get("role"),
      }),
    });

    const result = (await response.json()) as ApiErrorResponse & { email?: string };

    if (!response.ok) {
      setError(result.error ?? "Failed to send invite");
      setInvitePending(false);
      return;
    }

    setMessage(`Invite sent to ${result.email ?? "the user"}.`);
    event.currentTarget.reset();
    setInvitePending(false);
    await loadData();
  }

  async function handleRoleSave(memberId: number) {
    setMemberPendingId(memberId);
    setError(null);
    setMessage(null);

    const response = await fetch(
      `/api/organisations/${slug}/members/${memberId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: roleDrafts[memberId] }),
      },
    );

    const result = (await response.json()) as ApiErrorResponse;

    if (!response.ok) {
      setError(result.error ?? "Failed to update role");
      setMemberPendingId(null);
      return;
    }

    setMessage("Member role updated.");
    setMemberPendingId(null);
    await loadData();
  }

  async function handleAdminToggle(member: OrganisationMember) {
    setMemberPendingId(member.id);
    setError(null);
    setMessage(null);

    const response = await fetch(
      `/api/organisations/${slug}/members/${member.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_admin: !member.is_admin }),
      },
    );

    const result = (await response.json()) as ApiErrorResponse;

    if (!response.ok) {
      setError(result.error ?? "Failed to update admin status");
      setMemberPendingId(null);
      return;
    }

    setMessage("Member admin status updated.");
    setMemberPendingId(null);
    await loadData();
  }

  async function handleDeactivate(memberId: number) {
    setMemberPendingId(memberId);
    setError(null);
    setMessage(null);

    const response = await fetch(
      `/api/organisations/${slug}/members/${memberId}`,
      {
        method: "DELETE",
      },
    );

    const result = (await response.json()) as ApiErrorResponse;

    if (!response.ok) {
      setError(result.error ?? "Failed to deactivate member");
      setMemberPendingId(null);
      return;
    }

    setMessage("Member deactivated.");
    setMemberPendingId(null);
    await loadData();
  }

  async function handleCancelInvite(inviteId: string) {
    setInvitePendingId(inviteId);
    setError(null);
    setMessage(null);

    const response = await fetch(
      `/api/organisations/${slug}/invites/${inviteId}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      const result = (await response.json()) as ApiErrorResponse;
      setError(result.error ?? "Failed to cancel invite");
      setInvitePendingId(null);
      return;
    }

    setMessage("Invite cancelled.");
    setInvitePendingId(null);
    await loadData();
  }

  if (loading) {
    return <p>Loading user management...</p>;
  }

  return (
    <section>
      <h2>User management</h2>

      {error ? <p role="alert">{error}</p> : null}
      {message ? <p>{message}</p> : null}

      <section>
        <h3>Active members</h3>

        {members.length === 0 ? (
          <p>No active members found.</p>
        ) : (
          <ul>
            {members.map((member) => (
              <li key={member.id}>
                <span>{member.display_name ?? "Unknown member"}</span>
                <span> — </span>
                <input
                  aria-label={`Role for ${member.display_name ?? "member"}`}
                  value={roleDrafts[member.id] ?? member.role}
                  onChange={(event) =>
                    setRoleDrafts((current) => ({
                      ...current,
                      [member.id]: event.target.value,
                    }))
                  }
                />
                <button
                  type="button"
                  disabled={memberPendingId === member.id}
                  onClick={() => void handleRoleSave(member.id)}
                >
                  Save role
                </button>
                <label>
                  <input
                    type="checkbox"
                    checked={member.is_admin}
                    disabled={
                      memberPendingId === member.id ||
                      member.user_id === currentUserId
                    }
                    onChange={() => void handleAdminToggle(member)}
                  />
                  Admin
                </label>
                <button
                  type="button"
                  disabled={
                    memberPendingId === member.id ||
                    member.user_id === currentUserId
                  }
                  onClick={() => void handleDeactivate(member.id)}
                >
                  Deactivate
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>Pending invites</h3>

        {invites.length === 0 ? (
          <p>No pending invites.</p>
        ) : (
          <ul>
            {invites.map((invite) => (
              <li key={invite.id}>
                <span>{invite.email}</span>
                <span> — {invite.role}</span>
                <span> — expires {new Date(invite.expires_at).toLocaleString()}</span>
                <button
                  type="button"
                  disabled={invitePendingId === invite.id}
                  onClick={() => void handleCancelInvite(invite.id)}
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>Invite member</h3>

        <form onSubmit={handleInviteSubmit}>
          <div>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required />
          </div>

          <div>
            <label htmlFor="f_name">First name</label>
            <input id="f_name" name="f_name" type="text" required />
          </div>

          <div>
            <label htmlFor="l_initial">Last name initial</label>
            <input id="l_initial" name="l_initial" type="text" maxLength={1} required />
          </div>

          <div>
            <label htmlFor="role">Role</label>
            <input id="role" name="role" type="text" required />
          </div>

          <button type="submit" disabled={invitePending}>
            Invite
          </button>
        </form>
      </section>
    </section>
  );
}
