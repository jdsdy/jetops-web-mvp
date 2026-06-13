# API logging

Internal Next.js API routes log each request to the `api_logs` table via `withApiLogging` in `lib/api-logging.ts`.

External API calls (for example JetOps analysis jobs) are not logged here; those are handled by the backend service.

## Logged fields

| Column | Value |
| --- | --- |
| `service` | `nextjs` |
| `method` | HTTP verb (`GET`, `POST`, `PATCH`, `DELETE`, …) |
| `path` | Route pathname from `/api` (query strings excluded) |
| `status_code` | Response status |
| `user_id` | Authenticated profile id, or `null` |
| `organisation_id` | Resolved organisation id when available, otherwise parsed from `/api/organisations/{organisationId}/…`, or `null` |
| `duration_ms` | Handler wall time |
| `error_message` | JSON `{ "error": "…" }` message for failed responses, or unexpected handler error text |

## Excluded data

Logs never store:

- Request bodies (JSON, form data, uploads)
- Successful response bodies

## Usage

Wrap each App Router API handler:

```typescript
import { withApiLogging } from "@/lib/api-logging";

export async function GET(request: Request) {
  return withApiLogging(request, async (logContext) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      logContext.set({ userId: user.id });
    }

    // … handler logic …
    return Response.json(result);
  });
}
```

Set `organisationId` after membership checks when the resolved id is known.

## Tests

Behaviour is covered in `tests/lib/api-logging.test.ts`.
