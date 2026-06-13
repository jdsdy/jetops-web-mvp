"use client";

import { useEffect, useState } from "react";

import { acceptInvitation } from "@/app/actions/organisation";
import { SimpleFormCard } from "@/components/simple-form-card";
import {
  simpleFormAlertErrorClassName,
  simpleFormFieldClassName,
  simpleFormFieldGroupClassName,
  simpleFormLabelClassName,
  simpleFormSubmitClassName,
} from "@/components/simple-form-styles";
import {
  hasInviteAuthParams,
  parseInviteUrl,
} from "@/lib/auth";
import {
  INVITATION_INVALID_MESSAGE,
  isInvitationAcceptable,
} from "@/lib/organisation";
import { createClient } from "@/lib/supabase/client";

type InvitationRecord = {
  id: string;
  invited_user_id: string;
  expires_at: string;
  accepted_at: string | null;
};

/**
 * Handles invite token verification, invitation validation, and password setup.
 */
export function AcceptInviteForm() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationRecord | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function initialise() {
      const supabase = createClient();
      const inviteParams = parseInviteUrl(
        window.location.search,
        window.location.hash,
      );

      if (new URLSearchParams(window.location.search).get("error") === "invite_verify_failed") {
        setStatus("error");
        setErrorMessage("This invite link is invalid or has expired.");
        return;
      }

      if (hasInviteAuthParams(inviteParams)) {
        await supabase.auth.signOut();
      }

      if (inviteParams.tokenHash && inviteParams.type === "invite") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: inviteParams.tokenHash,
          type: "invite",
        });

        if (error) {
          setStatus("error");
          setErrorMessage(error.message);
          return;
        }
      } else if (inviteParams.accessToken && inviteParams.refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: inviteParams.accessToken,
          refresh_token: inviteParams.refreshToken,
        });

        if (error) {
          setStatus("error");
          setErrorMessage(error.message);
          return;
        }

        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
      } else if (inviteParams.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(
          inviteParams.code,
        );

        if (error) {
          setStatus("error");
          setErrorMessage(error.message);
          return;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStatus("error");
        setErrorMessage(
          "Sign in with your invite link to continue. Open the link from your invite email in this browser.",
        );
        return;
      }

      const { data: invitationRecord, error: invitationError } = await supabase
        .from("organisation_invitations")
        .select("id, invited_user_id, expires_at, accepted_at")
        .eq("invited_user_id", user.id)
        .is("accepted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (invitationError) {
        setStatus("error");
        setErrorMessage(invitationError.message);
        return;
      }

      if (!invitationRecord || !isInvitationAcceptable(invitationRecord, user.id)) {
        setStatus("error");
        setErrorMessage(INVITATION_INVALID_MESSAGE);
        return;
      }

      setInvitation(invitationRecord);
      setStatus("ready");
    }

    void initialise();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!invitation) {
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const supabase = createClient();
    const { error: passwordError } = await supabase.auth.updateUser({ password });

    if (passwordError) {
      setSubmitting(false);
      setErrorMessage(passwordError.message);
      return;
    }

    const result = await acceptInvitation(invitation.id);

    if (result?.error) {
      setSubmitting(false);
      setErrorMessage(result.error);
    }
  }

  if (status === "loading") {
    return (
      <SimpleFormCard
        eyebrow="Accept invite"
        title="Verifying your invite"
        titleAccent="link."
        description="Please wait while we confirm your invitation."
      >
        <p className="mt-8 text-sm text-aviation-slate">Verifying invite...</p>
      </SimpleFormCard>
    );
  }

  if (status === "error") {
    return (
      <SimpleFormCard
        eyebrow="Accept invite"
        title="Unable to continue"
        titleAccent="with this invite."
      >
        <p role="alert" className={`mt-8 ${simpleFormAlertErrorClassName}`}>
          {errorMessage ?? INVITATION_INVALID_MESSAGE}
        </p>
      </SimpleFormCard>
    );
  }

  return (
    <SimpleFormCard
      title="Set your password"
      description="Create a password for your organisation account."
    >
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className={simpleFormFieldGroupClassName}>
          <label htmlFor="password" className={simpleFormLabelClassName}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={simpleFormFieldClassName}
          />
        </div>

        <div className={simpleFormFieldGroupClassName}>
          <label htmlFor="confirm_password" className={simpleFormLabelClassName}>
            Confirm password
          </label>
          <input
            id="confirm_password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={simpleFormFieldClassName}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={simpleFormSubmitClassName}
        >
          {submitting ? "Continuing..." : "Continue"}
        </button>
      </form>

      {errorMessage ? (
        <p role="alert" className={`mt-4 ${simpleFormAlertErrorClassName}`}>
          {errorMessage}
        </p>
      ) : null}
    </SimpleFormCard>
  );
}
