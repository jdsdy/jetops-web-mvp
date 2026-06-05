"use client";

import { useState } from "react";

type InviteMemberFormProps = {
  slug: string;
};

type InviteResponse = {
  error?: string;
  email?: string;
};

/**
 * Form for organisation admins to invite new members.
 */
export function InviteMemberForm({ slug }: InviteMemberFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);

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

    const result = (await response.json()) as InviteResponse;

    if (!response.ok) {
      setError(result.error ?? "Failed to send invite");
      setPending(false);
      return;
    }

    setMessage(`Invite sent to ${result.email ?? "the user"}.`);
    event.currentTarget.reset();
    setPending(false);
  }

  return (
    <section>
      <h2>Invite member</h2>

      <form onSubmit={handleSubmit}>
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

        <button type="submit" disabled={pending}>
          Invite
        </button>
      </form>

      {message ? <p>{message}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
