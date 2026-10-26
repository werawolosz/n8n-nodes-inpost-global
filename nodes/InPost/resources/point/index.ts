import type { INodeProperties } from 'n8n-workflow';
import { simplifyPoints } from '../../shared/utils';
import { pointGetDescription } from './get';
import { pointGetManyDescription } from './getMany';
import { pointSearchNearbyDescription } from './searchNearby';

const showOnlyForPoints = {
	resource: ['point'],
};

export const pointDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForPoints,
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a point',
				description: 'Get the details of a parcel locker or ParcelPoint',
				routing: {
					request: {
						method: 'GET',
						url: '=/location/v1/points/{{ encodeURIComponent($parameter.pointId) }}',
					},
					output: {
						postReceive: [simplifyPoints],
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many points',
				description: 'Get many parcel lockers and ParcelPoints, with optional filters',
				routing: {
					request: {
						method: 'GET',
						url: '/location/v1/points',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'items',
								},
							},
							simplifyPoints,
						],
					},
				},
			},
			{
				name: 'Search Nearby',
				value: 'searchNearby',
				action: 'Search points nearby',
				description: 'Find the points closest to a location or a postal code',
				routing: {
					request: {
						method: 'GET',
						url: '/location/v1/points/search-by-location',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'items',
								},
							},
							simplifyPoints,
						],
					},
				},
			},
		],
		default: 'searchNearby',
	},
	...pointGetDescription,
	...pointGetManyDescription,
	...pointSearchNearbyDescription,
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description:
			'Whether to return a simplified version of the response instead of the raw data',
		displayOptions: {
			show: showOnlyForPoints,
		},
	},
];
