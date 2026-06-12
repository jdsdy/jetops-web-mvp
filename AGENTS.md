<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project structure

- `lib/auth.ts` — all auth domain helpers: account types, onboarding validation, redirect paths, route guards (proxy), invite URL parsing.
- `lib/organisation.ts` — all organisation domain logic: slug/name validation, invite validation, invitation checks, membership queries, admin checks, portal redirects, display names.
- `lib/fleet.ts` — fleet aircraft helpers: reference grouping, payload validation, fleet queries, active-member auth for fleet reads.
- `lib/flights.ts` — flight helpers: storage path building, PDF validation, organisation flight queries; bucket `flight_plan_pdfs`.
- `lib/supabase/` — Supabase clients only (`client.ts`, `server.ts`, `admin.ts`, `middleware.ts`); keep infra separate from domain logic.
- `lib/env.ts` — site URL and JetOps API config (`JETOPS_API_URL`, `JETOPS_API_KEY`).
- `app/actions/auth.ts` — sign in/up/out + `completeOnboarding`.
- `app/actions/organisation.ts` — `createOrganisation` + `acceptInvitation`.
- Route-local UI in `app/**/_components/`; only shared components in `/components`.
- Tests in `tests/lib/auth.test.ts`, `tests/lib/organisation.test.ts`, `tests/lib/fleet.test.ts`, and `tests/lib/flights.test.ts`.
- Small API helpers (e.g. `jsonError`) live inline in the route file that uses them, not separate lib files.
- Organisation API routes under `app/api/organisations/[organisationId]/members`, `.../invites`, `.../fleet`, and `.../flights`; plus `GET /api/aircraft-reference`; one resource path per route file with HTTP verbs; session auth → membership/admin check → user Supabase client when RLS allows, `createAdminClient` when RLS blocks.

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
- Routes: `/`, `/auth`, `/auth/callback`, `/onboarding`, `/auth/accept-invite`, `/auth/accept-invite/confirm`, `/portal/callback`, `/portal/organisation`, `/portal/organisation/setup`, `/portal/organisation/{organisationId}`, `/app/personal`, `/app/organisation`, `/app/organisation/{organisationId}`, `/app/organisation/{organisationId}/flights`.
- Organisation membership uses `organisation_members.status` (`active`, `pending`, `disabled`); portal resolves via `getUserOrganisationMembership` on `/portal/callback`.
- Organisation invites use `organisation_invitations` plus `inviteUserByEmail`; cancel invite deletes the invitation row and pending membership row; see `documentation/organisation-invites.md`.
- Post-onboarding redirect: `organisation` → `/portal/callback`, `personal` → `/app/personal`.
- Account-type route protection in `proxy.ts` (`lib/auth.ts`); organisation vs personal routes are mutually exclusive.
- Unit tests use Vitest (`npm test`); domain helpers are tested in `tests/lib/auth.test.ts`, `tests/lib/organisation.test.ts`, `tests/lib/fleet.test.ts`, and `tests/lib/flights.test.ts`.
- Admin user management on `/portal/organisation/{organisationId}` via `user-management.tsx`; guardrails: no self-deactivate/demote, no removing last active admin, organisation owner permissions cannot be revoked. The creator receives `is_owner`; ownership is transferable via `POST .../members/{memberId}/ownership`.
- Fleet management on `/portal/organisation/{organisationId}` via `fleet-section.tsx`; all members see fleet list; admins add aircraft via `POST .../fleet`, and manage existing aircraft via `PATCH` and `DELETE .../fleet/{aircraftId}`.
- Flight creation on `/app/organisation/{organisationId}` via `create-flight-section.tsx`; `POST .../flights` uploads PDFs to `flight_plan_pdfs` and triggers JetOps analysis; `/app/organisation/{organisationId}/flights` tracks `analysis_jobs` via Realtime with initial fetch fallback.
- Disabled organisation members are signed out at `/portal/callback` with message on `/auth`.
- Feature docs: `documentation/authentication.md`, `documentation/onboarding.md`, `documentation/routes.md`, `documentation/organisation-invites.md`, `documentation/organisation-members.md`, `documentation/fleet.md`, `documentation/flights.md`, `documentation/landing-page.md`.
