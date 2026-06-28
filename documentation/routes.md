# Routes

| Path | Auth required | Description |
| --- | --- | --- |
| `/` | No | Landing page; **Sign in** links to `/auth` |
| `/auth` | No | Login and signup form |
| `/onboarding` | Yes | Name collection step |
| `/app/callback` | Yes (organisation) | Resolves membership; signs out disabled users |
| `/app/organisation/setup` | Yes (organisation) | Create organisation form |
| `/auth/accept-invite` | No | Invite link; client calls `POST /api/invites/store-cookie`, then redirects to `/auth` |
| `/auth/set-password` | Yes | Forced password reset for invited users after first sign-in |
| `/auth/update-password` | Yes (after reset link) | Self-service password reset after email link |
| `/app/personal` | Yes (personal) | Flights list and create-flight form |
| `/app/personal/fleet` | Yes (personal) | Personal fleet management |
| `/app/personal/flights` | Yes (personal) | Flight analysis status page (`?id=` and `?jobId=` required) |
| `/app/organisation` | Yes (organisation) | Redirects to `/app/organisation/{organisationId}` for active members |
| `/app/organisation/{organisationId}` | Yes (organisation) | Organisation CRM home: members, fleet, flights |
| `/app/organisation/{organisationId}/flights` | Yes (organisation) | Flight analysis status page (`?id=` and `?jobId=` required) |

## Account-type route protection

After login, route access is enforced from `profile.account_type`:

| Account type | Allowed routes | Denied routes |
| --- | --- | --- |
| `organisation` | `/app/callback`, `/app/organisation` | `/app/personal` |
| `personal` | `/app/personal` | `/app/callback`, `/app/organisation` |

Users who attempt a denied route are redirected to their account home (`/app/callback` or `/app/personal`). Users with incomplete onboarding are redirected to `/onboarding` when they hit an account-type route.

Enforcement runs in `proxy.ts` via `lib/supabase/middleware.ts`. Logic is covered by `tests/lib/auth.test.ts`.

## Organisation app navigation

See [organisation-app.md](./organisation-app.md) for membership resolution, setup, and the unified organisation home.

`/app/organisation/{organisationId}` includes:

- Organisation name
- User management (admins) or read-only members list (non-admins)
- Fleet section (all members view; admins manage)
- Flights list and create-flight form (all active members)
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
| `POST` | `/api/organisations/{organisationId}/flights/{flightId}/notam-feedback` | Submit feedback for an analysed NOTAM (active member) |
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
| `POST` | `/api/invites/store-cookie` | Store HttpOnly invite cookie for accept-invite link |
| `POST` | `/api/invites/consume-cookie` | Consume invite cookie after sign-in |

Personal APIs live under `/api/personal/` (see [personal-app.md](./personal-app.md)):

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/personal/fleet` | List personal fleet |
| `POST` | `/api/personal/fleet` | Add fleet aircraft |
| `PATCH` | `/api/personal/fleet/{aircraftId}` | Update fleet aircraft |
| `DELETE` | `/api/personal/fleet/{aircraftId}` | Delete fleet aircraft |
| `POST` | `/api/personal/flights` | Create flight with PDF upload and trigger analysis |
| `GET` | `/api/personal/flights/{flightId}` | Poll analysis job status (`?jobId=`) |
| `PATCH` | `/api/personal/flights/{flightId}` | Update extracted flight details |
| `POST` | `/api/personal/flights/{flightId}/analysis` | Trigger downstream analysis |
| `POST` | `/api/personal/flights/{flightId}/notam-feedback` | Submit NOTAM feedback |

See [organisation-members.md](./organisation-members.md), [organisation-invites.md](./organisation-invites.md), [fleet.md](./fleet.md), [flights.md](./flights.md), [personal-app.md](./personal-app.md), and [api-logging.md](./api-logging.md).
