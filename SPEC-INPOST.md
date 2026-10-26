# SPEC — InPost Global API node for n8n (v0.1)

Status: draft. Facts checked on 2026-10-21 against developers.inpost-group.com
and the OpenAPI specs listed in `CLAUDE.md`. When a spec disagrees with this
file, the spec wins — update this file.

## 1. Package

- Proposed npm name: `n8n-nodes-inpost-global`. Check on npmjs.com that it is
  free. `n8n-nodes-inpost` is already taken by a ShipX-based package, so our
  name and README must make the "Global API" difference clear.
- Node: `InPost` (declarative style). Credentials: `inPostGlobalOAuth2Api`.
- Resources in v0.1: Point, Tracking, Shipment, Pickup.

## 2. Credentials — `inPostGlobalOAuth2Api`

| Field | Type | Notes |
| --- | --- | --- |
| Environment | options: Stage (Sandbox) / Production | Default Stage. Drives the token URL and the API base URL |
| Client ID | string | Issued by the InPost Integration Team or the merchant portal |
| Client Secret | password | |
| Organization ID | string | Needed by Shipment and Pickup |
| Scope | string | Default: all six scopes, space-separated. The user deletes scopes their client does not have |

Implementation notes:

- `extends = ['oAuth2Api']`. Hidden fields: `grantType = 'clientCredentials'`;
  `accessTokenUrl` as an expression on `environment`; `authentication` =
  `header` (HTTP Basic). If the token request fails, try `body`.
- The node's `requestDefaults.baseURL` is an expression on
  `$credentials.environment`.
- Add a credential test (for example `GET /location/v1/points?perPage=1`) if
  n8n supports tests for OAuth2 client-credentials credentials.

## 3. Resources and operations

### 3.1 Point — Location API (`api:points:read`)

| Operation | Endpoint | Inputs |
| --- | --- | --- |
| Get | `GET /location/v1/points/{id}` | Point ID in the form `{country}_{name}` (for example `PL_KRA02APP`). Option: Language |
| Get Many | `GET /location/v1/points` | Return All / Limit (`page` from 1, `perPage` up to 1000). Filters (query names `address.country`, `address.city`, `address.postalCode`, `address.administrativeArea`, `type`, `capabilities`, `updatedFrom`, `updatedTo`): Country (ISO 3166-1 alpha-2), City, Postal Code, Administrative Area (each accepts a comma-separated list), Type (`APM` = parcel locker, `PUDO` = pick-up/drop-off point), Capabilities (`PARCEL_COLLECT`, `PARCEL_SEND`, `COOLED_DEPOSIT`), Updated From / Updated To (YYYY-MM-DD; Updated To only together with Updated From; without Updated To, Updated From may be at most 3 days in the past). Option: Language (`Accept-Language` header) |
| Search Nearby | `GET /location/v1/points/search-by-location` | Search By: Coordinates (`latitude,longitude` → `relativePoint`) or Postal Code (`relativePostCode`), never both. Max Distance in metres (default 10000, max 50000), Limit (`limit`; the endpoint is also paged with `page`/`perPage`), Country (`address.country`), Type, Capabilities. Option: Language. Each result has `distance` (metres) |

Responses (checked in `points-v1.json` on 2026-10-26): lists return
`{ count, page, perPage, totalPages, items[] }`; one point has `id`, `type`,
`displayName`, `country`, `locationType`, `imageUrl`, `coordinates`,
`location247`, `capabilities`, `address`, `description`/`description2`/
`description3` (`{ content, translations }`) and `operatingHours`; Get adds
`guaranteedLockerTemperatures`. More than 10 fields, so the node needs a
Simplify toggle.

### 3.2 Tracking — Tracking API (`api:tracking:read`)

| Operation | Endpoint | Inputs |
| --- | --- | --- |
| Get Events | `GET /tracking/v1/parcels` | Tracking Numbers (comma-separated, at most 10 per request → `trackingNumbers`). Option: Event Version (`x-inpost-event-version` header; empty = latest) |

Notes (checked in `tracking-v1.json` on 2026-10-26):

- Tracking data is kept for 121 days.
- `trackingNumbers` is an array query parameter with the OpenAPI default
  (form, explode), so several numbers go as a repeated parameter:
  `?trackingNumbers=A&trackingNumbers=B`. The node sends them with
  `arrayFormat: repeat` and stops with a clear message above 10 numbers.
