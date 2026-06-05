import Link from "next/link";

import { AuthForm } from "@/components/auth-form";

export default function AuthPage() {
  return (
    <main>
      <AuthForm />
      <Link href="/">
        <button type="button">Back to home</button>
      </Link>
    </main>
  );
}
