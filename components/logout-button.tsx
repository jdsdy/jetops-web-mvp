"use client";

import { signOut } from "@/app/actions/auth";

/**
 * Button that signs the current user out.
 */
export function LogoutButton() {
  return (
    <form action={signOut}>
      <button type="submit">Logout</button>
    </form>
  );
}
