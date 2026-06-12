import { Suspense } from "react";

import { PortalCallbackRedirect } from "@/app/portal/callback/_components/portal-callback-redirect";
import { CallbackLoader } from "@/components/callback-loader";

/**
 * Shows a loader while organisation membership is resolved after login.
 */
export default function OrganisationPortalCallbackPage() {
  return (
    <Suspense fallback={<CallbackLoader />}>
      <PortalCallbackRedirect />
    </Suspense>
  );
}
