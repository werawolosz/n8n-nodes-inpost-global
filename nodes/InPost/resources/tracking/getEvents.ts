import type { INodeProperties } from 'n8n-workflow';

const showOnlyForTrackingGetEvents = {
	operation: ['getEvents'],
	resource: ['tracking'],
};

export const trackingGetEventsDescription: INodeProperties[] = [
	{
		displayName: 'Tracking Numbers',
		name: 'trackingNumbers',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. MD01234567890123, 10055003420100',
		description: 'One tracking number, or up to 10 separated by commas',
		displayOptions: {
			show: showOnlyForTrackingGetEvents,
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: showOnlyForTrackingGetEvents,
		},
		options: [
			{
				displayName: 'Event Version',
				name: 'eventVersion',
				type: 'string',
				default: '',
				description: 'Version of the tracking events format. Leave empty to get the latest version.',
				routing: {
					request: {
						headers: {
							'x-inpost-event-version': '={{ $value }}',
						},
					},
				},
			},
		],
	},
];
