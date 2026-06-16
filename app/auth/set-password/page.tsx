import { redirect } from "next/navigation";

import { SimpleFormCard } from "@/components/simple-form-card";
import { SimpleFormPage } from "@/components/simple-form-page";

import { SetPasswordForm } from "@/app/auth/set-password/_components/set-password-form";
import { createClient } from "@/lib/supabase/server";

export default async function SetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("has_set_password")
    .eq("id", user.id)
    .single();

  if (profile?.has_set_password !== false) {
    redirect("/app/callback");
  }

  return (
    <SimpleFormPage>
      <SimpleFormCard
        eyebrow="Sign in"
        title="Set a new password"
        description="This is required before you can continue to your organisation workspace."
      >
        <SetPasswordForm />
      </SimpleFormCard>
    </SimpleFormPage>
  );
}

