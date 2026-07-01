# Personal app

Personal accounts use the same Flights and Fleet features as organisations, scoped to a single user via `user_id` on `fleet_aircraft`, `flights`, and `analysis_jobs`. There is no Users section and no organisation setup step after onboarding.

## Routes

| Path | Description |
| --- | --- |
| `/app/personal` | Flights list and create-flight form |
| `/app/personal/fleet` | Fleet management (owner always has manage access) |
| `/app/personal/flights` | Flight analysis page (`?id=` and `?jobId=` required) |

Portal sections live under `app/app/personal/(portal)/`. The analysis page sits outside the portal route group with its own layout (same pattern as organisation).

## Onboarding

After name collection on `/onboarding`, personal users redirect to `/app/personal` — they never visit `/app/callback` or `/app/organisation/setup`.

Login and set-password redirects use `getRedirectForProfile` from `lib/auth.ts`.

## Data model

Personal rows use `user_id = profiles.id` (the authenticated user). Organisation rows continue to use `organisation_id`.

| Table | Personal scoping |
| --- | --- |
| `fleet_aircraft` | `user_id` set; `organisation_id` null |
| `flights` | `user_id` set; `organisation_id` null; `pic_user_id` defaults to the account owner |
| `analysis_jobs` | `user_id` set; `organisation_id` null |

Check constraints require at least one of `organisation_id` or `user_id` on `fleet_aircraft` and `flights`.

Storage bucket `flight_plan_pdfs` object path format for personal flights:

```
{user_id}/{flight_id}/{flight_plan_id}/{filename}.pdf
```

## Row level security

Applied migration `personal_account_support`:

| Resource | Policy |
| --- | --- |
| `fleet_aircraft` | Owners can `SELECT` where `user_id = auth.uid()` |
| `flights` | Owners can `SELECT` where `user_id = auth.uid()` |
| `flight_plans` | Owners can `SELECT` plans for owned flights |
| `analysis_jobs` | Owners can `SELECT` where `user_id = auth.uid()` |
| `raw_notams` / `analysed_notams` | Owners can `SELECT` via owned analysis jobs |
| `storage.objects` (`flight_plan_pdfs`) | Owners can `SELECT` when the first path segment equals `auth.uid()::text` |

Creates and uploads use the secret-key client after a personal account check in the API route.

## Domain helpers

| File | Purpose |
| --- | --- |
| `lib/personal.ts` | Personal paths, `requirePersonalAccount`, `resolvePersonalRouteAccess` |
| `lib/fleet.ts` | `getPersonalFleet` |
| `lib/flights.ts` | `getPersonalFlights`, `validateCreatePersonalFlightFormData`, `validateReuploadFlightPlanFormData`, `buildJetOpsJobCreateBody`, `buildFlightAnalysisRequestBodyForUser` |

Tests: `tests/lib/personal.test.ts`.

## API

Personal routes mirror organisation routes under `/api/personal/`. Auth: session user with `profiles.account_type = 'personal'`.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/personal/fleet` | List personal fleet |
| `POST` | `/api/personal/fleet` | Add aircraft |
| `PATCH` | `/api/personal/fleet/{aircraftId}` | Update aircraft |
| `DELETE` | `/api/personal/fleet/{aircraftId}` | Delete aircraft |
| `POST` | `/api/personal/flights` | Create flight with PDF upload and trigger analysis |
| `POST` | `/api/personal/flights/{flightId}/reupload` | Replace current flight plan PDF and trigger a new extraction job |
| `GET` | `/api/personal/flights/{flightId}` | Poll analysis job status (`?jobId=`) |
| `PATCH` | `/api/personal/flights/{flightId}` | Update extracted flight details |
| `POST` | `/api/personal/flights/{flightId}/analysis` | Trigger downstream analysis |
| `POST` | `/api/personal/flights/{flightId}/notam-feedback` | Submit NOTAM feedback |

### `POST /api/personal/flights`

Request: `multipart/form-data`

| Field | Type |
| --- | --- |
| `aircraft_id` | uuid (`fleet_aircraft.id` owned by user) |
| `flight_plan` | PDF file (max 10MB) |

PIC is set automatically to the authenticated user. JetOps job create body uses `user_id` instead of `organisation_id`:

```json
{
  "user_id": "uuid",
  "flight_id": "uuid",
  "flight_plan_id": "uuid",
  "storage_path": "{user_id}/{flight_id}/{flight_plan_id}/{filename}.pdf"
}
```

Analysis trigger (`POST .../analysis`) sends `user_id` in the JetOps request body.

See [flights.md](./flights.md) and [fleet.md](./fleet.md) for shared validation and analysis behaviour.

## UI

- Shell: `components/personal-app-shell.tsx` (Flights + Fleet nav only)
- Reuses organisation section components (`FlightsSection`, `FleetSection`, flight analysis components) with personal API paths
- Flight analysis components accept `flightsApiBasePath` (e.g. `/api/personal/flights`)

## Database migration SQL

```sql
ALTER TABLE public.flights ALTER COLUMN organisation_id DROP NOT NULL;

ALTER TABLE public.flights
  ADD CONSTRAINT flights_requires_org_or_user CHECK (
    organisation_id IS NOT NULL OR user_id IS NOT NULL
  );
```

Plus personal owner `SELECT` RLS policies on flights, fleet, analysis jobs, flight plans, NOTAM tables, and storage (see migration `personal_account_support` in Supabase).
