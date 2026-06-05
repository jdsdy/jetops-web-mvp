# Onboarding

Onboarding runs after a user signs up (or logs in with an incomplete profile).

## Data collected

| Field | Database column | Notes |
| --- | --- | --- |
| First name | `profiles.f_name` | Required, trimmed |
| Last name initial | `profiles.l_initial` | Required, single character |

The page also reads `profiles.account_type`, set during signup.

## Redirect behaviour

After the user clicks **Continue**, the app updates the profile and redirects:

| `account_type` | Destination |
| --- | --- |
| `organisation` | `/portal/organisation` |
| `personal` | `/app/personal` |

Redirect logic lives in testable helpers in `lib/auth.ts`:

- `validateOnboardingFields` — input validation
- `isOnboardingComplete` — whether name fields are filled
- `getPostOnboardingPath` — destination by account type
- `getRedirectForProfile` — login redirect helper

## Access control

- `/onboarding` requires an authenticated user.
- Users who already completed onboarding are redirected to their account destination.
- Profile updates are allowed by RLS: users may update only their own row.
