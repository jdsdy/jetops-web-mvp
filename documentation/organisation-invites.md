# Organisation invites

Organisation admins can invite and manage pending members from `/app/organisation/{organisationId}`.

## Requirements

- Inviter must be an active admin: `organisation_members.is_admin = true` and `status = 'active'`
- Invitee receives a Supabase invite email
- Invite records are stored in `organisation_invitations`
- Pending membership is stored in `organisation_members` with `status = 'pending'`

## API

All invite routes require an authenticated active admin of the organisation.

### `POST /api/organisations/{organisationId}/invites`

Sends an invite email and creates invitation plus pending membership records.

Request body:

```json
{
  "email": "pilot@example.com",
  "f_name": "John",
  "l_initial": "S",
  "role": "member"
}
```

Response: `201`

```json
{
  "userId": "uuid",
  "email": "pilot@example.com",
  "invitationId": "uuid"
}
```

| Status | Meaning |
| --- | --- |
| 201 | Invite sent and DB records created |
| 400 | Invalid payload |
| 401 | No authenticated session |
| 403 | User is not an active admin of the organisation |
| 500 | `inviteUserByEmail` or record creation failed |

### `GET /api/organisations/{organisationId}/invites`

Lists **pending** invites: `accepted_at IS NULL` and not expired.

Response: `200`

```json
[
  {
    "id": "uuid",
    "email": "pilot@example.com",
    "role": "member",
    "expires_at": "2026-06-12T08:47:52.227+00:00",
    "created_at": "2026-06-05T08:47:52.421963+00:00"
  }
]
```

Uses the service role after the admin check (RLS does not grant admins invite reads).

### `DELETE /api/organisations/{organisationId}/invites/{inviteId}`

Cancels a pending invite:

1. Deletes the `organisation_invitations` row
2. Deletes the linked **pending** `organisation_members` row for the invited user

Response: `204`

| Status | Meaning |
| --- | --- |
| 204 | Invite cancelled |
| 401 | No authenticated session |
| 403 | User is not an active admin |
| 404 | Invite not found |
| 500 | Delete failed |

## Invite flow

1. Admin submits invite form on the organisation home page (or `POST` above).
2. API validates session and admin membership via `requireOrgAdmin`.
3. API calls `supabaseAdmin.auth.admin.inviteUserByEmail` with user metadata and `redirectTo: /auth/accept-invite`.

   User metadata includes:

   | Field | Value |
   | --- | --- |
   | `account_type` | `"organisation"` |
   | `f_name` | Invitee first name |
   | `l_initial` | Invitee last initial |
   | `role` | Invited role |
   | `organisation_id` | Organisation uuid |
   | `organisation_slug` | Organisation slug |
   | `organisation_name` | Organisation display name (for invite email templates) |

4. On success, API calls `create_organisation_invite_records` to insert:
   - `organisation_invitations` (with `expires_at`, default 7 days)
   - `organisation_members` (`status = 'pending'`, `is_admin = false`)

## Accept-invite flow

Routes:

- `/auth/accept-invite` — password setup UI
- `/auth/accept-invite/confirm` — server-side `token_hash` exchange (recommended email template target)

1. User opens invite link. Supabase's default invite email hits `/auth/v1/verify` (303 redirect) and lands on `redirectTo` with session tokens in the **URL hash** (`#access_token=...&refresh_token=...&type=invite`). The client reads the hash and calls `setSession`.
2. For SSR-friendly links, customise the **Invite user** email template to point at the confirm route:

```html
<a href="{{ .SiteURL }}/auth/accept-invite/confirm?token_hash={{ .TokenHash }}&type=invite">
  Accept invitation
</a>
```

3. App loads `organisation_invitations` for `invited_user_id = auth.uid()`.
4. Invitation must be valid:
   - `invited_user_id` matches the signed-in user
   - `expires_at` is in the future
   - `accepted_at` is null
5. If invalid → show **"This invite is no longer valid."**
6. If valid → user sets password via `updateUser({ password })`.
7. Server action calls `accept_organisation_invitation`, which:
   - Sets `accepted_at = now()`
   - Updates membership `status` from `pending` to `active`
8. User is redirected to `/app/organisation/{organisationId}`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `SUPABASE_SECRET_KEY` | Server-only secret key for `inviteUserByEmail`, member updates, and auth admin calls |
| `NEXT_PUBLIC_SITE_URL` | Used for invite `redirectTo` URL |

## Supabase configuration

Add to redirect URLs:

- `http://localhost:3000/auth/accept-invite`
- `http://localhost:3000/auth/accept-invite/confirm`

Adjust host/port for your environment.

**Testing tip:** Open invite links in a private/incognito window. An existing signed-in session (e.g. the admin who sent the invite) will otherwise be used and the invitation lookup will fail.
