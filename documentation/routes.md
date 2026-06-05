# Routes

| Path | Auth required | Description |
| --- | --- | --- |
| `/` | No | Home page with **Go to login** |
| `/auth` | No | Login and signup form |
| `/onboarding` | Yes | Name collection step |
| `/portal/organisation` | Yes (organisation) | Resolves membership and redirects |
| `/portal/organisation/setup` | Yes (organisation) | Create organisation form |
| `/portal/organisation/{slug}` | Yes (organisation) | Organisation portal for a member (includes admin invite form) |
| `/auth/accept-invite` | No (until token verified) | Invite acceptance and password setup |
| `/app/personal` | Yes (personal) | Personal app shell |
| `/app/organisation` | Yes (organisation) | Organisation app shell |

## Account-type route protection

After login, route access is enforced from `profile.account_type`:

| Account type | Allowed routes | Denied routes |
| --- | --- | --- |
| `organisation` | `/portal/organisation`, `/app/organisation` | `/app/personal` |
| `personal` | `/app/personal` | `/portal/organisation`, `/app/organisation` |

Users who attempt a denied route are redirected to their account home (`/portal/organisation` or `/app/personal`). Users with incomplete onboarding are redirected to `/onboarding` when they hit an account-type route.

Enforcement runs in `proxy.ts` via `lib/supabase/middleware.ts`. Logic is covered by tests in `tests/lib/auth/route-access.test.ts`.

## Organisation portal navigation

See [organisation-portal.md](./organisation-portal.md) for membership resolution and setup.

`/portal/organisation/{slug}` includes:

- Organisation name
- **Go to app/organisation** → `/app/organisation`
- **Logout**

## Testing

Run unit tests for routing helpers:

```bash
npm test
```

Tests live under `tests/` and mirror the source layout (for example, `tests/lib/auth/` for `lib/auth/`). They cover account-type validation, onboarding validation, and redirect paths.
