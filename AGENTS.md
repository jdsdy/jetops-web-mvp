<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project structure

- `lib/auth.ts` — all auth domain helpers: account types, onboarding validation, redirect paths, route guards (proxy), invite URL parsing.
- `lib/organisation.ts` — all organisation domain logic: slug/name validation, invite validation, invitation checks, membership queries, admin checks, organisation app redirects, display names.
- `lib/fleet.ts` — fleet aircraft helpers: reference grouping, payload validation, fleet queries, active-member auth for fleet reads.
- `lib/flights.ts` — flight helpers: storage path building, PDF validation, organisation flight queries; bucket `flight_plan_pdfs`.
- `lib/supabase/` — Supabase clients only (`client.ts`, `server.ts`, `admin.ts`, `middleware.ts`); keep infra separate from domain logic.
- `lib/env.ts` — site URL and JetOps API config (`JETOPS_API_URL`, `JETOPS_API_KEY`).
- `app/actions/auth.ts` — sign in/up/out + `completeOnboarding`.
- `app/actions/organisation.ts` — `createOrganisation`.
- Route-local UI in `app/**/_components/`; only shared components in `/components`.
- Tests in `tests/lib/auth.test.ts`, `tests/lib/organisation.test.ts`, `tests/lib/fleet.test.ts`, and `tests/lib/flights.test.ts`.
- Small API helpers (e.g. `jsonError`) live inline in the route file that uses them, not separate lib files.
- Organisation API routes under `app/api/organisations/[organisationId]/members`, `.../invites`, `.../fleet`, and `.../flights`; plus `GET /api/aircraft-reference` and `POST /api/invites/store-cookie`, `POST /api/invites/consume-cookie`; one resource path per route file with HTTP verbs; session auth → membership/admin check → user Supabase client when RLS allows, `createAdminClient` when RLS blocks; all handlers wrap with `withApiLogging` from `lib/api-logging.ts`.

## Learned User Preferences

- Readability and testability are top priorities; treat this as a production-quality workspace.
- Prefer keeping related logic in one file — avoid splitting across many small files unless separation clearly improves readability.
- Do not make the user chase many files to understand one imported function.
- Keep solutions simple; avoid over-engineering.
- Use strict TDD for new behavior: write failing tests first, then minimal code to pass.
- Add JSDoc to functions; use comments only for non-obvious business logic.
- Keep file and function names short and relevant without sacrificing clarity.
- Use local `_components` folders for private components; only shared components go in `/components`.
- Organisation app UI: professional CRM look over fancy styling; use modals for add/create flows. Landing page styling follows `documentation/landing-page.md`.
- Maintain markdown docs in `documentation/` and update them when behaviour changes.

## Learned Workspace Facts

- Next.js 16 App Router; read `node_modules/next/dist/docs/` before writing Next.js code (APIs differ from training data).
- Use root `proxy.ts` (not deprecated `middleware.ts`) for Supabase session refresh via `@supabase/ssr`.
- Supabase project: Jet Ops MVP (`wohclkrdcyykdjqzczgy`); copy `.env.example` to `.env.local` for env vars.
- Account types are `organisation` or `personal`; signup stores `account_type` in user metadata and a trigger creates `profiles`; signup codes validated via JetOps API (`POST {JETOPS_API_URL}/v1/signup`, `lib/auth.ts` `validateSignupCode`).
- Routes: `/`, `/auth`, `/auth/callback`, `/auth/confirm`, `/auth/update-password`, `/onboarding`, `/auth/accept-invite`, `/app/callback`, `/app/personal`, `/app/organisation`, `/app/organisation/setup`, `/app/organisation/{organisationId}` (Flights), `/app/organisation/{organisationId}/fleet`, `/app/organisation/{organisationId}/users`, `/app/organisation/{organisationId}/flights` (analysis; no portal shell).
- Organisation membership uses `organisation_members.status` (`active`, `pending`, `disabled`); membership resolves via `getUserOrganisationMembership` on `/app/callback`; disabled members signed out with message on `/auth`.
- Organisation invites use `organisation_invitations` with Resend email delivery; accept flow uses `POST /api/invites/store-cookie` and `POST /api/invites/consume-cookie`; cancel invite deletes the invitation row and pending membership row; see `documentation/organisation-invites.md`.
- Post-onboarding redirect: `organisation` → `/app/callback`, `personal` → `/app/personal`; account-type route protection in `proxy.ts` (`lib/auth.ts`); organisation vs personal routes are mutually exclusive.
- Organisation portal under `app/app/organisation/[organisationId]/(portal)/`: `(portal)/layout.tsx` auth-gates via `resolveOrganisationRouteAccess`; section pages needing membership/admin call `requireOrganisationRouteMembership` only; shared shell in `components/organisation-app-shell.tsx`; sections Flights (default), Fleet, Users; route-local `_components` for section UI; shared chrome (`modal`, `section-header`, `table-skeleton`, `portal-button`, `portal-styles`, `portal-table`, `portal-alerts`, `callback-loader`) in `/components`; `portal-styles.ts` holds card, form, table, alert, and link class names; portal layout uses `react-loading-skeleton`; `TableSkeleton` for client fetch states; create flows use modals (`components/modal.tsx` — center with `fixed` + `translate`, Tailwind resets dialog margin).
- Admin guardrails: no self-deactivate/demote, no removing last active admin, organisation owner permissions cannot be revoked. The creator receives `is_owner`; ownership is transferable via `POST .../members/{memberId}/ownership`.
- Fleet: all members see fleet list; admins add aircraft via `POST .../fleet`, and manage existing aircraft via `PATCH` and `DELETE .../fleet/{aircraftId}`. Flight creation via `create-flight-section.tsx`; `POST .../flights` uploads PDFs to `flight_plan_pdfs` and triggers JetOps analysis; `/app/organisation/{organisationId}/flights` polls analysis job status every 3s while processing.
- Callback loaders: `/app/callback` and `/auth/accept-invite` show `CallbackLoader` while resolving; `/auth/callback` uses route-local `AuthCallbackLoader` with the same shared component. Feature docs: `documentation/authentication.md`, `documentation/onboarding.md`, `documentation/routes.md`, `documentation/api-logging.md`, `documentation/organisation-app.md`, `documentation/organisation-invites.md`, `documentation/organisation-members.md`, `documentation/fleet.md`, `documentation/flights.md`, `documentation/landing-page.md`.
- Unit tests use Vitest (`npm test`); domain helpers are tested in `tests/lib/auth.test.ts`, `tests/lib/organisation.test.ts`, `tests/lib/fleet.test.ts`, `tests/lib/flights.test.ts`, and `tests/lib/api-logging.test.ts`.
