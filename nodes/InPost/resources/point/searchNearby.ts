import type { INodeProperties } from 'n8n-workflow';
import {
	languageOption,
	pointCapabilitiesFilter,
	pointCountryFilter,
	pointTypeFilter,
} from '../../shared/descriptions';

const showOnlyForPointSearchNearby = {
	operation: ['searchNearby'],
	resource: ['point'],
};

export const pointSearchNearbyDescription: INodeProperties[] = [
	{
		displayName: 'Search By',
		name: 'searchBy',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Coordinates',
				value: 'coordinates',
				description: 'Search around a latitude and longitude',
			},
			{
				name: 'Postal Code',
				value: 'postalCode',
				description: 'Search around a postal code',
			},
		],
		default: 'coordinates',
		displayOptions: {
			show: showOnlyForPointSearchNearby,
		},
	},
	{
		displayName: 'Latitude',
		name: 'latitude',
		type: 'number',
		required: true,
		default: 0,
		placeholder: '50.061',
		typeOptions: {
			minValue: -90,
			maxValue: 90,
			numberPrecision: 6,
		},
		description: 'Latitude in decimal degrees (WGS-84)',
		displayOptions: {
			show: {
				...showOnlyForPointSearchNearby,
				searchBy: ['coordinates'],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'relativePoint',
				value: '={{ $value + "," + $parameter.longitude }}',
			},
		},
	},
	{
		displayName: 'Longitude',
		name: 'longitude',
		type: 'number',
		required: true,
		default: 0,
		placeholder: '19.938',
		typeOptions: {
			minValue: -180,
			maxValue: 180,
			numberPrecision: 6,
		},
		description: 'Longitude in decimal degrees (WGS-84)',
		displayOptions: {
			show: {
				...showOnlyForPointSearchNearby,
				searchBy: ['coordinates'],
			},
		},
	},
	{
		displayName: 'Postal Code',
		name: 'postalCode',
		type: 'string',
		required: true,
		default: '',
		placeholder: '30-001',
		description: 'Postal code to search around',
		displayOptions: {
			show: {
				...showOnlyForPointSearchNearby,
				searchBy: ['postalCode'],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'relativePostCode',
			},
		},
	},
	{
		displayName: 'Max Distance (Meters)',
		name: 'maxDistance',
		type: 'number',
		default: 10000,
		typeOptions: {
			minValue: 1,
			maxValue: 50000,
		},
		description: 'How far from the location to search, in meters. Maximum 50000 (50 km).',
		displayOptions: {
			show: showOnlyForPointSearchNearby,
		},
		routing: {
			send: {
				type: 'query',
				property: 'maxDistance',
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: showOnlyForPointSearchNearby,
		},
		routing: {
			request: {
				qs: {
					limit: '={{ $value }}',
					perPage: '={{ $value }}',
				},
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
			show: showOnlyForPointSearchNearby,
		},
		options: [pointCapabilitiesFilter, pointCountryFilter, pointTypeFilter],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: showOnlyForPointSearchNearby,
		},
		options: [languageOption],
	},
];
