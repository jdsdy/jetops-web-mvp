# Routes

| Path | Auth required | Description |
| --- | --- | --- |
| `/` | No | Home page with **Go to login** |
| `/auth` | No | Login and signup form |
| `/onboarding` | Yes | Name collection step |
| `/portal/organisation` | Yes | Organisation portal (logout + link to app) |
| `/app/personal` | Yes | Personal app shell |
| `/app/organisation` | Yes | Organisation app shell |

## Organisation portal navigation

`/portal/organisation` includes:

- A confirmation heading showing the current path
- **Go to app/organisation** → `/app/organisation`
- **Logout**

## Testing

Run unit tests for routing helpers:

```bash
npm test
```

Tests live under `tests/` and mirror the source layout (for example, `tests/lib/auth/` for `lib/auth/`). They cover account-type validation, onboarding validation, and redirect paths.
