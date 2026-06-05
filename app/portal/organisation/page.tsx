import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/supabase/server";

export default async function OrganisationPortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <main>
      <h1>/portal/organisation</h1>
      <p>Organisation portal</p>
      <Link href="/app/organisation">
        <button type="button">Go to app/organisation</button>
      </Link>
      <LogoutButton />
    </main>
  );
}
