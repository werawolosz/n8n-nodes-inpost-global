import type { INodeProperties } from 'n8n-workflow';

export const shipmentTrackingNumberField: INodeProperties = {
	displayName: 'Tracking Number',
	name: 'trackingNumber',
	type: 'string',
	required: true,
	default: '',
	placeholder: '600000658493991742009752',
	description: 'Tracking number of the shipment, returned by the Create operation',
	displayOptions: {
		show: {
			operation: ['get', 'getLabel'],
			resource: ['shipment'],
		},
	},
};
