import type { INodeProperties } from 'n8n-workflow';
import {
	languageOption,
	pointCapabilitiesFilter,
	pointCountryFilter,
	pointTypeFilter,
} from '../../shared/descriptions';

const showOnlyForPointGetMany = {
	operation: ['getAll'],
	resource: ['point'],
};

export const pointGetManyDescription: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: showOnlyForPointGetMany,
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		routing: {
			send: {
				paginate: '={{ $value }}',
				type: 'query',
				property: 'perPage',
				value: '1000',
			},
			operations: {
				pagination: {
					type: 'generic',
					properties: {
						continue: '={{ $response.body.page < $response.body.totalPages }}',
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
				...showOnlyForPointGetMany,
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		default: 50,
		description: 'Max number of results to return',
		routing: {
			send: {
				type: 'query',
				property: 'perPage',
			},
			output: {
				maxResults: '={{ $value }}',
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: showOnlyForPointGetMany,
		},
		options: [
			{
				displayName: 'Administrative Area',
				name: 'administrativeArea',
				type: 'string',
				default: '',
				placeholder: 'małopolskie',
				description:
					'Province or voivodeship of the point. Separate several values with commas.',
				routing: {
					send: {
						type: 'query',
						property: 'address.administrativeArea',
					},
				},
			},
			pointCapabilitiesFilter,
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				placeholder: 'Kraków,Warszawa',
				description: 'City of the point. Separate several values with commas.',
				routing: {
					send: {
						type: 'query',
						property: 'address.city',
					},
				},
			},
			pointCountryFilter,
			{
				displayName: 'Postal Code',
				name: 'postalCode',
				type: 'string',
				default: '',
				placeholder: '30-394',
				description: 'Postal code of the point. Separate several values with commas.',
				routing: {
					send: {
						type: 'query',
						property: 'address.postalCode',
					},
				},
			},
			pointTypeFilter,
			{
				displayName: 'Updated From',
				name: 'updatedFrom',
				type: 'dateTime',
				default: '',
				description:
					'Return only points updated on or after this date. Without Updated To, the date can be at most 3 days in the past.',
				routing: {
					send: {
						type: 'query',
						property: 'updatedFrom',
						value: '={{ String($value).slice(0, 10) }}',
					},
				},
			},
			{
				displayName: 'Updated To',
				name: 'updatedTo',
				type: 'dateTime',
				default: '',
				description:
					'Return only points updated on or before this date. Use it together with Updated From.',
				routing: {
					send: {
						type: 'query',
						property: 'updatedTo',
						value: '={{ String($value).slice(0, 10) }}',
					},
				},
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: showOnlyForPointGetMany,
		},
		options: [languageOption],
	},
];
