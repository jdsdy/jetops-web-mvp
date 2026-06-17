"use client";

import { useCallback, useEffect, useState } from "react";

import { Modal } from "@/components/modal";
import { PortalAlerts } from "@/components/portal-alerts";
import { PortalButton } from "@/components/portal-button";
import {
  portalCardClassName,
  portalDesktopOnlyClassName,
  portalFieldClassName,
  portalFieldGroupClassName,
  portalLabelClassName,
  portalLinkClassName,
  portalMobileListClassName,
  portalMobileListItemWithActionsClassName,
  portalTdClassName,
} from "@/components/portal-styles";
import { PortalTable } from "@/components/portal-table";
import { SectionHeader } from "@/components/section-header";
import { TableSkeleton } from "@/components/table-skeleton";
import { formatPortalDateTime } from "@/lib/format";
import type { OrganisationMember } from "@/lib/organisation";

import { MemberNameWithBadge } from "@/app/app/organisation/[organisationId]/_components/member-access-badge";

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
  const [managedMember, setManagedMember] = useState<OrganisationMember | null>(
    null,
  );
  const [manageOpen, setManageOpen] = useState(false);
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

  useEffect(() => {
    if (!manageOpen || !managedMember) {
      return;
    }

    const updated = members.find((member) => member.id === managedMember.id);

    if (
      updated &&
      (updated.is_admin !== managedMember.is_admin ||
        updated.status !== managedMember.status ||
        updated.role !== managedMember.role)
    ) {
      setManagedMember(updated);
    }
  }, [manageOpen, managedMember, members]);

  async function handleInviteSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setInvitePending(true);
    setError(null);
    setMessage(null);

    const formData = new FormData(form);
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
    setInvitePending(false);
    setInviteOpen(false);
    form.reset();
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
    if (manageOpen) {
      closeManageDialog();
    }
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
    if (manageOpen) {
      closeManageDialog();
    }
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
    if (manageOpen) {
      closeManageDialog();
    }
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
    if (manageOpen) {
      closeManageDialog();
    }
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

  function openManageDialog(member: OrganisationMember) {
    setManagedMember(member);
    setRoleDrafts((current) => ({
      ...current,
      [member.id]: current[member.id] ?? member.role,
    }));
    setError(null);
    setMessage(null);
    setManageOpen(true);
  }

  function closeManageDialog() {
    if (memberPendingId) {
      return;
    }

    setManagedMember(null);
    setManageOpen(false);
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
        <TableSkeleton columns={4} rows={6} />
      ) : (
        <>
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Members</h2>

          {members.length === 0 ? (
            <p className="mb-8 text-sm text-aviation-slate">No members found.</p>
          ) : (
            <>
              <ul className={`mb-8 ${portalMobileListClassName}`}>
                {members.map((member) => (
                  <li
                    key={member.id}
                    className={portalMobileListItemWithActionsClassName}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900">
                        <MemberNameWithBadge member={member} />
                      </p>
                      <p className="mt-1 text-sm text-aviation-slate">
                        {member.role}
                        {member.status === "disabled" ? " · Disabled" : null}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openManageDialog(member)}
                      className={`${portalLinkClassName} shrink-0`}
                    >
                      Manage
                    </button>
                  </li>
                ))}
              </ul>

              <div className={`mb-8 ${portalDesktopOnlyClassName}`}>
                <PortalTable columns={["Name", "Status", "Role", "Actions"]}>
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-neutral-50">
                      <td className={portalTdClassName}>
                        <MemberNameWithBadge member={member} />
                      </td>
                      <td className={portalTdClassName}>{member.status}</td>
                      <td className={portalTdClassName}>{member.role}</td>
                      <td className={portalTdClassName}>
                        <button
                          type="button"
                          onClick={() => openManageDialog(member)}
                          className={portalLinkClassName}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </PortalTable>
              </div>
            </>
          )}

          <h2 className="mb-3 text-sm font-semibold text-neutral-900">
            Pending invites
          </h2>

          {invites.length === 0 ? (
            <p className="text-sm text-aviation-slate">No pending invites.</p>
          ) : (
            <>
              <ul className={portalMobileListClassName}>
                {invites.map((invite) => (
                  <li
                    key={invite.id}
                    className={portalMobileListItemWithActionsClassName}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900">{invite.email}</p>
                      <p className="mt-1 text-sm text-aviation-slate">
                        {invite.role}
                      </p>
                      <p className="mt-1 text-sm text-aviation-slate">
                        Expires {formatPortalDateTime(invite.expires_at)}
                      </p>
                    </div>
                    <PortalButton
                      variant="secondary"
                      disabled={invitePendingId === invite.id}
                      onClick={() => void handleCancelInvite(invite.id)}
                    >
                      Cancel
                    </PortalButton>
                  </li>
                ))}
              </ul>

              <div className={portalDesktopOnlyClassName}>
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
              </div>
            </>
          )}
        </>
      )}

      <Modal
        open={manageOpen}
        onClose={closeManageDialog}
        title="Manage member"
        footer={
          <PortalButton
            variant="secondary"
            disabled={Boolean(
              managedMember && memberPendingId === managedMember.id,
            )}
            onClick={closeManageDialog}
          >
            Close
          </PortalButton>
        }
      >
        {managedMember ? (
          <div className="space-y-4">
            <p className="text-sm text-aviation-slate">
              <MemberNameWithBadge member={managedMember} />
            </p>

            <div className={portalFieldGroupClassName}>
              <span className={portalLabelClassName}>Status</span>
              <p className="text-sm text-neutral-900">{managedMember.status}</p>
            </div>

            {managedMember.status === "disabled" ? (
              <div className={portalFieldGroupClassName}>
                <span className={portalLabelClassName}>Role</span>
                <p className="text-sm text-neutral-900">{managedMember.role}</p>
              </div>
            ) : (
              <>
                <div className={portalFieldGroupClassName}>
                  <label
                    htmlFor={`manage-role-${managedMember.id}`}
                    className={portalLabelClassName}
                  >
                    Role
                  </label>
                  <input
                    id={`manage-role-${managedMember.id}`}
                    aria-label={`Role for ${managedMember.display_name ?? "member"}`}
                    value={roleDrafts[managedMember.id] ?? managedMember.role}
                    onChange={(event) =>
                      setRoleDrafts((current) => ({
                        ...current,
                        [managedMember.id]: event.target.value,
                      }))
                    }
                    className={portalFieldClassName}
                  />
                </div>

                <div className={portalFieldGroupClassName}>
                  <label
                    htmlFor={`manage-admin-${managedMember.id}`}
                    className={portalLabelClassName}
                  >
                    <input
                      id={`manage-admin-${managedMember.id}`}
                      type="checkbox"
                      checked={managedMember.is_admin}
                      disabled={
                        memberPendingId === managedMember.id ||
                        managedMember.user_id === currentUserId ||
                        managedMember.is_owner
                      }
                      onChange={() => void handleAdminToggle(managedMember)}
                      className="mr-2"
                    />
                    Organisation admin
                  </label>
                </div>
              </>
            )}

            <div className="flex flex-col gap-2 pt-2">
              {managedMember.status === "disabled" ? (
                <PortalButton
                  disabled={memberPendingId === managedMember.id}
                  onClick={() => void handleEnable(managedMember.id)}
                >
                  {memberPendingId === managedMember.id
                    ? "Enabling..."
                    : "Enable member"}
                </PortalButton>
              ) : (
                <>
                  <PortalButton
                    disabled={memberPendingId === managedMember.id}
                    onClick={() => void handleRoleSave(managedMember.id)}
                  >
                    {memberPendingId === managedMember.id
                      ? "Saving..."
                      : "Save role"}
                  </PortalButton>
                  <PortalButton
                    variant="secondary"
                    disabled={
                      memberPendingId === managedMember.id ||
                      managedMember.user_id === currentUserId ||
                      managedMember.is_owner
                    }
                    onClick={() => void handleDeactivate(managedMember.id)}
                  >
                    Deactivate member
                  </PortalButton>
                  {currentUserIsOwner && !managedMember.is_owner ? (
                    <PortalButton
                      variant="secondary"
                      disabled={memberPendingId === managedMember.id}
                      onClick={() =>
                        void handleTransferOwnership(managedMember.id)
                      }
                    >
                      Transfer ownership
                    </PortalButton>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

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
