# n8n-nodes-inpost-global

This is an n8n community node. It lets you use the [InPost Global API](https://developers.inpost-group.com/) in your n8n workflows.

InPost is a parcel delivery company known for its parcel lockers (Paczkomaty). Its Global API covers pick-up points, tracking, shipments, labels and courier pickups.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Feedback and contributing](#feedback-and-contributing)  
[Resources](#resources)  
[Version history](#version-history)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

### Point

Parcel lockers (APM) and ParcelPoints (PUDO) from the InPost Location API. Needs the `api:points:read` scope.

- **Get**: get one point by its ID, for example `PL_KRA02APP` (country code, underscore, point name).
- **Get Many**: list points. Turn on **Return All** to fetch every page, or set a **Limit** (up to 1000). Filters:
  - Country (two-letter code, for example `PL`)
  - City, Postal Code, Administrative Area (separate several values with commas)
  - Type: Parcel Locker (APM), ParcelPoint (PUDO)
  - Capabilities: Collect Parcels, Send Parcels, Cooled Deposit
  - Updated From / Updated To: points changed in a date range. Without Updated To, Updated From can be at most 3 days in the past.
- **Search Nearby**: find the points closest to coordinates (latitude and longitude) or to a postal code, within a maximum distance in meters (default 10000, maximum 50000). Searching by postal code also needs the **Country** of that postal code: exactly one two-letter code, for example `PL`. Each result includes `distance` in meters. Filters: Type, Capabilities and, when searching by coordinates, Country.

All Point operations return one item per point. **Simplify** (on by default) keeps the main fields: `id`, `type`, `displayName`, `locationType`, `location247`, `capabilities`, `address`, `coordinates`, `description` and, for Search Nearby, `distance`. Turn it off to get the full response, including opening hours and description translations. The **Language** option (for example `pl-PL`) sets the language of the point descriptions.

### Tracking

Parcel tracking history from the InPost Tracking API. Needs the `api:tracking:read` scope.

- **Get Events**: get the tracking history of one parcel, or of up to 10 parcels separated by commas. Spaces and repeated numbers are removed. The node returns one item per parcel, with `trackingNumber`, `events` (each with `eventCode`, `eventTimestamp` and `location`), `origin`, `destination`, `delivery`, `shipment`, `returnToSender` and `deliveryTimeWindow`. The **Event Version** option asks for a specific version of the events format; leave it empty for the latest.

InPost keeps tracking data for 121 days. The meaning of each event code is listed in [InPost tracking events](https://developers.inpost-group.com/tracking-events). The `status` fields are filled only on the UK market. To track more than 10 parcels, pass them as separate input items: the node sends one request per item.

If InPost returns no data for one of the numbers (a typo, a parcel of another organization, older than 121 days, or a new parcel without events yet), the node stops and names the missing numbers. To skip such numbers and keep going, set the node setting **On Error** to **Continue**.

### Shipment

> **Beta:** the Shipment operations work only with an active logistics contract with InPost and have not been tested yet on an account that has one. Please report anything that does not work in [Issues](https://github.com/werawolosz/n8n-nodes-inpost-global/issues/new/choose).

Shipments from the InPost Shipping API v2. Create and Get Label need the `api:shipments:write` scope, Get needs `api:shipments:read`. All three use the **Organization ID** from the credentials.

- **Create**: create a shipment.
  - **Send From**: an **InPost Point** (you drop the parcel off at a parcel locker, ParcelPoint, hub or any point) or an **Address** (a courier collects it).
  - **Deliver To**: an **InPost Point** (Point ID such as `KRA09N`; an ID from the Point operations such as `PL_KRA09N` works too) or an **Address**.
  - **Sender** and **Recipient**: first name, last name, email and phone (international format, for example `+48512345678`) are required; company name is optional.
  - **Parcels**: dimensions with unit, weight with unit, non-standard shape and your own reference. A shipment sent from or to a point can have only one parcel.
  - **Additional Fields**: Product Variant, Cash on Delivery, Additional Cover, Currency, Priority, Delivery Window, SMS Notification, Email Notification, Saturday Delivery, Evening Delivery, Return of Documents, Enable Drop-Off Code, Custom References (up to 3) and Deduplication ID (a UUID that stops a retried request from creating the shipment twice).
  - Returns the tracking number, the parcel numbers and the routing.
- **Get**: get the parcel numbers and routing of a shipment by its tracking number.
- **Get Label**: download the label as a file: PDF A6 (default), PDF A4, ZPL 203 dpi, ZPL 300 dpi or EPL2 203 dpi (EPL2 for domestic shipments within Poland only). The file goes to the binary field set in **Put Output File in Field** (default `data`) and is named `label-<tracking number>.pdf` (or `.zpl` / `.epl`).

Most additional services work only for courier shipments from address to address within Poland, and their availability depends on your InPost contract. A courier shipment with Cash on Delivery needs Additional Cover of at least the same amount. Sender and Recipient both need a first name, last name, email and phone; the node checks this before it calls InPost.

Creating shipments needs an active logistics contract with InPost (for example for parcel lockers and courier). Without it InPost answers `403 Access forbidden for this token`, even when the shipment data is valid.

Customs clearance, return address and RVM parcels are not supported yet.

### Pickup

> **Beta:** the Pickup operations work only with an active logistics contract with InPost and have not been tested yet on an account that has one. Please report anything that does not work in [Issues](https://github.com/werawolosz/n8n-nodes-inpost-global/issues/new/choose).

Courier pickups from the InPost One-time Pickups API. Create and Cancel need the `api:one-time-pickups:write` scope; Get, Get Many and Get Cut-Off Time need `api:one-time-pickups:read`. All operations except Get Cut-Off Time use the **Organization ID** from the credentials.

Pickups are available in Poland only and need an active logistics contract with InPost. Without it InPost answers `Payer account was not found`, even when the pickup data is valid.

- **Create**: book a courier to collect items from an address.
  - **Pickup Address**: street, house number, city and postal code (required, checked before the request), flat number and a location description with tips for the courier.
  - **Contact Person**: first name, last name, email and a Polish phone number (9 digits, with or without `+48`).
  - **Pickup From** / **Pickup To**: the pickup window, always read in Polish time (Europe/Warsaw), whatever the time zone of the workflow. It must be on one day, at least 2 hours long, not over yet, and at most 7 days ahead; the node checks these rules before it sends the request. The courier's working hours depend on the address and the day (for example 09:00–20:00 or 08:00–15:00), so the node does not check them: if the window does not fit, the node shows InPost's message.
  - **Item Type**: Parcels or Pallets (with count and total weight), or Recyclable Packaging (with count, total volume in liters and the tracking numbers of the packaging).
  - **Custom References**: up to 3 key-value pairs.
  - Returns the pickup ID, the carrier reference and the creation time.
- **Get**: get a pickup by its order ID.
- **Get Many**: list pickups, with **Return All** or a **Limit**, sorted by created or last modified time.
- **Cancel**: cancel a pickup by its order ID. InPost starts the cancellation and the node returns `{ id, cancelRequested: true }`. Use Get to see the final status.
- **Get Cut-Off Time**: get the latest time to book a pickup for a Polish postal code, for example `{ "postalCode": "30-727", "cutoffTime": "13:00" }`. The pickup must be booked, and its window must start, before this time.

**Simplify** (Get and Get Many, on by default) returns `id`, `status`, `isOpen`, `pickupFrom`, `pickupTo`, a one-line `address`, `itemType`, `count`, `carrierTrackingNumber` and `createdTime`. `isOpen` is `true` while the pickup is still planned (CREATED, PENDING, RESCHEDULED) and `false` once it is collected, cancelled or closed for another reason.

You cannot book a second pickup for the same address and time unless the location description is different.

## Credentials

The node uses OAuth 2.1 with the client credentials grant. n8n fetches and refreshes the access token for you.

Prerequisites: an InPost Global API client. Ask the InPost Integration Team (or use the merchant portal) for a client ID, a client secret, the list of scopes your client has and your organization ID. Shipments and pickups also need an active logistics contract with InPost; Points and Tracking work without one.

In n8n, create an **InPost Global OAuth2 API** credential and fill in:

| Field | What to enter |
| --- | --- |
| Environment | **Stage (Sandbox)** for testing, **Production** for real shipments. It selects the token URL and the API address |
| Client ID | Your client ID |
| Client Secret | Your client secret |
| Organization ID | The organization ID shown on the **API** tab of the InPost Merchant Portal (in the Polish portal: **ID organizacji**), for example `d38d503c-…`. Do not use the ID from the portal's page address. Shipments and pickups need it |
| Scope | All six scopes are filled in by default. Remove the ones your client does not have |

Start with the stage environment and switch to production when your workflow works.

When you save the credential, n8n requests a token and checks it with a call to the Points API, so your client needs the `api:points:read` scope for the test to pass.

## Compatibility

Built with `@n8n/node-cli` and loaded in n8n 2.44. The package has no runtime dependencies.

## Usage

### Example: ship to the nearest parcel locker

The [example workflow](examples/ship-to-nearest-locker.json) finds the nearest parcel locker for a postal code, creates a shipment to it and downloads the PDF label. To use it:

1. In n8n, create a new workflow, open the **⋯** menu and choose **Import from File**. You can also copy the JSON and paste it into the empty canvas.
2. Open each InPost node and select your **InPost Global OAuth2 API** credential.
3. Replace the sender and recipient details, and the parcel size and weight, with real values.
4. Run the workflow. The last node outputs the label in the binary field `data`. Connect an email or file storage node to send or save it.

Start with the **Stage (Sandbox)** environment: shipments created there are not real.

### Tips

- **Point IDs**: the Point operations return IDs such as `PL_KRA09N`. You can pass them straight to **Shipment → Create**; the node removes the country prefix.
- **Many tracking numbers**: Tracking → Get Events accepts up to 10 numbers per item. For longer lists, pass one number per item, for example from a spreadsheet.
- **Retries**: for Shipment → Create, set **Deduplication ID** to a UUID stored with your order. If n8n retries the request, InPost does not create a second shipment.
- **Pickup time zone**: Pickup From and Pickup To are always read in Polish time (Europe/Warsaw). A value with an explicit offset, such as `2026-10-28T09:00:00+01:00` or one from `{{ $now }}`, keeps its moment and is converted to Polish time.
- **When something is rejected**: the node checks common rules before it calls InPost and tells you which field to change. If InPost itself rejects the request, the node shows InPost's title and detail and lists the fields to fix, for example `destination.pointId: not_found`. For 403 on shipments and `Payer account was not found` on pickups, it reminds you that the account needs a logistics contract with InPost.

## Feedback and contributing

Found a bug or have an idea for the InPost node? [Open an issue](https://github.com/werawolosz/n8n-nodes-inpost-global/issues/new/choose) and choose **Bug report** or **Feature request**. Please never paste your client ID, client secret, tokens or customer data.

Want to change the code yourself? Read [CONTRIBUTING.md](CONTRIBUTING.md) and open a pull request.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [InPost Developers Portal](https://developers.inpost-group.com/)

## Version history

- 0.1.0 (unreleased): credentials for the InPost Global API; Point operations (Get, Get Many, Search Nearby); Tracking: Get Events; Shipment: Create, Get, Get Label; Pickup: Create, Get, Get Many, Cancel, Get Cut-Off Time.


