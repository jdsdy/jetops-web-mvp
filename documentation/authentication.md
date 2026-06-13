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
| `/auth/callback` | Shows a loader while exchanging email confirmation codes for a session |
| `/onboarding` | Collects first name and last name initial |

## Signup flow

1. User opens `/auth` and switches to **Create an account**.
2. User submits email, password, signup code, and account type (`organisation` or `personal`).
3. `signUp` calls `POST {JETOPS_API_URL}/v1/signup` with `X-API-KEY` and a JSON body `{ "code": "<signup_code>" }`. A `400` response blocks signup and shows the API error message; `200` continues.
4. `signUp` stores `account_type` in `raw_user_meta_data`.
5. A database trigger (`handle_new_user`) creates a row in `public.profiles`.
6. Supabase sends a confirmation email redirecting to `/auth`.

## Auth page UI

`/auth` reuses the landing header and footer and presents a centred form card on `bg-neutral-50`. Styling uses the shared theme tokens from `app/globals.css` (`aviation-blue`, `aviation-navy`, `aviation-slate`). Forms prioritise readable labels, clear alerts, and minimal decoration.

## Simple form pages

`/auth/accept-invite`, `/onboarding`, and `/app/organisation/setup` use the same centred card layout and field styling as `/auth`, without the landing header or footer. Shared components: `components/simple-form-page.tsx`, `components/simple-form-card.tsx`, `components/simple-form-styles.ts`.

## Login flow

1. User submits email and password on `/auth`.
2. On success, the server loads `profiles` and redirects:
   - Incomplete onboarding → `/onboarding`
   - Organisation → `/app/callback` (membership resolution; disabled users are signed out)
   - Personal → `/app/personal`

## Logout

Protected pages render a logout button that calls the `signOut` server action and returns the user to `/`.

## Supabase configuration

In the Supabase dashboard, add these redirect URLs:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/onboarding`

Adjust the host/port if you use a different `NEXT_PUBLIC_SITE_URL`.
