import { redirect } from "next/navigation";

/**
 * Legacy entry point; organisation login now resolves via /portal/callback.
 */
export default function OrganisationPortalPage() {
  redirect("/portal/callback");
}
