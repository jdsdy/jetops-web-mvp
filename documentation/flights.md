# Flights

Organisation members create flights and upload PDF flight plans from `/app/organisation/{organisationId}`. After creation they are redirected to `/app/organisation/{organisationId}/flights?id={flight_id}&jobId={job_id}` to track analysis progress.

## Data model

| Table | Purpose |
| --- | --- |
| `flights` | Organisation flight record (aircraft, PIC, departure/arrival ICAO) |
| `flight_plans` | Uploaded flight plan PDF metadata and extracted route/timing fields |
| `analysis_jobs` | External analysis job status tracked via Realtime |
| `raw_notams` | Extracted NOTAM text linked to an analysis job and flight plan |

Storage bucket: `flight_plan_pdfs` (private).

Object path format:

```
{organisation_id}/{flight_id}/{flight_plan_id}/{filename}.pdf
```

## Row level security

| Table / resource | Policy |
| --- | --- |
| `flights` | Active org members can `SELECT` |
| `flight_plans` | Active org members can `SELECT` plans for org flights |
| `analysis_jobs` | Active org members can `SELECT` |
| `raw_notams` | Active org members can `SELECT` NOTAMs for org analysis jobs |
| `storage.objects` (`flight_plan_pdfs`) | Active org members can `SELECT` (download) objects whose first path segment matches their organisation |

Creates and uploads use the secret-key client after an active membership check in the API route.

## Environment variables

```
JETOPS_API_URL=http://127.0.0.1:8000
JETOPS_API_KEY=your-api-key
```

## API

### `POST /api/organisations/{organisationId}/flights`

Creates a flight, uploads a PDF flight plan, and triggers external analysis.

Auth: active organisation member (not admin-only).

Request: `multipart/form-data`

| Field | Type |
| --- | --- |
| `aircraft_id` | uuid (`fleet_aircraft.id`) |
| `pic_user_id` | uuid (`profiles.id` / active member `user_id`) |
| `flight_plan` | PDF file (max 10MB) |

Response: `201`

```json
{
  "flight_id": "uuid",
  "flight_plan_id": "uuid",
  "job_id": "uuid"
}
```

Handler steps:

1. Insert `flights` row
2. Insert `flight_plans` row
3. Upload PDF to `flight_plan_pdfs`
4. Update `flight_plans.storage_path`
5. `POST {JETOPS_API_URL}/v1/jobs` with user JWT, `X-API-KEY`, and org/flight/plan/storage path
6. Return external job `id` as `job_id`

On failure after partial writes, uploaded objects and DB rows are rolled back.

| Status | Meaning |
| --- | --- |
| 400 | Invalid payload or aircraft/PIC not in org |
| 401 | No authenticated session |
| 403 | User is not an active member |
| 502 | External analysis service error |
| 500 | Database, storage, or missing API key |

## App UI

### `/app/organisation/{organisationId}`

- Membership guard via `getActiveMembership`
- Lists existing flights with links to the flight status page
- **Create flight** form: aircraft dropdown (tail + model), PIC dropdown (display name + role), PDF upload
- Redirect on success to flights page with `id` and `jobId` query params

### `/app/organisation/{organisationId}/flights?id={flight_id}&jobId={job_id}`

- Same slug membership guard
- Subscribes to `analysis_jobs` Realtime updates for the job id
- Performs an initial fetch fallback so fast status transitions are not missed
- Displays the analysis job status (updated via Realtime on `analysis_jobs` only)
- Loads extracted fields from the database when the job is already `awaiting_confirmation` on first check, or when status changes from `processing_extraction` to `awaiting_confirmation`
- Also shows extraction for later statuses (`processing_analysis`, `complete`) using the server-rendered initial values
- Loads NOTAMs from `raw_notams` using both `analysis_job_id` and `flight_plan_id` when extraction is shown
- Displays the NOTAM count with an expand/collapse list; multiline NOTAM fields render `{\n}` placeholders as line breaks

## Tests

Helpers are covered in `tests/lib/flights.test.ts`.
