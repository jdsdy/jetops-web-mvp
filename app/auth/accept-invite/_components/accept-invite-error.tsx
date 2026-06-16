import Link from "next/link";

import { SimpleFormCard } from "@/components/simple-form-card";
import { SimpleFormPage } from "@/components/simple-form-page";
import {
  simpleFormAlertErrorClassName,
  simpleFormSubmitClassName,
} from "@/components/simple-form-styles";
import { INVITATION_INVALID_MESSAGE } from "@/lib/organisation";

/**
 * Shown when an organisation invite link is missing or no longer valid.
 */
export function AcceptInviteError() {
  return (
    <SimpleFormPage>
      <SimpleFormCard eyebrow="Accept invite" title="Error accepting invite">
        <p role="alert" className={`mt-8 ${simpleFormAlertErrorClassName}`}>
          {INVITATION_INVALID_MESSAGE}
        </p>
        <Link href="/" className={`mt-6 inline-block ${simpleFormSubmitClassName}`}>
          Go to home
        </Link>
      </SimpleFormCard>
    </SimpleFormPage>
  );
}
