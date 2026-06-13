import { AuthForm } from "@/app/auth/_components/auth-form";
import { LandingFooter } from "@/components/landing-footer";
import { LandingHeader } from "@/components/landing-header";
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
    <>
      <LandingHeader />

      <main className="flex flex-1 items-center justify-center bg-neutral-50 px-6 py-12">
        <div className="w-full max-w-md">
          <AuthForm initialError={initialError} />
        </div>
      </main>

      <LandingFooter />
    </>
  );
}
