"use client";

import { useActionState } from "react";

import { createOrganisation } from "@/app/actions/organisation";
import { SimpleFormCard } from "@/components/simple-form-card";
import {
  simpleFormAlertErrorClassName,
  simpleFormFieldClassName,
  simpleFormFieldGroupClassName,
  simpleFormLabelClassName,
  simpleFormSubmitClassName,
} from "@/components/simple-form-styles";

type SetupFormState = {
  error?: string;
};

const initialState: SetupFormState = {};

/**
 * Form for creating a new organisation during app setup.
 */
export function OrganisationSetupForm() {
  const [state, action, pending] = useActionState(createOrganisation, initialState);

  return (
    <SimpleFormCard
      eyebrow="Organisation setup"
      title="Create your organisation"
      description="Enter a name for your organisation. You can invite team members after setup."
    >
      <form action={action} className="mt-8 space-y-4">
        <div className={simpleFormFieldGroupClassName}>
          <label htmlFor="name" className={simpleFormLabelClassName}>
            Organisation name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className={simpleFormFieldClassName}
          />
        </div>

        <button type="submit" disabled={pending} className={simpleFormSubmitClassName}>
          {pending ? "Creating..." : "Create organisation"}
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
