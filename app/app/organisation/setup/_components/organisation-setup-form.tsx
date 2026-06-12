"use client";

import { useActionState } from "react";

import { createOrganisation } from "@/app/actions/organisation";

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
    <div>
      <h1>Setup organisation</h1>

      <form action={action}>
        <div>
          <label htmlFor="name">Organisation name</label>
          <input id="name" name="name" type="text" required />
        </div>

        <button type="submit" disabled={pending}>
          Create
        </button>
      </form>

      {state.error ? <p role="alert">{state.error}</p> : null}
    </div>
  );
}
