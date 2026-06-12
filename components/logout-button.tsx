"use client";

import { signOut } from "@/app/actions/auth";

/**
 * Button that signs the current user out.
 */
export function LogoutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="text-sm font-medium text-aviation-slate transition-colors hover:text-aviation-navy"
      >
        Sign out
      </button>
    </form>
  );
}
