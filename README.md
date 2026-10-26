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

The node is in early development. This version contains the credentials only; operations for points, tracking, shipments and pickups are coming in the next versions.

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

- 0.1.0 (in development): credentials for the InPost Global API.


