import { redirect } from "next/navigation";

import { UpdatePasswordForm } from "@/app/auth/update-password/_components/update-password-form";
import { UpdatePasswordGate } from "@/app/auth/update-password/_components/update-password-gate";
import { SimpleFormCard } from "@/components/simple-form-card";
import { SimpleFormPage } from "@/components/simple-form-page";
import {
  hasAuthLinkError,
  INVALID_RESET_LINK_AUTH_ERROR,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Lets a signed-in user choose a new password after opening a reset email link.
 */
export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string;
    error?: string;
    error_code?: string;
  }>;
}) {
  const params = await searchParams;

  if (hasAuthLinkError(params)) {
    redirect(`/auth?error=${INVALID_RESET_LINK_AUTH_ERROR}`);
  }

  if (params.code) {
    redirect(
      `/auth/confirm?next=/auth/update-password&code=${encodeURIComponent(params.code)}`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?error=sign_in_required");
  }

  return (
    <SimpleFormPage>
      <SimpleFormCard
        eyebrow="Account"
        title="Update your password"
        description="Choose a new password to finish resetting your account."
      >
        <UpdatePasswordGate>
          <UpdatePasswordForm />
        </UpdatePasswordGate>
      </SimpleFormCard>
    </SimpleFormPage>
  );
}
