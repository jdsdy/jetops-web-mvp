import { AcceptInviteError } from "@/app/auth/accept-invite/_components/accept-invite-error";
import { AcceptInviteHandler } from "@/app/auth/accept-invite/_components/accept-invite-handler";

type AcceptInvitePageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function AcceptInvitePage({ searchParams }: AcceptInvitePageProps) {
  const { token } = await searchParams;

  if (!token?.trim()) {
    return <AcceptInviteError />;
  }

  return <AcceptInviteHandler token={token.trim()} />;
}
