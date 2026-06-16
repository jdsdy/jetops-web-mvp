"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { signUp } from "@/app/actions/auth";
import { signInClassName } from "@/components/landing-header";
import { ACCOUNT_TYPES } from "@/lib/auth";
import {
  INVITE_EXPIRED_CONTACT_ADMIN_MESSAGE,
  INVITE_TRANSIENT_ERROR_MESSAGE,
} from "@/lib/organisation";
import { createClient } from "@/lib/supabase/client";

type AuthFormProps = {
  initialError?: string;
};

type AuthFormState = {
  error?: string;
  message?: string;
};

const initialState: AuthFormState = {};

const labelClassName = "block text-sm font-medium text-neutral-900";
const fieldClassName =
  "mt-1 block w-full rounded-sm border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-aviation-blue focus:outline-none focus:ring-1 focus:ring-aviation-blue";
const fieldGroupClassName = "space-y-1";

/**
 * Combined login and signup form for the auth page.
 */
export function AuthForm({ initialError }: AuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginError, setLoginError] = useState<string | undefined>(initialError);
  const [loginPending, setLoginPending] = useState(false);
  const [signupState, signupAction, signupPending] = useActionState(
    signUp,
    initialState,
  );

  const isSignup = mode === "signup";
  const state = signupState;
  const pending = isSignup ? signupPending : loginPending;
  const alertMessage = isSignup ? state.error : loginError;

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError(undefined);
    setLoginPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const supabase = createClient();
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setLoginPending(false);
      setLoginError(signInError.message);
      return;
    }

    const accessToken = signInData.session?.access_token;

    if (!accessToken) {
      setLoginPending(false);
      setLoginError("Unable to load user session");
      return;
    }

    try {
      const response = await fetch("/api/invites/consume-cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ access_token: accessToken }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        has_set_password?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        if (response.status === 503) {
          setLoginError(payload.error ?? INVITE_TRANSIENT_ERROR_MESSAGE);
          setLoginPending(false);
          return;
        }

        await supabase.auth.signOut();
        setLoginError(payload.error ?? INVITE_EXPIRED_CONTACT_ADMIN_MESSAGE);
        setLoginPending(false);
        return;
      }

      if (payload.has_set_password === false) {
        router.push("/auth/set-password");
        return;
      }

      router.push("/app/callback");
    } catch {
      setLoginError(INVITE_TRANSIENT_ERROR_MESSAGE);
      setLoginPending(false);
    }
  }

  return (
    <div className="rounded-sm border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-medium tracking-wide text-aviation-blue uppercase">
        {isSignup ? "Create account" : "Sign in"}
      </p>
      <h1 className="mt-2 text-2xl leading-tight">
        <span className="font-bold text-neutral-900">
          {isSignup ? "Join Jet Operations" : "Welcome back"}
        </span>
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-aviation-slate">
        {isSignup
          ? "Create an account with your invite code to upload flight plans and review analysed NOTAMs."
          : "Sign in to continue to your organisation or personal workspace."}
      </p>

      {isSignup ? (
        <form action={signupAction} className="mt-8 space-y-4">
          <div className={fieldGroupClassName}>
            <label htmlFor="email" className={labelClassName}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={fieldClassName}
            />
          </div>

          <div className={fieldGroupClassName}>
            <label htmlFor="password" className={labelClassName}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className={fieldClassName}
            />
          </div>

          <div className={fieldGroupClassName}>
            <label htmlFor="signup_code" className={labelClassName}>
              Signup code
            </label>
            <input
              id="signup_code"
              name="signup_code"
              type="text"
              autoComplete="off"
              required
              className={fieldClassName}
            />
            <p className="text-xs text-aviation-slate">
              Required during the closed testing phase.
            </p>
          </div>

          <div className={fieldGroupClassName}>
            <label htmlFor="account_type" className={labelClassName}>
              Account type
            </label>
            <select
              id="account_type"
              name="account_type"
              required
              className={fieldClassName}
            >
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={pending}
            className={`${signInClassName} w-full disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {pending ? "Creating account..." : "Create account"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleLoginSubmit} className="mt-8 space-y-4">
          <div className={fieldGroupClassName}>
            <label htmlFor="email" className={labelClassName}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={fieldClassName}
            />
          </div>

          <div className={fieldGroupClassName}>
            <label htmlFor="password" className={labelClassName}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={fieldClassName}
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className={`${signInClassName} w-full disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      )}

      {alertMessage ? (
        <p
          role="alert"
          className="mt-4 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {alertMessage}
        </p>
      ) : null}

      {state.message ? (
        <p className="mt-4 rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {state.message}
        </p>
      ) : null}

      <p className="mt-6 text-sm text-aviation-slate">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => setMode("login")}
              className="font-medium text-aviation-navy transition-colors hover:text-aviation-blue"
            >
              Sign in
            </button>
          </>
        ) : (
          <>
            Need an account?{" "}
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="font-medium text-aviation-navy transition-colors hover:text-aviation-blue"
            >
              Create an account
            </button>
          </>
        )}
      </p>
    </div>
  );
}
