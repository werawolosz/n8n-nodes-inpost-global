import type { INodeProperties } from 'n8n-workflow';

export const pickupGetCutoffTimeDescription: INodeProperties[] = [
	{
		displayName: 'Postal Code',
		name: 'postalCode',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 30-727',
		description:
			'Polish postal code (00-000). The pickup must be booked, and its window must start, before the returned time.',
		displayOptions: {
			show: {
				operation: ['getCutoffTime'],
				resource: ['pickup'],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'postalCode',
				value: '={{ String($value).trim() }}',
			},
		},
	},
];
