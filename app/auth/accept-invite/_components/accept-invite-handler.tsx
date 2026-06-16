"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AcceptInviteError } from "@/app/auth/accept-invite/_components/accept-invite-error";
import { CallbackLoader } from "@/components/callback-loader";

type AcceptInviteHandlerProps = {
  token: string;
};

type HandlerStatus = "loading" | "error";

/**
 * Stores the invite token via API and redirects to sign-in on success.
 */
export function AcceptInviteHandler({ token }: AcceptInviteHandlerProps) {
  const router = useRouter();
  const [status, setStatus] = useState<HandlerStatus>("loading");

  useEffect(() => {
    async function storeInviteCookie() {
      const response = await fetch("/api/invites/store-cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      }).catch(() => null);

      if (!response?.ok) {
        setStatus("error");
        return;
      }

      router.replace("/auth");
    }

    void storeInviteCookie();
  }, [router, token]);

  if (status === "loading") {
    return <CallbackLoader />;
  }

  return <AcceptInviteError />;
}
