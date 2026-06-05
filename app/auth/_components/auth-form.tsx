"use client";

import { useActionState, useState } from "react";

import { signInWithPassword, signUp } from "@/app/actions/auth";
import { ACCOUNT_TYPES } from "@/lib/auth";

type AuthFormState = {
  error?: string;
  message?: string;
};

const initialState: AuthFormState = {};

/**
 * Combined login and signup form for the auth page.
 */
export function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState(
    signInWithPassword,
    initialState,
  );
  const [signupState, signupAction, signupPending] = useActionState(
    signUp,
    initialState,
  );

  const isSignup = mode === "signup";
  const state = isSignup ? signupState : loginState;
  const action = isSignup ? signupAction : loginAction;
  const pending = isSignup ? signupPending : loginPending;

  return (
    <div>
      <h1>{isSignup ? "Create account" : "Login"}</h1>

      <form action={action}>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required />
        </div>

        {isSignup ? (
          <div>
            <label htmlFor="account_type">Account type</label>
            <select id="account_type" name="account_type" required>
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <button type="submit" disabled={pending}>
          {isSignup ? "Create account" : "Login"}
        </button>
      </form>

      {state.error ? <p role="alert">{state.error}</p> : null}
      {state.message ? <p>{state.message}</p> : null}

      <p>
        {isSignup ? (
          <>
            Already have an account?{" "}
            <button type="button" onClick={() => setMode("login")}>
              Login
            </button>
          </>
        ) : (
          <>
            Need an account?{" "}
            <button type="button" onClick={() => setMode("signup")}>
              Create an account
            </button>
          </>
        )}
      </p>
    </div>
  );
}
