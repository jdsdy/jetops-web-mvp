# Organisation portal

Organisation users land on `/portal/organisation`, which resolves their active membership and redirects accordingly.

## Membership lookup

Active memberships are loaded from `organisation_members` using `is_active = true` (not a `status` column):

```typescript
const { data: membership } = await supabase
  .from("organisation_members")
  .select(`
    role,
    is_active,
    organisations!inner (
      id,
      name,
      slug
    )
  `)
  .eq("user_id", user.id)
  .eq("is_active", true)
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
2. `createOrganisation` calls the `create_organisation` RPC with `org_name` and `org_slug`.
3. Slug rules: lowercase, spaces to hyphens, non-alphanumeric characters removed (e.g. `Jet Operations` → `jet-operations`).
4. On success, user is redirected to `/portal/organisation/{slug}`.

## Tests

Slug and redirect helpers are covered under `tests/lib/organisation/`.
