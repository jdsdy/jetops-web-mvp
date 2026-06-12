"use client";

import { useCallback, useEffect, useState } from "react";

import { Modal } from "@/components/modal";
import { PortalAlerts } from "@/components/portal-alerts";
import { PortalButton } from "@/components/portal-button";
import {
  portalCardClassName,
  portalFieldClassName,
  portalFieldGroupClassName,
  portalLabelClassName,
  portalTdClassName,
} from "@/components/portal-styles";
import { PortalTable } from "@/components/portal-table";
import { SectionHeader } from "@/components/section-header";
import { TableSkeleton } from "@/components/table-skeleton";
import { formatPortalDateTime } from "@/lib/format";
import type { OrganisationMember } from "@/lib/organisation";

type UserManagementProps = {
  organisationId: string;
  currentUserId: string;
  initialMembers?: OrganisationMember[];
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
export function UserManagement({
  organisationId,
  currentUserId,
  initialMembers,
}: UserManagementProps) {
  const [members, setMembers] = useState<OrganisationMember[]>(
    initialMembers ?? [],
  );
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(initialMembers === undefined);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [invitePending, setInvitePending] = useState(false);
  const [memberPendingId, setMemberPendingId] = useState<string | null>(null);
  const [invitePendingId, setInvitePendingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (initialMembers === undefined) {
      setLoading(true);
    }

    setError(null);

    const [membersResponse, invitesResponse] = await Promise.all([
      fetch(`/api/organisations/${organisationId}/members`),
      fetch(`/api/organisations/${organisationId}/invites`),
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
  }, [organisationId, initialMembers]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleInviteSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInvitePending(true);
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/organisations/${organisationId}/invites`, {
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
    setInviteOpen(false);
    await loadData();
  }

  async function handleRoleSave(memberId: string) {
    setMemberPendingId(memberId);
    setError(null);
    setMessage(null);

    const response = await fetch(
      `/api/organisations/${organisationId}/members/${memberId}`,
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
      `/api/organisations/${organisationId}/members/${member.id}`,
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

  async function handleDeactivate(memberId: string) {
    setMemberPendingId(memberId);
    setError(null);
    setMessage(null);

    const response = await fetch(
      `/api/organisations/${organisationId}/members/${memberId}`,
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

  async function handleEnable(memberId: string) {
    setMemberPendingId(memberId);
    setError(null);
    setMessage(null);

    const response = await fetch(
      `/api/organisations/${organisationId}/members/${memberId}`,
      {
        method: "POST",
      },
    );

    const result = (await response.json()) as ApiErrorResponse;

    if (!response.ok) {
      setError(result.error ?? "Failed to enable member");
      setMemberPendingId(null);
      return;
    }

    setMessage("Member enabled.");
    setMemberPendingId(null);
    await loadData();
  }

  async function handleTransferOwnership(memberId: string) {
    setMemberPendingId(memberId);
    setError(null);
    setMessage(null);

    const response = await fetch(
      `/api/organisations/${organisationId}/members/${memberId}/ownership`,
      {
        method: "POST",
      },
    );

    const result = (await response.json()) as ApiErrorResponse;

    if (!response.ok) {
      setError(result.error ?? "Failed to transfer ownership");
      setMemberPendingId(null);
      return;
    }

    setMessage("Ownership transferred.");
    setMemberPendingId(null);
    await loadData();
  }

  async function handleCancelInvite(inviteId: string) {
    setInvitePendingId(inviteId);
    setError(null);
    setMessage(null);

    const response = await fetch(
      `/api/organisations/${organisationId}/invites/${inviteId}`,
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

  const currentUserIsOwner =
    members.find((member) => member.user_id === currentUserId)?.is_owner ?? false;

  return (
    <div className={portalCardClassName}>
      <SectionHeader
        title="Users"
        description="Manage organisation members and pending invites."
        action={
          <PortalButton onClick={() => setInviteOpen(true)}>
            + Invite member
          </PortalButton>
        }
      />

      <PortalAlerts error={error} message={message} />

      {loading ? (
        <TableSkeleton columns={5} rows={6} />
      ) : (
        <>
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Members</h2>

          {members.length === 0 ? (
            <p className="mb-8 text-sm text-aviation-slate">No members found.</p>
          ) : (
            <div className="mb-8">
              <PortalTable
                columns={["Name", "Status", "Role", "Admin", "Actions"]}
              >
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-neutral-50">
                    <td className={portalTdClassName}>
                        {member.display_name ?? "Unknown member"}
                        {member.is_owner ? (
                          <span className="ml-2 text-xs text-aviation-slate">
                            (owner)
                          </span>
                        ) : null}
                      </td>
                    <td className={portalTdClassName}>{member.status}</td>
                    <td className={portalTdClassName}>
                        {member.status === "disabled" ? (
                          member.role
                        ) : (
                          <input
                            aria-label={`Role for ${member.display_name ?? "member"}`}
                            value={roleDrafts[member.id] ?? member.role}
                            onChange={(event) =>
                              setRoleDrafts((current) => ({
                                ...current,
                                [member.id]: event.target.value,
                              }))
                            }
                            className={portalFieldClassName}
                          />
                        )}
                      </td>
                    <td className={portalTdClassName}>
                      {member.status === "disabled" ? (
                        "—"
                      ) : (
                        <input
                          type="checkbox"
                          checked={member.is_admin}
                          disabled={
                            memberPendingId === member.id ||
                            member.user_id === currentUserId ||
                            member.is_owner
                          }
                          onChange={() => void handleAdminToggle(member)}
                        />
                      )}
                    </td>
                    <td className={portalTdClassName}>
                        <div className="flex flex-wrap gap-2">
                          {member.status === "disabled" ? (
                            <PortalButton
                              disabled={memberPendingId === member.id}
                              onClick={() => void handleEnable(member.id)}
                            >
                              Enable
                            </PortalButton>
                          ) : (
                            <>
                              <PortalButton
                                disabled={memberPendingId === member.id}
                                onClick={() => void handleRoleSave(member.id)}
                              >
                                Save role
                              </PortalButton>
                              <PortalButton
                                variant="secondary"
                                disabled={
                                  memberPendingId === member.id ||
                                  member.user_id === currentUserId ||
                                  member.is_owner
                                }
                                onClick={() => void handleDeactivate(member.id)}
                              >
                                Deactivate
                              </PortalButton>
                              {currentUserIsOwner && !member.is_owner ? (
                                <PortalButton
                                  variant="secondary"
                                  disabled={memberPendingId === member.id}
                                  onClick={() =>
                                    void handleTransferOwnership(member.id)
                                  }
                                >
                                  Transfer ownership
                                </PortalButton>
                              ) : null}
                            </>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </PortalTable>
            </div>
          )}

          <h2 className="mb-3 text-sm font-semibold text-neutral-900">
            Pending invites
          </h2>

          {invites.length === 0 ? (
            <p className="text-sm text-aviation-slate">No pending invites.</p>
          ) : (
            <PortalTable columns={["Email", "Role", "Expires", "Actions"]}>
              {invites.map((invite) => (
                <tr key={invite.id} className="hover:bg-neutral-50">
                  <td className={portalTdClassName}>{invite.email}</td>
                  <td className={portalTdClassName}>{invite.role}</td>
                  <td className={portalTdClassName}>
                    {formatPortalDateTime(invite.expires_at)}
                  </td>
                  <td className={portalTdClassName}>
                    <PortalButton
                      variant="secondary"
                      disabled={invitePendingId === invite.id}
                      onClick={() => void handleCancelInvite(invite.id)}
                    >
                      Cancel
                    </PortalButton>
                  </td>
                </tr>
              ))}
            </PortalTable>
          )}
        </>
      )}

      <Modal
        open={inviteOpen}
        onClose={() => {
          if (!invitePending) {
            setInviteOpen(false);
          }
        }}
        title="Invite member"
        footer={
          <>
            <PortalButton
              variant="secondary"
              disabled={invitePending}
              onClick={() => setInviteOpen(false)}
            >
              Cancel
            </PortalButton>
            <PortalButton
              type="submit"
              form="invite-member-form"
              disabled={invitePending}
            >
              {invitePending ? "Sending..." : "Send invite"}
            </PortalButton>
          </>
        }
      >
        <form
          id="invite-member-form"
          onSubmit={handleInviteSubmit}
          className="space-y-4"
        >
          <div className={portalFieldGroupClassName}>
            <label htmlFor="email" className={portalLabelClassName}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className={portalFieldClassName}
            />
          </div>

          <div className={portalFieldGroupClassName}>
            <label htmlFor="f_name" className={portalLabelClassName}>
              First name
            </label>
            <input
              id="f_name"
              name="f_name"
              type="text"
              required
              className={portalFieldClassName}
            />
          </div>

          <div className={portalFieldGroupClassName}>
            <label htmlFor="l_initial" className={portalLabelClassName}>
              Last name initial
            </label>
            <input
              id="l_initial"
              name="l_initial"
              type="text"
              maxLength={1}
              required
              className={portalFieldClassName}
            />
          </div>

          <div className={portalFieldGroupClassName}>
            <label htmlFor="role" className={portalLabelClassName}>
              Role
            </label>
            <input
              id="role"
              name="role"
              type="text"
              required
              className={portalFieldClassName}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
