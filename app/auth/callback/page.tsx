import { Suspense } from "react";

import { AuthCallbackLoader } from "@/app/auth/callback/_components/auth-callback-loader";
import { CallbackLoader } from "@/components/callback-loader";

/**
 * Shows a loader while the email-confirmation code is exchanged for a session.
 */
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackLoader />}>
      <AuthCallbackLoader />
    </Suspense>
  );
}
