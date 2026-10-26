import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { pointDescription } from './resources/point';
import { shipmentDescription } from './resources/shipment';
import { trackingDescription } from './resources/tracking';

export class InPost implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'InPost',
		name: 'inPost',
		icon: { light: 'file:../../icons/inpost.svg', dark: 'file:../../icons/inpost.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
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
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Point',
						value: 'point',
					},
					{
						name: 'Shipment',
						value: 'shipment',
					},
					{
						name: 'Tracking',
						value: 'tracking',
					},
				],
				default: 'point',
			},
			...pointDescription,
			...shipmentDescription,
			...trackingDescription,
		],
	};
}
