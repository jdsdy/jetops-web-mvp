"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { CallbackLoader } from "@/components/callback-loader";
import { createClient } from "@/lib/supabase/client";

/**
 * Exchanges the Supabase email-confirmation code and redirects onward.
 */
export function AuthCallbackLoader() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/onboarding";

    if (!code) {
      router.replace("/auth");
      return;
    }

    const supabase = createClient();

    void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      router.replace(error ? "/auth" : next);
    });
  }, [router, searchParams]);

  return <CallbackLoader />;
}
