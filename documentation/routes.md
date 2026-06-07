# Routes

| Path | Auth required | Description |
| --- | --- | --- |
| `/` | No | Home page with **Go to login** |
| `/auth` | No | Login and signup form |
| `/onboarding` | Yes | Name collection step |
| `/portal/callback` | Yes (organisation) | Resolves membership; signs out disabled users |
| `/portal/organisation` | Yes (organisation) | Redirects to `/portal/callback` |
| `/portal/organisation/setup` | Yes (organisation) | Create organisation form |
| `/portal/organisation/{slug}` | Yes (organisation) | Organisation portal; admins get user management, others see read-only members |
| `/auth/accept-invite` | No (until token verified) | Invite acceptance and password setup |
| `/app/personal` | Yes (personal) | Personal app shell |
| `/app/organisation` | Yes (organisation) | Organisation app shell |

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

`/portal/organisation/{slug}` includes:

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

Organisation management APIs live under `/api/organisations/{slug}/`. Each resource uses HTTP methods on a single path:

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/aircraft-reference` | List aircraft reference grouped by manufacturer (authenticated) |
| `GET` | `/api/organisations/{slug}/fleet` | List organisation fleet (active member) |
| `POST` | `/api/organisations/{slug}/fleet` | Add fleet aircraft (admin) |
| `PATCH` | `/api/organisations/{slug}/fleet/{aircraftId}` | Update fleet aircraft (admin) |
| `DELETE` | `/api/organisations/{slug}/fleet/{aircraftId}` | Delete fleet aircraft (admin) |
| `GET` | `/api/organisations/{slug}/members` | List active and disabled members (admin) |
| `POST` | `/api/organisations/{slug}/members/{memberId}` | Re-enable disabled member |
| `POST` | `/api/organisations/{slug}/members/{memberId}/ownership` | Transfer organisation ownership |
| `PATCH` | `/api/organisations/{slug}/members/{memberId}` | Update role, status, or admin flag |
| `DELETE` | `/api/organisations/{slug}/members/{memberId}` | Deactivate member |
| `GET` | `/api/organisations/{slug}/invites` | List pending invites (admin) |
| `POST` | `/api/organisations/{slug}/invites` | Send invite |
| `DELETE` | `/api/organisations/{slug}/invites/{inviteId}` | Cancel invite |

See [organisation-members.md](./organisation-members.md), [organisation-invites.md](./organisation-invites.md), and [fleet.md](./fleet.md).
