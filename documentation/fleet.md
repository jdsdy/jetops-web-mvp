# Organisation fleet

Organisation members view fleet aircraft on `/app/organisation/{organisationId}`. Admins can add aircraft from the shared `aircraft_reference` catalogue.

## Data model

| Table | Purpose |
| --- | --- |
| `aircraft_reference` | Global catalogue of aircraft types (manufacturer, model, dimensions, weight class, etc.) |
| `fleet_aircraft` | Organisation-specific aircraft linked to `aircraft_reference` via `aircraft_ref_id` |

Fleet rows denormalise `manufacturer` and `model` from the reference row at insert time.

## Row level security

| Table | Policy |
| --- | --- |
| `aircraft_reference` | Authenticated users can `SELECT` |
| `fleet_aircraft` | Active organisation members can `SELECT` rows for their org via `private.is_active_org_member` |

Admin inserts, updates, and deletes use the secret-key client after an admin check in the API route.

## API

### `GET /api/aircraft-reference`

Lists aircraft reference data grouped by manufacturer for dropdown menus.

Auth: any authenticated user.

Response: `200`

```json
[
  {
    "manufacturer": "Gulfstream",
    "models": [
      { "id": 1, "model": "G700" },
      { "id": 2, "model": "G650" }
    ]
  }
]
```

### `GET /api/organisations/{organisationId}/fleet`

Lists fleet aircraft for the organisation.

Auth: active organisation member.

Response: `200`

```json
[
  {
    "id": "uuid",
    "manufacturer": "Gulfstream",
    "model": "G700",
    "tail_number": "N123AB",
    "seats": 8,
    "rnav_equipped": false
  }
]
```

### `POST /api/organisations/{organisationId}/fleet`

Adds an aircraft to the organisation fleet.

Auth: active organisation admin.

Request body:

```json
{
  "aircraft_ref_id": 1,
  "tail_number": "N123AB",
  "seats": 8,
  "rnav_equipped": false
}
```

| Field | Rules |
| --- | --- |
| `aircraft_ref_id` | Positive integer referencing `aircraft_reference.id` |
| `tail_number` | Non-empty trimmed string |
| `seats` | Integer between 1 and 32767 |
| `rnav_equipped` | Boolean |

`manufacturer`, `model`, and `custom_data` are not accepted from the client. The server copies manufacturer and model from the reference row and stores `custom_data` as `null`.

Response: `201` with the created fleet aircraft row.

| Status | Meaning |
| --- | --- |
| 400 | Invalid payload or unknown aircraft reference |
| 401 | No authenticated session |
| 403 | User is not an active admin |
| 500 | Insert failed |

### `PATCH /api/organisations/{organisationId}/fleet/{aircraftId}`

Updates editable fields on a fleet aircraft.

Auth: active organisation admin.

Request body:

```json
{
  "tail_number": "N456CD",
  "seats": 10,
  "rnav_equipped": true
}
```

| Field | Rules |
| --- | --- |
| `tail_number` | Non-empty trimmed string |
| `seats` | Integer between 1 and 32767 |
| `rnav_equipped` | Boolean |

`manufacturer`, `model`, `aircraft_ref_id`, and `custom_data` are not accepted from the client.

Response: `200` with the updated fleet aircraft row.

| Status | Meaning |
| --- | --- |
| 400 | Invalid payload |
| 401 | No authenticated session |
| 403 | User is not an active admin |
| 404 | Aircraft not found in this organisation |
| 500 | Update failed |

### `DELETE /api/organisations/{organisationId}/fleet/{aircraftId}`

Removes a fleet aircraft from the organisation.

Auth: active organisation admin.

Response: `204` with no body.

| Status | Meaning |
| --- | --- |
| 401 | No authenticated session |
| 403 | User is not an active admin |
| 404 | Aircraft not found in this organisation |
| 500 | Delete failed |

## Portal UI

On `/app/organisation/{organisationId}`:

- All active members see the fleet list (manufacturer, model, tail number)
- Admins also see a **Manage** button on each aircraft that opens a dialog to update tail number, seats, RNAV equipped, or delete the aircraft
- Admins also see an **Add aircraft** form with:
  - Manufacturer dropdown
  - Model dropdown (enabled after manufacturer selection)
  - Tail number, seats, RNAV equipped toggle
  - Disabled custom data field (placeholder for future use)

## Tests

Helpers are covered in `tests/lib/fleet.test.ts`.
