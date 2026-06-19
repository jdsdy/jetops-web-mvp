# Authentication

JetOps uses [Supabase Auth](https://supabase.com/docs/guides/auth) with the Next.js App Router and `@supabase/ssr` for cookie-based sessions.

## Environment variables

Copy `.env.example` to `.env.local` and set:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) API key |
| `NEXT_PUBLIC_SITE_URL` | Public site URL used for email confirmation redirects |
| `JETOPS_API_URL` | JetOps API base URL used for signup-code validation |
| `JETOPS_API_KEY` | Server-side API key sent as `X-API-KEY` |

The Jet Ops MVP project URL is `https://wohclkrdcyykdjqzczgy.supabase.co`.

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Home page with a link to login |
| `/auth` | Email/password login and signup |
| `/auth/accept-invite` | Organisation invite link; stores invite cookie then redirects to sign in |
| `/auth/set-password` | Yes | Forced password reset for invited users after first sign-in |
| `/auth/update-password` | Yes (after reset link) | Self-service password reset after email link |
| `/auth/confirm` | No | Exchanges Supabase OTP links (`recovery`, etc.) for a session |
| `/auth/callback` | Shows a loader while exchanging email confirmation codes for a session |
| `/onboarding` | Collects first name and last name initial |

## Signup flow

1. User opens `/auth` and switches to **Create an account**.
2. User submits email, password, confirm password, signup code, and account type (`organisation` or `personal`).
3. `signUp` validates that password and confirm password match, then calls `POST {JETOPS_API_URL}/v1/signup` with `X-API-KEY` and a JSON body `{ "code": "<signup_code>" }`. A `400` response blocks signup and shows the API error message; `200` continues.
4. `signUp` stores `account_type` in `raw_user_meta_data`.
5. A database trigger (`handle_new_user`) creates a row in `public.profiles`.
6. Supabase sends a confirmation email redirecting to `/auth`.

## Auth page UI

`/auth` reuses the landing header and footer and presents a centred form card on `bg-neutral-50`. Styling uses the shared theme tokens from `app/globals.css` (`aviation-blue`, `aviation-navy`, `aviation-slate`). Forms prioritise readable labels, clear alerts, and minimal decoration.

## Simple form pages

`/auth/accept-invite`, `/onboarding`, and `/app/organisation/setup` use the same centred card layout and field styling as `/auth`, without the landing header or footer. Shared components: `components/simple-form-page.tsx`, `components/simple-form-card.tsx`, `components/simple-form-styles.ts`.

## Login flow

1. User submits email and password on `/auth` (browser Supabase client).
2. On success, the client sends the session JWT to `POST /api/invites/consume-cookie`.
3. If an invite cookie is present and valid, the API accepts the invitation atomically. On definitive failure the client signs the user out and shows an expired-invite message.
4. On success, the client redirects:
   - `has_set_password === false` → `/auth/set-password` (invited users)
   - Otherwise → `/app/callback` for organisation accounts (membership resolution; disabled users are signed out) or the profile-based destination for personal accounts

Invited users set a permanent password on `/auth/set-password`, then continue to `/app/callback`.

## Password reset flow

1. On `/auth`, the user chooses **Forgot password?** and submits their email address.
2. The client calls `supabase.auth.resetPasswordForEmail` with `redirectTo` set to `{NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/auth/update-password`.
3. Supabase sends a recovery email. With PKCE (SSR), the reset email template should link to `/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/update-password`. The default Supabase confirmation URL also works because it redirects back to the same `redirectTo` with a `code` or error query parameter.
4. `/auth/confirm` exchanges the link for a session (`verifyOtp` or `exchangeCodeForSession`) and redirects to `/auth/update-password` with auth cookies on the response.
5. If Supabase returns `error=access_denied` or `error_code=otp_expired`, the user is redirected to `/auth?error=invalid_reset_link` instead of seeing the update form.
6. The user submits a new password and confirmation; `updatePassword` calls `supabase.auth.updateUser({ password })` and redirects to the profile-based destination.

## Logout

Protected pages render a logout button that calls the `signOut` server action and returns the user to `/`.

## Supabase configuration

In the Supabase dashboard, add these redirect URLs:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/auth/confirm`
- `http://localhost:3000/auth/update-password`
- `http://localhost:3000/onboarding`

Adjust the host/port if you use a different `NEXT_PUBLIC_SITE_URL`.

Update the **Reset password** email template to use the PKCE confirm route:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/update-password">
  Reset password
</a>
```
