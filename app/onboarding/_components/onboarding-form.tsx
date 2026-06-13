"use client";

import { useActionState } from "react";

import { completeOnboarding } from "@/app/actions/auth";
import { SimpleFormCard } from "@/components/simple-form-card";
import {
  simpleFormAlertErrorClassName,
  simpleFormFieldClassName,
  simpleFormFieldGroupClassName,
  simpleFormLabelClassName,
  simpleFormSubmitClassName,
} from "@/components/simple-form-styles";

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
    <SimpleFormCard
      eyebrow="Onboarding"
      title="Complete your profile"
      description={`Account type: ${accountType.charAt(0).toUpperCase() + accountType.slice(1)}`}
    >
      <form action={action} className="mt-8 space-y-4">
        <div className={simpleFormFieldGroupClassName}>
          <label htmlFor="f_name" className={simpleFormLabelClassName}>
            First name
          </label>
          <input
            id="f_name"
            name="f_name"
            type="text"
            autoComplete="given-name"
            required
            className={simpleFormFieldClassName}
          />
        </div>

        <div className={simpleFormFieldGroupClassName}>
          <label htmlFor="l_initial" className={simpleFormLabelClassName}>
            Last name initial
          </label>
          <input
            id="l_initial"
            name="l_initial"
            type="text"
            maxLength={1}
            autoComplete="family-name"
            required
            className={simpleFormFieldClassName}
          />
        </div>

        <button type="submit" disabled={pending} className={simpleFormSubmitClassName}>
          {pending ? "Continuing..." : "Continue"}
        </button>
      </form>

      {state.error ? (
        <p role="alert" className={`mt-4 ${simpleFormAlertErrorClassName}`}>
          {state.error}
        </p>
      ) : null}
    </SimpleFormCard>
  );
}
