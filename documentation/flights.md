# Flights

Organisation members create flights and upload PDF flight plans from `/app/organisation/{organisationId}`. After creation they are redirected to `/app/organisation/{organisationId}/flights?id={flight_id}&jobId={job_id}` to track analysis progress.

## Data model

| Table | Purpose |
| --- | --- |
| `flights` | Organisation flight record (aircraft, PIC, departure/arrival ICAO) |
| `flight_plans` | Uploaded flight plan PDF metadata and extracted route/timing fields |
| `analysis_jobs` | External analysis job status polled from the flights page |
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

### `GET /api/organisations/{organisationId}/flights/{flightId}`

Returns the current `analysis_jobs.status` for a flight and job.

Auth: active organisation member.

Query:

| Param | Type |
| --- | --- |
| `jobId` | uuid (`analysis_jobs.id` for the flight) |

Response: `200`

```json
{
  "job_id": "uuid",
  "status": "processing_extraction"
}
```

The handler verifies the flight belongs to the organisation and that the job is linked to that flight via `flight_plans`.

| Status | Meaning |
| --- | --- |
| 400 | Missing `jobId` |
| 401 | No authenticated session |
| 403 | User is not an active member |
| 404 | Flight or job not found |

### `PATCH /api/organisations/{organisationId}/flights/{flightId}`

Updates extracted flight and flight plan fields while the linked analysis job is `awaiting_confirmation`.

Auth: active organisation member.

Request: `application/json`

| Field | Type |
| --- | --- |
| `job_id` | uuid (`analysis_jobs.id` for the current flight plan) |
| `departure_icao` | string or null |
| `arrival_icao` | string or null |
| `source_app` | string or null |
| `route` | string or null |
| `cruise_level` | string or null |
| `dept_rwy` | string or null |
| `arr_rwy` | string or null |
| `planned_dept_time` | ISO datetime string in UTC or null |
| `planned_arr_time` | ISO datetime string in UTC or null |
| `alt_icao` | string or null |

Response: `200` with the saved extraction fields.

| Status | Meaning |
| --- | --- |
| 400 | Invalid payload or job/plan mismatch |
| 401 | No authenticated session |
| 403 | User is not an active member |
| 404 | Flight, plan, or job not found |
| 409 | Job is not awaiting confirmation |
| 500 | Database error |

### `POST /api/organisations/{organisationId}/flights/{flightId}/analysis`

Starts downstream analysis for a confirmed extraction while the linked job is `awaiting_confirmation`.

Auth: active organisation member.

Request: `application/json`

| Field | Type |
| --- | --- |
| `job_id` | uuid (`analysis_jobs.id` for the current flight plan) |

Forwards to `POST {JETOPS_API_URL}/v1/jobs/analysis` with the user JWT, `X-API-KEY`, and body:

```json
{
  "organisation_id": "uuid",
  "flight_id": "uuid",
  "job_id": "uuid",
  "flight_plan_id": "uuid"
}
```

Response: `200`

```json
{
  "response_begun": true
}
```

| Status | Meaning |
| --- | --- |
| 400 | Invalid payload or job/plan mismatch |
| 401 | No authenticated session |
| 403 | User is not an active member |
| 404 | Flight, plan, or job not found |
| 409 | Job is not awaiting confirmation |
| 502 | External analysis service error or unexpected response |
| 500 | Missing API key |

## Analysed NOTAMs

During analysis the external service writes rows to `analysed_notams` (linked to `raw_notams` via `notam_id`). Job status drives what the flights page shows:

| Status | Display |
| --- | --- |
| `retrying` | Classified NOTAMs grouped by category; count of NOTAMs still processing (`did_error = false` and missing `category` / `summary`) |
| `partial_finish` | Classified NOTAMs, failed NOTAMs (`did_error = true`), plus remaining unclassified NOTAMs loaded from `raw_notams` |
| `finished` | All NOTAMs classified and grouped by category |

`analysed_notams.did_error` is set when the retry mechanism could not classify a NOTAM. Failed rows are shown separately with their raw NOTAM text.

The flights page polls job status while `retrying` so partial results refresh until the job reaches `finished` or `partial_finish`.

| Table / resource | Policy |
| --- | --- |
| `analysed_notams` | Active org members can `SELECT` via `anaysis_job_id` → `analysis_jobs` |

## App UI

### `/app/organisation/{organisationId}`

- Membership guard via `getActiveMembership`
- Lists existing flights with links to the flight status page
- **Create flight** form: aircraft dropdown (tail + model), PIC dropdown (display name + role), PDF upload
- Redirect on success to flights page with `id` and `jobId` query params

### `/app/organisation/{organisationId}/flights?id={flight_id}&jobId={job_id}`

- Same slug membership guard
- Server-renders extraction fields, raw NOTAMs, and analysed NOTAMs when the linked job is already past extraction or analysis so reopening a finished flight does not depend on client polling
- Polls `GET /api/organisations/{organisationId}/flights/{flightId}?jobId={job_id}` every 3 seconds while the job status is `processing_extraction`, `processing_analysis`, or `retrying`
- Stops polling when the status is `awaiting_confirmation`, `finished`, `partial_finish`, or another terminal state
- Restarts polling after **Analyse** is triggered so `processing_analysis` updates are received
- Displays the analysis job status from the polling endpoint
- Loads extracted fields from the database when the job is already `awaiting_confirmation` on first check, or when status changes from `processing_extraction` to `awaiting_confirmation`
- At `awaiting_confirmation`, extracted flight plan fields are editable; members can save corrections via `PATCH /api/organisations/{organisationId}/flights/{flightId}` before triggering analysis
- **Analyse** calls `POST /api/organisations/{organisationId}/flights/{flightId}/analysis` to start NOTAM analysis; a `response_begun: true` response shows an in-progress message until the job finishes
- When `analysis_jobs.status` is `retrying`, `partial_finish`, or `finished`, analysed NOTAMs are loaded from `analysed_notams` (joined to `raw_notams`) and shown grouped by category; `retrying` also shows how many NOTAMs are still processing; `partial_finish` also shows unclassified NOTAMs from `raw_notams`
- Also shows extraction for later statuses (`processing_analysis`, `complete`) using the server-rendered initial values
- Loads NOTAMs from `raw_notams` using both `analysis_job_id` and `flight_plan_id` when extraction is shown
- Displays the NOTAM count with an expand/collapse list; multiline NOTAM fields render `{\n}` placeholders as line breaks

## Tests

Helpers are covered in `tests/lib/flights.test.ts`.
