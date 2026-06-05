# Organisation portal

Organisation users land on `/portal/organisation`, which resolves their active membership and redirects accordingly.

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

## Routes

| Path | Behaviour |
| --- | --- |
| `/portal/organisation` | Redirects to setup or `/portal/organisation/{slug}` |
| `/portal/organisation/setup` | Create organisation form (skipped if membership exists) |
| `/portal/organisation/{slug}` | Organisation portal for an active member |

## Setup flow

1. User enters an organisation name (slug is derived automatically).
2. `createOrganisation` loads the user's profile and calls the `create_organisation` RPC with `org_name`, `org_slug`, and `member_display_name` (e.g. `Josh` + `S` → `Josh S`).
3. Slug rules: lowercase, spaces to hyphens, non-alphanumeric characters removed (e.g. `Jet Operations` → `jet-operations`).
4. On success, user is redirected to `/portal/organisation/{slug}`.

## Members list

`/portal/organisation/{slug}` loads all rows from `organisation_members` for the organisation ID:

```typescript
const members = await supabase
  .from("organisation_members")
  .select("display_name, role, status")
  .eq("organisation_id", organisationId)
  .order("display_name");
```

Active members can view other members in the same organisation via RLS.

## Invites

Organisation admins can invite members from the portal page. See [organisation-invites.md](./organisation-invites.md).

## Tests

Helpers are covered in `tests/lib/organisation.test.ts`.
