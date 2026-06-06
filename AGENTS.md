<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project structure

- `lib/auth.ts` — all auth domain helpers: account types, onboarding validation, redirect paths, route guards (proxy), invite URL parsing.
- `lib/organisation.ts` — all organisation domain logic: slug/name validation, invite validation, invitation checks, membership queries, admin checks, portal redirects, display names.
- `lib/supabase/` — Supabase clients only (`client.ts`, `server.ts`, `admin.ts`, `middleware.ts`); keep infra separate from domain logic.
- `lib/env.ts` — site URL config.
- `app/actions/auth.ts` — sign in/up/out + `completeOnboarding`.
- `app/actions/organisation.ts` — `createOrganisation` + `acceptInvitation`.
- Route-local UI in `app/**/_components/`; only shared components in `/components`.
- Tests consolidated in `tests/lib/auth.test.ts` and `tests/lib/organisation.test.ts` (not mirrored subfolders per tiny lib file).
- Small API helpers (e.g. `jsonError`) live inline in the route file that uses them, not separate lib files.
- Organisation API routes under `app/api/organisations/[slug]/members` and `.../invites`; one resource path per route file with HTTP verbs (GET/POST/PATCH/DELETE); session auth → `requireOrgAdmin` → user Supabase client when RLS allows, `createAdminClient` when RLS blocks.

## Learned User Preferences

- Readability and testability are top priorities; treat this as a production-quality workspace.
- Prefer keeping related logic in one file — avoid splitting across many small files unless separation clearly improves readability.
- Do not make the user chase many files to understand one imported function.
- Keep solutions simple; avoid over-engineering.
- Use strict TDD for new behavior: write failing tests first, then minimal code to pass.
- Add JSDoc to functions; use comments only for non-obvious business logic.
- Keep file and function names short and relevant without sacrificing clarity.
- Use local `_components` folders for private components; only shared components go in `/components`.
- UI styling is not a priority until core auth and onboarding flows work.
- Maintain markdown docs in `documentation/` and update them when behaviour changes.

## Learned Workspace Facts

- Next.js 16 App Router; read `node_modules/next/dist/docs/` before writing Next.js code (APIs differ from training data).
- Use root `proxy.ts` (not deprecated `middleware.ts`) for Supabase session refresh via `@supabase/ssr`.
- Supabase project: Jet Ops MVP (`wohclkrdcyykdjqzczgy`); copy `.env.example` to `.env.local` for env vars.
- Account types are `organisation` or `personal`; signup stores `account_type` in user metadata and a trigger creates `profiles`.
- Routes: `/`, `/auth`, `/auth/callback`, `/onboarding`, `/auth/accept-invite`, `/auth/accept-invite/confirm`, `/portal/callback`, `/portal/organisation`, `/portal/organisation/setup`, `/portal/organisation/{slug}`, `/app/personal`, `/app/organisation`.
- Organisation membership uses `organisation_members.status` (`active`, `pending`, `disabled`); portal resolves via `getUserOrganisationMembership` on `/portal/callback`.
- Organisation invites use `organisation_invitations` plus `inviteUserByEmail`; cancel invite deletes the invitation row and pending membership row; see `documentation/organisation-invites.md`.
- Post-onboarding redirect: `organisation` → `/portal/callback`, `personal` → `/app/personal`.
- Account-type route protection in `proxy.ts` (`lib/auth.ts`); organisation vs personal routes are mutually exclusive.
- Unit tests use Vitest (`npm test`); domain helpers are tested in `tests/lib/auth.test.ts` and `tests/lib/organisation.test.ts`.
- Admin user management on `/portal/organisation/{slug}` via `user-management.tsx`; guardrails: no self-deactivate/demote, no removing last active admin, organisation owner permissions cannot be revoked. The creator receives `is_owner`; ownership is transferable via `POST .../members/{memberId}/ownership`.
- Disabled organisation members are signed out at `/portal/callback` with message on `/auth`.
- Feature docs: `documentation/authentication.md`, `documentation/onboarding.md`, `documentation/routes.md`, `documentation/organisation-invites.md`, `documentation/organisation-members.md`.
