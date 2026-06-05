"use client";

import { useActionState } from "react";

import { completeOnboarding } from "@/app/actions/onboarding";

type OnboardingFormState = {
  error?: string;
};

const initialState: OnboardingFormState = {};

type OnboardingFormProps = {
  accountType: string;
};

/**
 * Collects first name and last name initial during onboarding.
 */
export function OnboardingForm({ accountType }: OnboardingFormProps) {
  const [state, action, pending] = useActionState(completeOnboarding, initialState);

  return (
    <div>
      <h1>Onboarding</h1>
      <p>Account type: {accountType}</p>

      <form action={action}>
        <div>
          <label htmlFor="f_name">First name</label>
          <input id="f_name" name="f_name" type="text" required />
        </div>

        <div>
          <label htmlFor="l_initial">Last name initial</label>
          <input id="l_initial" name="l_initial" type="text" maxLength={1} required />
        </div>

        <button type="submit" disabled={pending}>
          Continue
        </button>
      </form>

      {state.error ? <p role="alert">{state.error}</p> : null}
    </div>
  );
}
