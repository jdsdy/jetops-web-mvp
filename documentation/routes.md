# Routes

| Path | Auth required | Description |
| --- | --- | --- |
| `/` | No | Landing page; **Sign in** links to `/auth` |
| `/auth` | No | Login and signup form |
| `/onboarding` | Yes | Name collection step |
| `/portal/callback` | Yes (organisation) | Resolves membership; signs out disabled users |
| `/portal/organisation` | Yes (organisation) | Redirects to `/portal/callback` |
| `/portal/organisation/setup` | Yes (organisation) | Create organisation form |
| `/portal/organisation/{organisationId}` | Yes (organisation) | Organisation portal; admins get user management, others see read-only members |
| `/auth/accept-invite` | No (until token verified) | Invite acceptance and password setup |
| `/app/personal` | Yes (personal) | Personal app shell |
| `/app/organisation` | Yes (organisation) | Redirects to `/app/organisation/{organisationId}` for active members |
| `/app/organisation/{organisationId}` | Yes (organisation) | Organisation app home; create flight form |
| `/app/organisation/{organisationId}/flights` | Yes (organisation) | Flight analysis status page (`?id=` and `?jobId=` required) |

## Account-type route protection

After login, route access is enforced from `profile.account_type`:

| Account type | Allowed routes | Denied routes |
| --- | --- | --- |
| `organisation` | `/portal/callback`, `/portal/organisation`, `/app/organisation` | `/app/personal` |
| `personal` | `/app/personal` | `/portal/organisation`, `/app/organisation` |

Users who attempt a denied route are redirected to their account home (`/portal/callback` or `/app/personal`). Users with incomplete onboarding are redirected to `/onboarding` when they hit an account-type route.

Enforcement runs in `proxy.ts` via `lib/supabase/middleware.ts`. Logic is covered by `tests/lib/auth.test.ts`.

## Organisation portal navigation

See [organisation-portal.md](./organisation-portal.md) for membership resolution and setup.

`/portal/organisation/{organisationId}` includes:

- Organisation name
- **Go to app/organisation** → `/app/organisation`
- **Logout**

## Testing

Run unit tests for routing helpers:

```bash
npm test
```

Tests live in `tests/lib/auth.test.ts` and `tests/lib/organisation.test.ts`.

## API routes

Organisation management APIs live under `/api/organisations/{organisationId}/`. Each resource uses HTTP methods on a single path:

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/aircraft-reference` | List aircraft reference grouped by manufacturer (authenticated) |
| `GET` | `/api/organisations/{organisationId}/fleet` | List organisation fleet (active member) |
| `POST` | `/api/organisations/{organisationId}/fleet` | Add fleet aircraft (admin) |
| `POST` | `/api/organisations/{organisationId}/flights` | Create flight with PDF upload and trigger analysis (active member) |
| `GET` | `/api/organisations/{organisationId}/flights/{flightId}` | Poll analysis job status (`?jobId=`) |
| `PATCH` | `/api/organisations/{organisationId}/flights/{flightId}` | Update extracted flight details while job is `awaiting_confirmation` |
| `POST` | `/api/organisations/{organisationId}/flights/{flightId}/analysis` | Trigger downstream analysis after confirmation |
| `PATCH` | `/api/organisations/{organisationId}/fleet/{aircraftId}` | Update fleet aircraft (admin) |
| `DELETE` | `/api/organisations/{organisationId}/fleet/{aircraftId}` | Delete fleet aircraft (admin) |
| `GET` | `/api/organisations/{organisationId}/members` | List active and disabled members (admin) |
| `POST` | `/api/organisations/{organisationId}/members/{memberId}` | Re-enable disabled member |
| `POST` | `/api/organisations/{organisationId}/members/{memberId}/ownership` | Transfer organisation ownership |
| `PATCH` | `/api/organisations/{organisationId}/members/{memberId}` | Update role, status, or admin flag |
| `DELETE` | `/api/organisations/{organisationId}/members/{memberId}` | Deactivate member |
| `GET` | `/api/organisations/{organisationId}/invites` | List pending invites (admin) |
| `POST` | `/api/organisations/{organisationId}/invites` | Send invite |
| `DELETE` | `/api/organisations/{organisationId}/invites/{inviteId}` | Cancel invite |

See [organisation-members.md](./organisation-members.md), [organisation-invites.md](./organisation-invites.md), [fleet.md](./fleet.md), and [flights.md](./flights.md).
