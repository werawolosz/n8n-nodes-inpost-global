import type { INodeProperties } from 'n8n-workflow';

export const pointTypeFilter: INodeProperties = {
	displayName: 'Type',
	name: 'type',
	type: 'multiOptions',
	options: [
		{
			name: 'Parcel Locker (APM)',
			value: 'APM',
		},
		{
			name: 'ParcelPoint (PUDO)',
			value: 'PUDO',
		},
	],
	default: [],
	description: 'Return only points of these types',
	routing: {
		send: {
			type: 'query',
			property: 'type',
			value: '={{ $value.join(",") || undefined }}',
		},
	},
};

export const pointCapabilitiesFilter: INodeProperties = {
	displayName: 'Capabilities',
	name: 'capabilities',
	type: 'multiOptions',
	options: [
		{
			name: 'Collect Parcels',
			value: 'PARCEL_COLLECT',
			description: 'The customer can collect a standard parcel here',
		},
		{
			name: 'Send Parcels',
			value: 'PARCEL_SEND',
			description: 'The customer can send a standard parcel here',
		},
		{
			name: 'Cooled Deposit',
			value: 'COOLED_DEPOSIT',
			description: 'The customer can collect a reservation from a refrigerated locker',
		},
	],
	default: [],
	description: 'Return only points that offer all of these services',
	routing: {
		send: {
			type: 'query',
			property: 'capabilities',
			value: '={{ $value.join(",") || undefined }}',
		},
	},
};

export const pointCountryFilter: INodeProperties = {
	displayName: 'Country',
	name: 'country',
	type: 'string',
	default: '',
	placeholder: 'e.g. PL',
	description: 'Two-letter country code (ISO 3166-1 alpha-2)',
	routing: {
		send: {
			type: 'query',
			property: 'address.country',
		},
	},
};

export const languageOption: INodeProperties = {
	displayName: 'Language',
	name: 'language',
	type: 'string',
	default: '',
	placeholder: 'e.g. en-GB',
	description: 'Language of the point descriptions, for example en-GB or pl-PL',
	routing: {
		request: {
			headers: {
				'Accept-Language': '={{ $value }}',
			},
		},
	},
};
