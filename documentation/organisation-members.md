# Organisation members API

Organisation admins manage members from `/portal/organisation/{slug}` via the user management section.

## Requirements

- Caller must be an active admin: `organisation_members.is_admin = true` and `status = 'active'`
- `GET` uses the authenticated user client (RLS permits active members to read member rows)
- `POST`, `PATCH`, and `DELETE` use the secret key after the admin check (RLS does not grant member updates)

## API

### `GET /api/organisations/{slug}/members`

Lists **active** and **disabled** members for the organisation. Pending members remain on the invites endpoint.

Response: `200`

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "uuid",
    "display_name": "Jane S",
    "role": "pilot",
    "is_admin": false,
    "is_owner": false,
    "status": "active"
  }
]
```

### `POST /api/organisations/{slug}/members/{memberId}`

Re-enables a **disabled** member.

1. Sets `organisation_members.status` to `active`
2. Clears the auth ban via `auth.admin.updateUserById` with `ban_duration: 'none'`

Response: `200` with the updated member object.

| Status | Meaning |
| --- | --- |
| 400 | Member is not disabled |
| 401 | No authenticated session |
| 403 | User is not an active admin |
| 404 | Member not found |
| 500 | Enable failed |

### `PATCH /api/organisations/{slug}/members/{memberId}`

Partial update. At least one field required.

Request body:

```json
{
  "role": "captain",
  "status": "active",
  "is_admin": true
}
```

| Field | Rules |
| --- | --- |
| `role` | Non-empty trimmed string |
| `status` | One of `active`, `pending`, `disabled` |
| `is_admin` | Boolean |

Guardrails:

- Admin cannot deactivate or demote **themselves**
- Cannot deactivate or demote the **last active admin**
- Cannot deactivate or demote the **organisation owner** (`is_owner = true`)
- Cannot set `status: 'active'` on a disabled member (use `POST` to re-enable)
- Cannot set `is_owner` via `PATCH` (use the ownership transfer endpoint)

Response: `200` with the updated member object.

| Status | Meaning |
| --- | --- |
| 400 | Invalid payload or guardrail violation |
| 401 | No authenticated session |
| 403 | User is not an active admin |
| 404 | Member not found |
| 500 | Update failed |

### `DELETE /api/organisations/{slug}/members/{memberId}`

Deactivates a member by setting `status = 'disabled'`. Does not hard-delete the row.

Also bans the user from signing in again via `auth.admin.updateUserById` with `ban_duration: '876000h'`.

Access is blocked on subsequent API and portal requests by the disabled membership status and auth ban. Existing sessions are not forcibly revoked.

The same ban runs when `PATCH` sets `status` to `disabled`.

Response: `200` with the updated member object.

### `POST /api/organisations/{slug}/members/{memberId}/ownership`

Transfers organisation ownership to an **active** member.

Rules:

- Only the current owner may transfer ownership
- Target must be active and not already the owner
- Target becomes `is_owner = true` and `is_admin = true`
- Current owner becomes `is_owner = false` (remains an admin)

Response: `200` with the updated target member object.

| Status | Meaning |
| --- | --- |
| 400 | Transfer not allowed |
| 401 | No authenticated session |
| 403 | User is not an active admin |
| 404 | Member not found |
| 500 | Transfer failed |

## Ownership

The organisation creator receives `is_owner = true` from the `create_organisation` RPC. The owner cannot be deactivated or demoted via admin controls. Ownership can be transferred to another active member by the current owner only.

## Portal UI

Admins see the **User management** section on `/portal/organisation/{slug}`:

- Active members: edit role, toggle admin, deactivate
- Disabled members: re-enable
- Organisation owner: transfer ownership to another active member; owner permissions cannot be revoked
- Pending invites: list and cancel (see [organisation-invites.md](./organisation-invites.md))
- Invite form: send new invites

Non-admin members see a read-only list of active members only.

## Tests

Validation and guardrail helpers are covered in `tests/lib/organisation.test.ts`.

Auth ban helpers are covered in `tests/lib/revoke-organisation-member-access.test.ts` and `tests/lib/restore-organisation-member-access.test.ts`.
