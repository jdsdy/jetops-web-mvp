"use client";

import { useActionState } from "react";

import { setPasswordForInvitedUser } from "@/app/actions/auth";
import {
  simpleFormAlertErrorClassName,
  simpleFormFieldClassName,
  simpleFormFieldGroupClassName,
  simpleFormLabelClassName,
  simpleFormSubmitClassName,
} from "@/components/simple-form-styles";

type FormState = {
  error?: string;
};

const initialState: FormState = {};

export function SetPasswordForm() {
  const [state, action, pending] = useActionState(setPasswordForInvitedUser, initialState);

  return (
    <form action={action} className="mt-8 space-y-4">
      <div className={simpleFormFieldGroupClassName}>
        <label htmlFor="password" className={simpleFormLabelClassName}>
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={simpleFormFieldClassName}
        />
      </div>

      <div className={simpleFormFieldGroupClassName}>
        <label htmlFor="confirm_password" className={simpleFormLabelClassName}>
          Confirm password
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={simpleFormFieldClassName}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className={simpleFormSubmitClassName}
      >
        {pending ? "Saving..." : "Continue"}
      </button>

      {state.error ? (
        <p role="alert" className={`mt-4 ${simpleFormAlertErrorClassName}`}>
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

