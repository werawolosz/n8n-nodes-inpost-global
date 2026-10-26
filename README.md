# n8n-nodes-inpost-global

This is an n8n community node. It lets you use the [InPost Global API](https://developers.inpost-group.com/) in your n8n workflows.

InPost is a parcel delivery company known for its parcel lockers (Paczkomaty). Its Global API covers pick-up points, tracking, shipments, labels and courier pickups.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
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
- **Search Nearby**: find the points closest to coordinates (latitude and longitude) or to a postal code, within a maximum distance in meters (default 10000, maximum 50000). Each result includes `distance` in meters. Filters: Country, Type, Capabilities.

All Point operations return one item per point. **Simplify** (on by default) keeps the main fields: `id`, `type`, `displayName`, `locationType`, `location247`, `capabilities`, `address`, `coordinates`, `description` and, for Search Nearby, `distance`. Turn it off to get the full response, including opening hours and description translations. The **Language** option (for example `pl-PL`) sets the language of the point descriptions.

Tracking, shipments and pickups are coming in the next versions.

## Credentials

The node uses OAuth 2.1 with the client credentials grant. n8n fetches and refreshes the access token for you.

Prerequisites: an InPost Global API client. Ask the InPost Integration Team (or use the merchant portal) for a client ID, a client secret, the list of scopes your client has and your organization ID.

In n8n, create an **InPost Global OAuth2 API** credential and fill in:

| Field | What to enter |
| --- | --- |
| Environment | **Stage (Sandbox)** for testing, **Production** for real shipments. It selects the token URL and the API address |
| Client ID | Your client ID |
| Client Secret | Your client secret |
| Organization ID | Your merchant organization ID. Shipments and pickups need it |
| Scope | All six scopes are filled in by default. Remove the ones your client does not have |

When you save the credential, n8n requests a token and checks it with a call to the Points API, so your client needs the `api:points:read` scope for the test to pass.

## Compatibility

Built and tested with n8n 2.x.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [InPost Developers Portal](https://developers.inpost-group.com/)

## Version history

- 0.1.0 (in development): credentials for the InPost Global API; Point operations (Get, Get Many, Search Nearby).


