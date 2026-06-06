import Link from "next/link";

import { AuthForm } from "@/app/auth/_components/auth-form";
import {
  DISABLED_MEMBER_AUTH_ERROR,
  DISABLED_MEMBER_MESSAGE,
} from "@/lib/auth";

type AuthPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const { error } = await searchParams;
  const initialError =
    error === DISABLED_MEMBER_AUTH_ERROR ? DISABLED_MEMBER_MESSAGE : undefined;

  return (
    <main>
      <AuthForm initialError={initialError} />
      <Link href="/">
        <button type="button">Back to home</button>
      </Link>
    </main>
  );
}
