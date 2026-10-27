import type { INodeProperties } from 'n8n-workflow';
import { checkInPostResponse, IGNORE_STATUS_ERRORS } from '../../shared/errors';
import { setTrackingNumbers, splitParcels } from '../../shared/utils';
import { trackingGetEventsDescription } from './getEvents';

const showOnlyForTracking = {
	resource: ['tracking'],
};

export const trackingDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForTracking,
		},
		options: [
			{
				name: 'Get Events',
				value: 'getEvents',
				action: 'Get tracking events',
				description: 'Get the tracking history (events) of up to 10 parcels',
				routing: {
					request: {
						method: 'GET',
						ignoreHttpStatusErrors: IGNORE_STATUS_ERRORS,
						url: '/tracking/v1/parcels',
					},
					send: {
						preSend: [setTrackingNumbers],
					},
					output: {
						postReceive: [checkInPostResponse, splitParcels],
					},
				},
			},
		],
		default: 'getEvents',
	},
	...trackingGetEventsDescription,
];
