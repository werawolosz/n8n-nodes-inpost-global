import type { INodeProperties } from 'n8n-workflow';

const showOnlyForPickupGetMany = {
	operation: ['getAll'],
	resource: ['pickup'],
};

export const pickupGetManyDescription: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: showOnlyForPickupGetMany,
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		routing: {
			send: {
				paginate: '={{ $value }}',
				type: 'query',
				property: 'size',
				value: '100',
			},
			operations: {
				pagination: {
					type: 'generic',
					properties: {
						continue: '={{ $response.body.page + 1 < $response.body.totalPages }}',
						request: {
							qs: {
								page: '={{ $response.body.page + 1 }}',
							},
						},
					},
				},
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				...showOnlyForPickupGetMany,
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
		routing: {
			send: {
				type: 'query',
				property: 'size',
			},
			output: {
				maxResults: '={{ $value }}',
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: showOnlyForPickupGetMany,
		},
		options: [
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'options',
				options: [
					{
						name: 'Created Time, Newest First',
						value: 'createdTime,desc',
					},
					{
						name: 'Created Time, Oldest First',
						value: 'createdTime,asc',
					},
					{
						name: 'Last Modified Time, Newest First',
						value: 'lastModifiedTime,desc',
					},
					{
						name: 'Last Modified Time, Oldest First',
						value: 'lastModifiedTime,asc',
					},
				],
				default: 'createdTime,desc',
				description: 'Order of the returned pickups',
				routing: {
					send: {
						type: 'query',
						property: 'sort',
					},
				},
			},
		],
	},
];
