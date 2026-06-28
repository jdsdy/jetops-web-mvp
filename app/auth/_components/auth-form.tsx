"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { signUp } from "@/app/actions/auth";
import { signInClassName } from "@/components/landing-header";
import { ACCOUNT_TYPES, getRedirectForProfile } from "@/lib/auth";
import { getPasswordResetRedirectUrl } from "@/lib/env";
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

type AuthMode = "login" | "signup" | "forgot-password";

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
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginError, setLoginError] = useState<string | undefined>(initialError);
  const [loginPending, setLoginPending] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState<string>();
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState<string>();
  const [forgotPasswordPending, setForgotPasswordPending] = useState(false);
  const [signupState, signupAction, signupPending] = useActionState(
    signUp,
    initialState,
  );

  const isSignup = mode === "signup";
  const isForgotPassword = mode === "forgot-password";
  const state = signupState;
  // 'pending' tracks whether the form is currently submitting:
  // - In signup mode, it's the result of the async signUp action
  // - In forgot-password mode, it's the state for the async forgot password action
  // - Otherwise, it's the login-in-progress flag
  const pending = isSignup
    ? signupPending
    : isForgotPassword
      ? forgotPasswordPending
      : loginPending;

  // 'alertMessage' is the error message shown to the user (if any):
  // - In signup mode, it's the error returned by the signup action
  // - In forgot-password mode, it's the locally-managed forgot password error
  // - Otherwise, it's the locally-managed login error
  const alertMessage = isSignup
    ? state.error
    : isForgotPassword
      ? forgotPasswordError
      : loginError;

  // 'successMessage' is the positive/info message for the user:
  // - In forgot-password mode, it's the forgot-password success message
  // - Otherwise, it's any general signup success/info message
  const successMessage = isForgotPassword
    ? forgotPasswordMessage
    : state.message;

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setLoginError(undefined);
    setForgotPasswordError(undefined);
    setForgotPasswordMessage(undefined);
  }

  async function handleForgotPasswordSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setForgotPasswordError(undefined);
    setForgotPasswordMessage(undefined);
    setForgotPasswordPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getPasswordResetRedirectUrl(),
    });

    setForgotPasswordPending(false);

    if (error) {
      setForgotPasswordError(error.message);
      return;
    }

    setForgotPasswordMessage(
      "If an account exists for that email, a reset link has been sent.",
    );
  }

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

      const { data: profile } = await supabase
        .from("profiles")
        .select("f_name, l_initial, account_type")
        .eq("id", signInData.user.id)
        .single();

      router.push(
        profile ? getRedirectForProfile(profile) : "/onboarding",
      );
    } catch {
      setLoginError(INVITE_TRANSIENT_ERROR_MESSAGE);
      setLoginPending(false);
    }
  }

  return (
    <div className="rounded-sm border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-medium tracking-wide text-aviation-blue uppercase">
        {isSignup
          ? "Create account"
          : isForgotPassword
            ? "Reset password"
            : "Sign in"}
      </p>
      <h1 className="mt-2 text-2xl leading-tight">
        <span className="font-bold text-neutral-900">
          {isSignup
            ? "Join Jet Operations"
            : isForgotPassword
              ? "Forgot your password?"
              : "Welcome back"}
        </span>
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-aviation-slate">
        {isSignup
          ? "Create an account with your invite code to upload flight plans and review analysed NOTAMs."
          : isForgotPassword
            ? "Enter your email address and we will send you a link to choose a new password."
            : "Sign in to continue to your organisation or personal workspace."}
      </p>

      {isForgotPassword ? (
        <form onSubmit={handleForgotPasswordSubmit} className="mt-8 space-y-4">
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

          <button
            type="submit"
            disabled={pending}
            className={`${signInClassName} w-full disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {pending ? "Sending reset link..." : "Send reset link"}
          </button>

          <button
            type="button"
            onClick={() => switchMode("login")}
            className="w-full text-sm font-medium text-aviation-navy transition-colors hover:text-aviation-blue"
          >
            Back to sign in
          </button>
        </form>
      ) : isSignup ? (
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
              minLength={8}
              className={fieldClassName}
            />
          </div>

          <div className={fieldGroupClassName}>
            <label htmlFor="confirm_password" className={labelClassName}>
              Confirm password
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
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

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => switchMode("forgot-password")}
              className="text-sm font-medium text-aviation-navy transition-colors hover:text-aviation-blue"
            >
              Forgot password?
            </button>
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

      {successMessage ? (
        <p className="mt-4 rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {successMessage}
        </p>
      ) : null}

      {!isForgotPassword ? (
        <p className="mt-6 text-sm text-aviation-slate">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
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
                onClick={() => switchMode("signup")}
                className="font-medium text-aviation-navy transition-colors hover:text-aviation-blue"
              >
                Create an account
              </button>
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}
