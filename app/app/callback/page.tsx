import { Suspense } from "react";

import { OrganisationCallbackRedirect } from "@/app/app/callback/_components/organisation-callback-redirect";
import { CallbackLoader } from "@/components/callback-loader";

/**
 * Shows a loader while organisation membership is resolved after login.
 */
export default function OrganisationCallbackPage() {
  return (
    <Suspense fallback={<CallbackLoader />}>
      <OrganisationCallbackRedirect />
    </Suspense>
  );
}
