# Organisation portal

Organisation users land on `/portal/callback` after login, which resolves their membership and redirects accordingly. `/portal/organisation` redirects to the same callback.

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
  .eq("organisations.slug", slug) // optional, on slug routes
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
| `/portal/callback` | Resolves membership; disabled users are signed out with an error message |
| `/portal/organisation` | Redirects to `/portal/callback` |
| `/portal/organisation/setup` | Create organisation form (skipped if membership exists) |
| `/portal/organisation/{slug}` | Organisation portal for an active member |

## Setup flow

1. User enters an organisation name (slug is derived automatically).
2. `createOrganisation` loads the user's profile and calls the `create_organisation` RPC with `org_name`, `org_slug`, and `member_display_name` (e.g. `Josh` + `S` → `Josh S`).
3. Slug rules: lowercase, spaces to hyphens, non-alphanumeric characters removed (e.g. `Jet Operations` → `jet-operations`).
4. On success, user is redirected to `/portal/organisation/{slug}`.

## Members list

Non-admin members on `/portal/organisation/{slug}` see a read-only list of **active** members via `getActiveOrganisationMembers`.

## User management

Organisation admins see the **User management** section instead of the read-only list. It loads data from:

- `GET /api/organisations/{slug}/members`
- `GET /api/organisations/{slug}/invites`

Admins can update roles, toggle admin status, deactivate members, cancel pending invites, and send new invites. See [organisation-members.md](./organisation-members.md) and [organisation-invites.md](./organisation-invites.md).

## Fleet

All active members on `/portal/organisation/{slug}` see the organisation fleet (manufacturer, model, tail number) via `FleetSection`.

Admins can add aircraft using manufacturer/model dropdowns backed by `GET /api/aircraft-reference` and `POST /api/organisations/{slug}/fleet`. Each fleet row has a **Manage** button that opens a dialog for updating tail number, seats, RNAV equipped, or deleting the aircraft via `PATCH` and `DELETE` on `/api/organisations/{slug}/fleet/{aircraftId}`. See [fleet.md](./fleet.md).

## Invites

Organisation admins manage invites from the user management section. See [organisation-invites.md](./organisation-invites.md).

## Tests

Helpers are covered in `tests/lib/organisation.test.ts`.