- Root shape conflict in the spec: the 200 schema is an array of
  `{ parcels: [...] }`, while the example is a single `{ parcels: [...] }`.
  The node accepts both and outputs one item per parcel. Confirm on stage.
- Each parcel has 9 fields (`trackingNumber`, `status`, `events`,
  `origin`, `destination`, `delivery`, `shipment`, `returnToSender`,
  `deliveryTimeWindow`), so no Simplify toggle is needed. `status` (parcel
  and event) is filled only on the UK market; elsewhere use `eventCode`.
  Location `type`: `LOCKER_POINT`, `LOGISTIC_CENTER`, `PUDO_POINT`,
  `ADDRESS`, `MPOK_POINT`.
- Errors use RFC 9457 problem details (`type`, `title`, `status`, `detail`).
- Event codes: https://developers.inpost-group.com/tracking-events
- Unknown numbers: the spec does not say what InPost returns for them. The
  node compares the requested numbers with the returned parcels and stops with
  a message naming the missing ones (users can choose On Error: Continue).
  To check on stage: whether an unknown number is left out of `parcels`, comes
  back with empty `events`, or causes a 4xx response (in that case n8n shows
  InPost's own problem message instead).

### 3.3 Shipment — Shipping API v2

| Operation | Endpoint | Scope |
| --- | --- | --- |
| Create | `POST /shipping/v2/organizations/{organizationId}/shipments` | `api:shipments:write` |
| Get | `GET /shipping/v2/organizations/{organizationId}/shipments/{trackingNumber}` | `api:shipments:read` |
| Get Label | `GET /shipping/v2/organizations/{organizationId}/shipments/{trackingNumber}/label` | `api:shipments:write` |

This API version has no list endpoint and no cancel endpoint.

Create — request body (`shipping-v32.json`):

- `sender`*, `recipient`*: `firstName`*, `lastName`*, `email`*, `phone`*,
  `companyName`.
- `origin`* (discriminator `origin`):
  - `anyPoint`: `countryCode`*, `shippingMethod`* (`APM` | `PUDO` | `HUB` |
    `ANY_POINT`), `subdivisionCode` (UK only).
  - `address`: `countryCode`*, `street`*, `houseNumber`, `flatNumber`,
    `city`*, `postalCode`*.
- `destination`* (discriminator `destination`):
  - `point`: `countryCode`*, `pointId`*.
  - `address`: same fields as the origin address.
- `parcels`* (array, discriminator `type`): `STANDARD` → `dimensions`*
  (`length`, `width`, `height`, `unit` `MM` | `CM` | `M`), `weight`*
  (`amount`, `unit` `G` | `KG`), `nonStandardShape`, `references`
  (`trackableReference`, `custom`). `RVM` exists but is out of scope.
- `productVariant`: `STANDARD` | `COURIER`. `brand`: `INPOST`.
- `valueAddedServices` (array, discriminator `valueAddedService`):
  - `standardValueAdded`: `id` `priority` (value `STANDARD` | `EXPRESS`) or
    `deliveryBetween` (value = a time window from the spec's enum, for example
    `08:00-10:00`).
  - `flagValueAdded`: `id` `saturdayDelivery` | `smsNotification` |
    `emailNotification` | `returnOfDocuments` | `proof_of_delivery` |
    `cross_dock` | `eveningDelivery`, `value` boolean.
  - `currencyValueAdded`: `id` `cashOnDelivery` | `additionalCover`, `value`
    0–5000, `currency` `PLN` | `EUR`.
- Optional: `returnDestination`, `references.custom`, `enableDropOffCode`.
  `customsClearance` is out of scope for v0.1.
- Header `X-Deduplication-Id` → option "Deduplication ID", which protects
  against duplicate shipments when a workflow retries.
- Response 201: `trackingNumber`, `parcels[].parcelNumbers`, `routing`.

Create — UI proposal (build the nested body in a `preSend` function):

- Delivery To: Point (→ Point ID) or Address.
- Send From: Any InPost Point (→ shipping method) or Address.
- Sender and Recipient: first name, last name, email, phone, company.
- Parcels: a fixed collection allowing several parcels, with dimensions,
  weight and their units.
- Additional Fields: Product Variant, Cash on Delivery (amount + currency),
  Additional Cover (amount + currency), SMS Notification, Email Notification,
  Saturday Delivery, Evening Delivery, Priority, Delivery Window, Enable
  Drop-Off Code, Reference, Deduplication ID.

Rules from the spec (checked 2026-10-26), enforced or hinted in the node:

- The JSON body has no discriminator keys: origin, destination and value-added
  services are told apart by their fields (see the spec's request example).
- Destination `pointId` has no country prefix (`KRA09N`), while the
  Location API returns `PL_KRA09N`; the node strips `{countryCode}_`.
  Confirm on stage.
- Shipments from or to a point have exactly one parcel (node stops early).
- Courier COD needs `additionalCover` ≥ the COD amount (node stops early).
  Currency: PLN for PL-domestic, EUR cross-border.
- Phones in E.164 (`+48…`); without `+` the origin/destination country is
  assumed.
- `X-Deduplication-Id` must be a UUID (node checks the format).
- At most 3 `references.custom` pairs (node checks).
- `returnDestination` works for PL-domestic only and is left out of v0.1, as
  are `customsClearance`, RVM parcels and `remarks` (label print fields).
- Most value-added services are PL-domestic, courier address-to-address only;
  unavailable ones come back as `valueAddedServices.<id>: ["unavailable"]`.
- 400 responses carry an `errors` object (field → messages). n8n shows the
  title and the full response in the error details. To check on stage whether
  that is readable enough.

Get Label:

- Format → `Accept` header. The spec documents only a JSON response
  `{ label: { content: <base64> } }` and offers a `+json` variant of every
  format, so the node asks for: PDF A6 (`application/pdf+json;format=A6`,
  default), PDF A4 (`application/pdf+json;format=A4`), ZPL 203 dpi
  (`text/zpl+json;dpi=203`), ZPL 300 dpi (`text/zpl+json;dpi=300`), EPL2
  203 dpi (`text/epl2+json;dpi=203`, Polish domestic services only). DPL is
  left out (pilot); PNG is not in the spec.
- A post-receive function decodes the base64 into binary data in the field
  named by "Put Output File in Field" (default `data`), file name
  `label-<trackingNumber>.<pdf|zpl|epl>`. (Checked 2026-10-26; the old plan
  with `encoding: 'arraybuffer'` does not match the spec.)

### 3.4 Pickup — One-time pickups API (`api:one-time-pickups:read` / `:write`)

| Operation | Endpoint |
| --- | --- |
| Create | `POST /pickups/v1/organizations/{organizationId}/one-time-pickups` |
| Get | `GET /pickups/v1/organizations/{organizationId}/one-time-pickups/{orderId}` |
| Get Many | `GET /pickups/v1/organizations/{organizationId}/one-time-pickups` (`page`, `size`, `sort`) |
| Cancel | `PUT /pickups/v1/organizations/{organizationId}/one-time-pickups/{orderId}/cancel` |
| Get Cut-off Time | `GET /pickups/v1/cutoff-time` (`postalCode`*, `countryCode`*) |

Create — request body:

- `address`*: `countryCode` (`PL`), `city`, `postalCode`, `street`,
  `houseNumber`, `flatNumber`, `locationDescription`.
- `contactPerson`*: `firstName`, `lastName`, `email`, `phone` (`prefix`,
  `number`).
- `pickupTime`*: `from`, `to` (ISO date-time).
- `volume`*, one of two variants: `itemType` (`PARCEL` | `PALLET` |
  `RECYCLABLE_PACKAGING`) + `count` + `totalWeight` (`amount`, `unit` `KG` |
  `DAG` | `G`); or `itemType` + `count` + `totalVolume` (`amount`, unit `L`)
  together with `trackingNumbers`*.
- `references.custom` (optional).

Business rules to show as hints: Poland only; the merchant needs an active
logistics contract; book up to 7 days ahead; the window is on one day, usually
09:00–18:00; `to` is at least 120 minutes after `from` and after the request
time; send before the postcode's cut-off; no second pickup for the same address
and time unless the location description differs.

Statuses — still open: `CREATED`, `PENDING`, `RESCHEDULED`. Final:
`COLLECTED`, `CANCELLED`, `DUPLICATED`, `NONCOMPLIANT`, `INVALIDATED`,
`INFEASIBLE`, `UNLABELLED`, `EMPTY`.

Checked in `one-time-pickups-v3.json` on 2026-10-26:

- Required address fields: `countryCode`, `street`, `houseNumber`,
  `city`, `postalCode`. Required contact fields: all four.
- `phone.prefix` must be `+48` (Polish numbers only). The node has one
  Phone field and splits it (accepts `512345678`, `+48 512 345 678`,
  `0048…`).
- `pickupTime` needs a date-time with an offset. The node reads the date
  pickers in the workflow time zone and sends e.g. `2026-10-28T09:00:00+01:00`.
  It stops early when the window spans two days, is shorter than 120 minutes,
  is already over, or starts more than 7 days ahead.
- Get Many: `page` is zero-based, page size is `size`; the response is
  `{ page, count, perPage, totalPages, items[] }`. The node pages while
  `page + 1 < totalPages`. To check on stage: whether the response `page`
  is zero-based too, and which `sort` properties are accepted (the node
  offers `createdTime` and `lastModifiedTime`).
- A pickup order has 12–13 fields, so Get and Get Many have a Simplify toggle
  (`id`, `status`, `isOpen`, `pickupFrom`, `pickupTo`, one-line
  `address`, `itemType`, `count`, `carrierTrackingNumber`,
  `createdTime`). `isOpen` is true for the still-open statuses above.
- Cancel returns 200 with no body ("cancellation initiated"); the node outputs
  `{ id, cancelRequested: true }`.
- Cut-off: the schema says `{ hour, minute, second, nano }`, the example
  says `"13:00:00"`. The node accepts both and outputs `"HH:MM"`.
  Only Polish postal codes (`00-000`); the node always sends
  `countryCode=PL`.
- `references.custom` has `maxLength: 3` on both the object and the values,
  which looks like a spec slip for "at most 3 pairs". The node allows at most
  3 pairs and does not limit value length. To check on stage.
- The spec's organization and order IDs are UUIDs.

## 4. Milestones

| Milestone | Scope | Done when |
| --- | --- | --- |
| M1 | Credentials and an empty InPost node; package metadata (`author`, `repository`, `homepage`) and the copyright line in `LICENSE.md` (now "Copyright 2022 n8n"); remove the template's `nodes/Example`, `nodes/GithubIssues`, the GitHub credentials and icons, and update the `n8n` lists in `package.json`; recreate `.github/workflows/publish.yml`, `.github/workflows/ci.yml` and `.vscode/extensions.json` (see `CLAUDE.md`) | The credential saves in n8n and a stage request gets a token |
| M2 | Point: Get, Get Many (with Return All), Search Nearby | All three return real stage data |
| M3 | Tracking: Get Events | Events come back for a stage tracking number |
| M4 | Shipment: Create, Get, Get Label | A stage shipment is created and its PDF label downloads |
| M5 | Pickup: Create, Get, Get Many, Cancel, Get Cut-off Time | A stage pickup is created and cancelled |
| M6 | Verification polish: README (operations, how to get credentials, example workflow), icon, node categories, package.json fields, UX review | Lint clean and the verification checklist passes |

## 5. Out of scope for v0.1

- A trigger node for InPost webhooks (programmatic style, signature check:
  https://developers.inpost-group.com/webhook-signature-verification).
- Returns, Deposits, customs clearance and RVM parcels.

## 6. Open questions for InPost

- Is the Shipping API available on stage for Polish domestic services for our
  client?
- Which token URL applies to pickups: `api.inpost-group.com` or
  `account.inpost-group.com`?
- Does our client have all six scopes, and what is our Organization ID?
- May the node use the InPost logo as its icon under InPost's brand rules?
- `shipping-v32.json` declares only a `Bearer` security scheme, but its
  operations reference an undefined `oauth2` scheme. We assume the same OAuth2
  token as the other APIs (checked 2026-10-21; confirm on stage in M4).

## 7. Verification status (M6, 2026-10-26)

Done: lint clean; no runtime dependencies, no `process.env`, no file system
access; MIT; English-only UI; README with operations, credentials, an example
workflow (`examples/ship-to-nearest-locker.json`) and tips; codex category
`Sales` with aliases; credential documentation link to the README; actions
without articles, Get Many descriptions "Retrieve a list of …", placeholders
starting with "e.g.", field names in single quotes in messages, `itemIndex` on
every node message; Simplify on Point and Pickup reads; publish workflow with
npm provenance.

Still open before submitting to n8n:

- Stage tests of M1–M5 (no stage credentials yet).
- Icon: neutral parcel icon until InPost answers the logo question (§6).
- Resource Locator ("From list") is not used: Point ID, Tracking Number and
  Order ID are plain text fields. Pickup Order ID could get a list search
  later if reviewers ask.
- Public GitHub repo `werawolosz/n8n-nodes-inpost-global`, npm Trusted
  Publishing, first release, then `npx @n8n/scan-community-package
  n8n-nodes-inpost-global`.
