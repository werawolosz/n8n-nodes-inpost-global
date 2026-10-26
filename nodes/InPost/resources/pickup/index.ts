import type { INodeProperties } from 'n8n-workflow';
import {
	cancelPickupOutput,
	cutoffTimeOutput,
	setPickupBody,
	simplifyPickups,
} from '../../shared/pickup';
import { requireOrganizationId } from '../../shared/shipment';
import { pickupCreateDescription } from './create';
import { pickupGetCutoffTimeDescription } from './getCutoffTime';
import { pickupGetManyDescription } from './getMany';

const showOnlyForPickups = {
	resource: ['pickup'],
};

const pickupsUrl =
	'=/pickups/v1/organizations/{{ encodeURIComponent(String($credentials.organizationId).trim()) }}/one-time-pickups';
const pickupUrl = `${pickupsUrl}/{{ encodeURIComponent(String($parameter.orderId).trim()) }}`;

export const pickupDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForPickups,
		},
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				action: 'Cancel a pickup',
				description: 'Cancel a courier pickup',
				routing: {
					request: {
						method: 'PUT',
						url: `${pickupUrl}/cancel`,
					},
					send: {
						preSend: [requireOrganizationId],
					},
					output: {
						postReceive: [cancelPickupOutput],
					},
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a pickup',
				description: 'Book a courier to collect parcels from an address in Poland',
				routing: {
					request: {
						method: 'POST',
						url: pickupsUrl,
					},
					send: {
						preSend: [requireOrganizationId, setPickupBody],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a pickup',
				description: 'Get the details and status of a courier pickup',
				routing: {
					request: {
						method: 'GET',
						url: pickupUrl,
					},
					send: {
						preSend: [requireOrganizationId],
					},
					output: {
						postReceive: [simplifyPickups],
					},
				},
			},
			{
				name: 'Get Cut-Off Time',
				value: 'getCutoffTime',
				action: 'Get the pickup cut off time',
				description: 'Get the latest time to book a pickup for a postal code',
				routing: {
					request: {
						method: 'GET',
						url: '/pickups/v1/cutoff-time',
						qs: {
							countryCode: 'PL',
						},
					},
					output: {
						postReceive: [cutoffTimeOutput],
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many pickups',
				description: 'Get many courier pickups',
				routing: {
					request: {
						method: 'GET',
						url: pickupsUrl,
					},
					send: {
						preSend: [requireOrganizationId],
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'items',
								},
							},
							simplifyPickups,
						],
					},
				},
			},
		],
		default: 'create',
	},
	...pickupCreateDescription,
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'fd87b112-fd3f-4797-abe9-824ffc306d4d',
		description: 'ID of the pickup, returned by the Create operation',
		displayOptions: {
			show: {
				...showOnlyForPickups,
				operation: ['get', 'cancel'],
			},
		},
	},
	...pickupGetManyDescription,
	...pickupGetCutoffTimeDescription,
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description:
			'Whether to return a simplified version of the response instead of the raw data',
		displayOptions: {
			show: {
				...showOnlyForPickups,
				operation: ['get', 'getAll'],
			},
		},
	},
];
