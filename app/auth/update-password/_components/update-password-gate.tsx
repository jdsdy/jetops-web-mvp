"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

import { CallbackLoader } from "@/components/callback-loader";
import {
  INVALID_RESET_LINK_AUTH_ERROR,
  parseAuthLinkErrorFromHash,
} from "@/lib/auth";

type UpdatePasswordGateProps = {
  children: React.ReactNode;
};

/**
 * Redirects away when Supabase returns auth link errors in the URL hash.
 */
function UpdatePasswordGateInner({ children }: UpdatePasswordGateProps) {
  const router = useRouter();

  useEffect(() => {
    if (parseAuthLinkErrorFromHash(window.location.hash)) {
      router.replace(`/auth?error=${INVALID_RESET_LINK_AUTH_ERROR}`);
    }
  }, [router]);

  return children;
}

/**
 * Guards the update-password form against expired links sent in URL fragments.
 */
export function UpdatePasswordGate({ children }: UpdatePasswordGateProps) {
  return (
    <Suspense fallback={<CallbackLoader />}>
      <UpdatePasswordGateInner>{children}</UpdatePasswordGateInner>
    </Suspense>
  );
}
