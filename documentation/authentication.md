# Authentication

JetOps uses [Supabase Auth](https://supabase.com/docs/guides/auth) with the Next.js App Router and `@supabase/ssr` for cookie-based sessions.

## Environment variables

Copy `.env.example` to `.env.local` and set:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) API key |
| `NEXT_PUBLIC_SITE_URL` | Public site URL used for email confirmation redirects |

The Jet Ops MVP project URL is `https://wohclkrdcyykdjqzczgy.supabase.co`.

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Home page with a link to login |
| `/auth` | Email/password login and signup |
| `/auth/callback` | Exchanges email confirmation codes for a session |
| `/onboarding` | Collects first name and last name initial |

## Signup flow

1. User opens `/auth` and switches to **Create an account**.
2. User submits email, password, and account type (`organisation` or `personal`).
3. `signUp` stores `account_type` in `raw_user_meta_data`.
4. A database trigger (`handle_new_user`) creates a row in `public.profiles`.
5. Supabase sends a confirmation email linking to `/auth/callback?next=/onboarding`.
6. The callback route exchanges the code for a session, then redirects to onboarding.

## Login flow

1. User submits email and password on `/auth`.
2. On success, the server loads `profiles` and redirects:
   - Incomplete onboarding → `/onboarding`
   - Organisation → `/portal/callback` (membership resolution; disabled users are signed out)
   - Personal → `/app/personal`

## Logout

Protected pages render a logout button that calls the `signOut` server action and returns the user to `/`.

## Supabase configuration

In the Supabase dashboard, add these redirect URLs:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/onboarding`

Adjust the host/port if you use a different `NEXT_PUBLIC_SITE_URL`.
