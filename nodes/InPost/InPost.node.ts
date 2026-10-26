import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

export class InPost implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'InPost',
		name: 'inPost',
		icon: { light: 'file:../../icons/inpost.svg', dark: 'file:../../icons/inpost.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: 'Global API',
		description: 'Find InPost points, track parcels, create shipments and book courier pickups',
		defaults: {
			name: 'InPost',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'inPostGlobalOAuth2Api',
				required: true,
			},
		],
		requestDefaults: {
			baseURL:
				'={{ $credentials.environment === "production" ? "https://api.inpost-group.com" : "https://stage-api.inpost-group.com" }}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName:
					'This node is in early development. Operations for points, tracking, shipments and pickups are coming in the next versions.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
	};
}
