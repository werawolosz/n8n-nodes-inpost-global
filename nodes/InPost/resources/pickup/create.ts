import type { INodeProperties } from 'n8n-workflow';

const showOnlyForPickupCreate = {
	operation: ['create'],
	resource: ['pickup'],
};

export const pickupCreateDescription: INodeProperties[] = [
	{
		displayName: 'Pickups are available in Poland only and need an active logistics contract with InPost. Book up to 7 days ahead, before the cut-off time of the postal code (see the Get Cut-Off Time operation). Pickup times are in Polish time.',
		name: 'pickupNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: showOnlyForPickupCreate,
		},
	},
	{
		displayName: 'Pickup Address',
		name: 'pickupAddress',
		type: 'collection',
		placeholder: 'Add Address Field',
		default: {},
		required: true,
		description: 'Address in Poland where the courier collects the items. Street, house number, city and postal code are required.',
		displayOptions: {
			show: showOnlyForPickupCreate,
		},
		options: [
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				placeholder: 'e.g. Warszawa',
			},
			{
				displayName: 'Flat Number',
				name: 'flatNumber',
				type: 'string',
				default: '',
				placeholder: 'e.g. 10',
			},
			{
				displayName: 'House Number',
				name: 'houseNumber',
				type: 'string',
				default: '',
				placeholder: 'e.g. 4',
			},
			{
				displayName: 'Location Description',
				name: 'locationDescription',
				type: 'string',
				default: '',
				placeholder: 'e.g. 4th floor, entrance from the courtyard',
				description:
					'Tips for the courier. Also needed to book a second pickup at the same address and time.',
			},
			{
				displayName: 'Postal Code',
				name: 'postalCode',
				type: 'string',
				default: '',
				placeholder: 'e.g. 30-727',
			},
			{
				displayName: 'Street',
				name: 'street',
				type: 'string',
				default: '',
				placeholder: 'e.g. Pana Tadeusza',
				description: 'Street name without prefixes such as "ul." or "al."',
			},
		],
	},
	{
		displayName: 'Contact Person',
		name: 'contactPerson',
		type: 'collection',
		placeholder: 'Add Contact Field',
		default: {},
		required: true,
		description: 'Person the courier can contact. All fields are required.',
		displayOptions: {
			show: showOnlyForPickupCreate,
		},
		options: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'e.g. name@email.com',
				default: '',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				placeholder: 'e.g. 512345678',
				description: 'Polish phone number: 9 digits, with or without +48',
			},
		],
	},
	{
		displayName: 'Pickup From',
		name: 'pickupFrom',
		type: 'dateTime',
		required: true,
		default: '',
		description:
			'Start of the pickup window, in Polish time (Europe/Warsaw) whatever the time zone of the workflow. The window is on one day; courier hours depend on the address and the day.',
		displayOptions: {
			show: showOnlyForPickupCreate,
		},
	},
	{
		displayName: 'Pickup To',
		name: 'pickupTo',
		type: 'dateTime',
		required: true,
		default: '',
		description: 'End of the pickup window, in Polish time, at least 2 hours after Pickup From',
		displayOptions: {
			show: showOnlyForPickupCreate,
		},
	},
	{
		displayName: 'Item Type',
		name: 'itemType',
		type: 'options',
		options: [
			{
				name: 'Parcels',
				value: 'PARCEL',
			},
			{
				name: 'Pallets',
				value: 'PALLET',
			},
			{
				name: 'Recyclable Packaging',
				value: 'RECYCLABLE_PACKAGING',
				description: 'Returnable packaging, identified by tracking numbers',
			},
		],
		default: 'PARCEL',
		description: 'What the courier collects',
		displayOptions: {
			show: showOnlyForPickupCreate,
		},
	},
	{
		displayName: 'Count',
		name: 'count',
		type: 'number',
		required: true,
		default: 1,
		typeOptions: {
			minValue: 1,
		},
		description: 'Number of items to collect',
		displayOptions: {
			show: showOnlyForPickupCreate,
		},
	},
	{
		displayName: 'Total Weight',
		name: 'totalWeight',
		type: 'number',
		required: true,
		default: 0,
		typeOptions: {
			minValue: 0,
			numberPrecision: 2,
		},
		description: 'Total weight of all items',
		displayOptions: {
			show: {
				...showOnlyForPickupCreate,
				itemType: ['PARCEL', 'PALLET'],
			},
		},
	},
	{
		displayName: 'Weight Unit',
		name: 'weightUnit',
		type: 'options',
		options: [
			{ name: 'Decagrams', value: 'DAG' },
			{ name: 'Grams', value: 'G' },
			{ name: 'Kilograms', value: 'KG' },
		],
		default: 'KG',
		displayOptions: {
			show: {
				...showOnlyForPickupCreate,
				itemType: ['PARCEL', 'PALLET'],
			},
		},
	},
	{
		displayName: 'Total Volume (Liters)',
		name: 'totalVolume',
		type: 'number',
		required: true,
		default: 0,
		typeOptions: {
			minValue: 0,
		},
		description: 'Total volume of all items, in liters',
		displayOptions: {
			show: {
				...showOnlyForPickupCreate,
				itemType: ['RECYCLABLE_PACKAGING'],
			},
		},
	},
	{
		displayName: 'Tracking Numbers',
		name: 'trackingNumbers',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 600000658493991742009752, 600000658493991742009753',
		description: 'Tracking numbers of the packaging, separated by commas',
		displayOptions: {
			show: {
				...showOnlyForPickupCreate,
				itemType: ['RECYCLABLE_PACKAGING'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: showOnlyForPickupCreate,
		},
		options: [
			{
				displayName: 'Custom References',
				name: 'customReferences',
				type: 'fixedCollection',
				placeholder: 'Add Reference',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				description: 'Up to 3 of your own key-value pairs, such as an invoice number',
				options: [
					{
						displayName: 'Reference',
						name: 'reference',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								placeholder: 'e.g. invoiceNumber',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								placeholder: 'e.g. FV 1/2026',
							},
						],
					},
				],
			},
		],
	},
];
