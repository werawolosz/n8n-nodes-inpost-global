import type {
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class InPostGlobalOAuth2Api implements ICredentialType {
	name = 'inPostGlobalOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'InPost Global OAuth2 API';

	icon: Icon = { light: 'file:../icons/inpost.svg', dark: 'file:../icons/inpost.dark.svg' };

	documentationUrl = 'https://github.com/werawolosz/n8n-nodes-inpost-global?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			options: [
				{
					name: 'Stage (Sandbox)',
					value: 'stage',
				},
				{
					name: 'Production',
					value: 'production',
				},
			],
			default: 'stage',
			description: 'Use Stage to test with sandbox data and Production for real shipments',
		},
		{
			displayName: 'Organization ID',
			name: 'organizationId',
			type: 'string',
			default: '',
			description:
				'Your merchant organization ID from InPost. Shipments and pickups need it.',
		},
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'clientCredentials',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default:
				'={{ $self["environment"] === "production" ? "https://api.inpost-group.com/oauth2/token" : "https://stage-api.inpost-group.com/oauth2/token" }}',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			default:
				'api:points:read api:tracking:read api:shipments:read api:shipments:write api:one-time-pickups:read api:one-time-pickups:write',
			description:
				'Space-separated list of scopes. Remove the scopes your InPost client does not have.',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{ $credentials.environment === "production" ? "https://api.inpost-group.com" : "https://stage-api.inpost-group.com" }}',
			url: '/location/v1/points',
			method: 'GET',
			qs: {
				perPage: 1,
			},
		},
	};
}
