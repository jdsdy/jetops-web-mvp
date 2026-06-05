# Organisation members API

Organisation admins manage active members from `/portal/organisation/{slug}` via the user management section.

## Requirements

- Caller must be an active admin: `organisation_members.is_admin = true` and `status = 'active'`
- `GET` uses the authenticated user client (RLS permits active members to read member rows)
- `PATCH` and `DELETE` use the service role after the admin check (RLS does not grant member updates)

## API

### `GET /api/organisations/{slug}/members`

Lists **active** members for the organisation.

Response: `200`

```json
[
  {
    "id": 1,
    "user_id": "uuid",
    "display_name": "Jane S",
    "role": "pilot",
    "is_admin": false,
    "status": "active"
  }
]
```

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

Same guardrails as `PATCH` with `{ "status": "disabled" }`.

Response: `200` with the updated member object.

## Portal UI

Admins see the **User management** section on `/portal/organisation/{slug}`:

- Active members: edit role, toggle admin, deactivate
- Pending invites: list and cancel (see [organisation-invites.md](./organisation-invites.md))
- Invite form: send new invites

Non-admin members see a read-only member list.

## Tests

Validation and guardrail helpers are covered in `tests/lib/organisation.test.ts`.
