# Organisation invites

Organisation admins can invite and manage pending members from `/app/organisation/{organisationId}`.

## Requirements

- Inviter must be an active admin: `organisation_members.is_admin = true` and `status = 'active'`
- Invitee receives a custom email with temporary login credentials
- Invite records are stored in `organisation_invitations`
- Pending membership is stored in `organisation_members` with `status = 'pending'`

## API

All organisation invite admin routes require an authenticated active admin of the organisation.

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
| 500 | User creation, record creation, or email send failed |

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

### `POST /api/invites/store-cookie`

Stores an HttpOnly `invite_id` cookie for a valid invitation token. Used by `/auth/accept-invite` (client fetch). Returns JSON only — no redirects.

Request body:

```json
{ "token": "organisation_invitations.id" }
```

| Status | Meaning |
| --- | --- |
| 200 `{ "ok": true }` | Cookie set, or a valid `invite_id` cookie was already present (idempotent fast path) |
| 400/404 `{ "error": "..." }` | Invalid or expired invitation; cookie not set |

Uses the admin client to read `organisation_invitations` before the user is signed in.

### `POST /api/invites/consume-cookie`

Consumes the `invite_id` cookie after sign-in. Used by the `/auth` login form (client fetch). Returns JSON only — no redirects.

Request body:

```json
{ "access_token": "<jwt from sign-in session>" }
```

Flow:

1. Verify JWT server-side with the publishable key (`auth.getUser(access_token)`).
2. If no `invite_id` cookie: return `{ "ok": true, "has_set_password": boolean }` (normal login).
3. If cookie present: admin reads invitation + pending membership; validates expiry, user id, and email match (`user.email` vs `organisation_invitations.email`).
4. On validation failure: clear cookie, return `400` with expired-invite message. Client calls `signOut()`.
5. On success: call `accept_organisation_invitation_atomic` (sole writer of `accepted_at`), sync profile names, clear cookie, return `{ "ok": true, "has_set_password": boolean }`.
6. On transient Supabase errors: **do not** clear the cookie; return `503` with a retry message. Client does **not** sign the user out.

| Status | Meaning |
| --- | --- |
| 200 | Success (with or without invite consumption) |
| 400 | Definitive invite validation failure |
| 401 | Invalid JWT |
| 503 | Transient error — retry |

## Invite creation flow

1. Admin submits invite form on the organisation home page (or `POST` above).
2. API validates session and admin membership via `requireOrgAdmin`.
3. API calls `supabaseAdmin.auth.admin.createUser` with:
   - Invitee email
   - A generated **temporary password** (10 characters)
   - `email_confirm: true`
   - User metadata:

   | Field | Value |
   | --- | --- |
   | `account_type` | `"organisation"` |
   | `f_name` | Invitee first name |
   | `l_initial` | Invitee last initial |
   | `role` | Invited role |
   | `organisation_id` | Organisation uuid |
   | `organisation_slug` | Organisation slug |
   | `organisation_name` | Organisation display name |

4. API sets `profiles.has_set_password = false` for the created user.

5. On success, API calls `create_organisation_invite_records` to insert:
   - `organisation_invitations` (with `expires_at`, default 7 days)
   - `organisation_members` (`status = 'pending'`, `is_admin = false`)
6. API sends an email via Resend containing:
   - The invitee email
   - The temporary password
   - An acceptance link: `/auth/accept-invite?token={organisation_invitations.id}`
   - The inviting organisation name

## Accept-invite flow

Routes:

- `/auth/accept-invite` — client page; calls `POST /api/invites/store-cookie`, then redirects to `/auth` or shows an error
- `/auth/set-password` — forced password reset for invited users after first sign-in

1. User clicks the emailed link: `/auth/accept-invite?token={organisation_invitations.id}`.
2. Client calls `POST /api/invites/store-cookie` with the token. If an `invite_id` cookie is already set, the API returns success immediately (idempotent).
3. On API failure, the page shows an invalid-invite message with a link home. On success, the client redirects to `/auth`.
4. User signs in on `/auth` (browser Supabase client). The client sends the session JWT to `POST /api/invites/consume-cookie`.
5. On consume failure (definitive), the client signs the user out and shows an expired-invite message. On consume success, the client redirects to `/auth/set-password` when `has_set_password` is `false`, otherwise to `/app/callback`.
6. `accept_organisation_invitation_atomic` is the only code path that sets `organisation_invitations.accepted_at`, using `UPDATE ... WHERE accepted_at IS NULL` inside a single transaction.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `SUPABASE_SECRET_KEY` | Server-only secret key for `createUser`, member updates, and auth admin calls |
| `NEXT_PUBLIC_SITE_URL` | Used to build invite accept URLs |
| `RESEND_API_KEY` | Used to send invite emails via Resend |
| `RESEND_FROM` | Email sender address for Resend (defaults to `system@em.jetoperations.net`) |
