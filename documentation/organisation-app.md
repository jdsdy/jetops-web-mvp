# Organisation app

Organisation users land on `/app/callback` after login, which resolves their membership and redirects accordingly.

## Membership lookup

Active memberships are loaded from `organisation_members` using `status = 'active'`:

```typescript
const { data: membership } = await supabase
  .from("organisation_members")
  .select(`
    role,
    is_admin,
    status,
    organisations!inner (
      id,
      name,
      slug
    )
  `)
  .eq("user_id", user.id)
  .eq("status", "active")
  .eq("organisations.id", organisationId) // optional, on organisation routes
  .maybeSingle();
```

## Row level security

`organisation_members` has RLS enabled with two SELECT policies:

| Policy | Rule |
| --- | --- |
| Members can view their own memberships | `user_id = auth.uid()` |
| Members can view organisation members | `private.is_active_org_member(organisation_id, auth.uid())` |

The helper `private.is_active_org_member` checks for an **active** membership in the same organisation. Admin mutations (invite, deactivate, update role) use the service role after an admin check in API routes.

`organisations` also has RLS enabled. Members can read an organisation when `private.is_org_member(id, auth.uid())` is true (any membership status), which allows embedded `organisations!inner (...)` selects in membership queries to succeed.

## Routes

| Path | Behaviour |
| --- | --- |
| `/app/callback` | Shows `CallbackLoader` while resolving membership; disabled users are signed out with an error message |
| `/app/organisation/setup` | Create organisation form (skipped if membership exists) |
| `/app/organisation/{organisationId}` | Flights section (default portal view) |
| `/app/organisation/{organisationId}/fleet` | Fleet section |
| `/app/organisation/{organisationId}/users` | Users section |
| `/app/organisation/{organisationId}/flights` | Flight analysis (`?id=` and `?jobId=` required); uses portal shell via `flights/layout.tsx` |

## Portal layout

Organisation portal sections live under the `(portal)` route group at `app/app/organisation/[organisationId]/(portal)/`.

Shared UI:

| File | Purpose |
| --- | --- |
| `components/organisation-app-shell.tsx` | Sidebar navigation and top bar |
| `components/modal.tsx` | Native dialog for create flows |
| `components/section-header.tsx` | Section title and primary action |
| `components/table-skeleton.tsx` | `react-loading-skeleton` table placeholder |

The portal layout imports `react-loading-skeleton/dist/skeleton.css`. Client sections use `TableSkeleton` while fetching; server-provided lists skip the initial skeleton when `initialFleet` or `initialMembers` props are passed.

Create actions open modals:

- **Flights** — all members can add a flight (PDF upload)
- **Fleet** — admins can add aircraft
- **Users** — admins can invite members

## Setup flow

1. User enters an organisation name (slug is derived automatically).
2. `createOrganisation` loads the user's profile and calls the `create_organisation` RPC with `org_name`, `org_slug`, and `member_display_name` (e.g. `Josh` + `S` → `Josh S`).
3. Slug rules: lowercase, spaces to hyphens, non-alphanumeric characters removed (e.g. `Jet Operations` → `jet-operations`).
4. On success, user is redirected to `/app/organisation/{organisationId}`.

## Portal sections

### Flights (`/app/organisation/{organisationId}`)

Lists organisation flights in a table with links to the analysis page when a job exists. All members can create flights via a modal form (`CreateFlightSection`). See [flights.md](./flights.md).

### Fleet (`/app/organisation/{organisationId}/fleet`)

Lists fleet aircraft in a table. Admins can add aircraft via a modal and manage existing rows (edit, delete). See [fleet.md](./fleet.md).

### Users (`/app/organisation/{organisationId}/users`)

Non-admin members see a read-only member table via `OrganisationMembers`.

Organisation admins see `UserManagement` with member and pending-invite tables. Admins invite new members via a modal. Member actions call:

- `GET /api/organisations/{organisationId}/members`
- `GET /api/organisations/{organisationId}/invites`

See [organisation-members.md](./organisation-members.md) and [organisation-invites.md](./organisation-invites.md).

## Invites

Organisation admins manage invites from the users section. See [organisation-invites.md](./organisation-invites.md).

## Tests

Helpers are covered in `tests/lib/organisation.test.ts`.
