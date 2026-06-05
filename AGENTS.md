<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Learned User Preferences

- Code testability and readability are the top priorities; treat this as a production-quality workspace.
- Use strict TDD: write failing tests first, then the minimal code to pass.
- Keep solutions simple; avoid over-engineering.
- Add JSDoc to functions; use comments only for non-obvious business logic.
- Maintain markdown docs in `documentation/` and update them when behaviour changes.
- UI styling is not a priority until core auth and onboarding flows work.
- Use local `_components` folders for private components rather than putting these in a global `/components` folder. Only shared components should go in there.
- Keep file and function names as short and relevant as possible without compromising on clarity.

## Learned Workspace Facts

- Next.js 16 App Router; read `node_modules/next/dist/docs/` before writing Next.js code (APIs differ from training data).
- Use root `proxy.ts` (not deprecated `middleware.ts`) for Supabase session refresh via `@supabase/ssr`.
- Supabase project: Jet Ops MVP (`wohclkrdcyykdjqzczgy`); copy `.env.example` to `.env.local` for env vars.
- Auth uses `@supabase/ssr` cookie sessions; clients in `lib/supabase/`, auth helpers in `lib/auth.ts`.
- Account types are `organisation` or `personal`; signup stores `account_type` in user metadata and a trigger creates `profiles`.
- Routes: `/`, `/auth`, `/auth/callback`, `/onboarding`, `/portal/organisation`, `/portal/organisation/setup`, `/portal/organisation/{slug}`, `/app/personal`, `/app/organisation`.
- Organisation membership uses `organisation_members.status` (`active`, `pending`, `disabled`); portal resolves via `getActiveMembership`.
- Organisation invites use `organisation_invitations` plus `inviteUserByEmail`; see `documentation/organisation-invites.md`.
- Post-onboarding redirect: `organisation` → `/portal/organisation`, `personal` → `/app/personal`.
- Account-type route protection in `proxy.ts` (`lib/auth.ts`); organisation vs personal routes are mutually exclusive.
- Unit tests use Vitest (`npm test`); domain helpers are tested in `tests/lib/auth.test.ts` and `tests/lib/organisation.test.ts`.
- Feature docs: `documentation/authentication.md`, `documentation/onboarding.md`, `documentation/routes.md`.
