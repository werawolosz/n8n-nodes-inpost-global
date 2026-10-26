import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

const showOnlyForShipmentCreate = {
	operation: ['create'],
	resource: ['shipment'],
};

const COUNTRY_NAMES: Record<string, string> = {
	AT: 'Austria',
	BE: 'Belgium',
	CZ: 'Czechia',
	ES: 'Spain',
	FR: 'France',
	GB: 'United Kingdom',
	GG: 'Guernsey',
	HU: 'Hungary',
	IE: 'Ireland',
	IM: 'Isle of Man',
	IT: 'Italy',
	JE: 'Jersey',
	LU: 'Luxembourg',
	NL: 'Netherlands',
	PL: 'Poland',
	PT: 'Portugal',
	SK: 'Slovakia',
};

const ADDRESS_COUNTRIES = ['PL', 'FR', 'BE', 'NL', 'ES', 'PT', 'IT', 'LU', 'AT', 'HU', 'GB', 'IM', 'GG', 'JE', 'IE'];
const DESTINATION_POINT_COUNTRIES = [...ADDRESS_COUNTRIES, 'CZ', 'SK'];

function countryOptions(codes: string[]): INodePropertyOptions[] {
	return codes
		.map((code) => ({ name: COUNTRY_NAMES[code], value: code }))
		.sort((a, b) => a.name.localeCompare(b.name));
}

function addressFields(): INodeProperties[] {
	return [
		{
			displayName: 'Country',
			name: 'countryCode',
			type: 'options',
			options: countryOptions(ADDRESS_COUNTRIES),
			default: 'PL',
		},
		{
			displayName: 'Street',
			name: 'street',
			type: 'string',
			default: '',
			placeholder: 'Pana Tadeusza',
			description: 'Street name without prefixes such as "ul." or "al."',
		},
		{
			displayName: 'House Number',
			name: 'houseNumber',
			type: 'string',
			default: '',
			placeholder: '4',
		},
		{
			displayName: 'Flat Number',
			name: 'flatNumber',
			type: 'string',
			default: '',
			placeholder: '10',
		},
		{
			displayName: 'City',
			name: 'city',
			type: 'string',
			default: '',
			placeholder: 'Warszawa',
		},
		{
			displayName: 'Postal Code',
			name: 'postalCode',
			type: 'string',
			default: '',
			placeholder: '00-001',
			description: 'Postal code in the format of the country, for example 00-001 for Poland',
		},
	];
}

function partyFields(role: string): INodeProperties[] {
	return [
		{
			displayName: 'First Name',
			name: 'firstName',
			type: 'string',
			default: '',
			placeholder: 'Anna',
		},
		{
			displayName: 'Last Name',
			name: 'lastName',
			type: 'string',
			default: '',
			placeholder: 'Nowak',
		},
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			placeholder: 'name@email.com',
			default: '',
		},
		{
			displayName: 'Phone',
			name: 'phone',
			type: 'string',
			default: '',
			placeholder: '+48512345678',
			description: `Phone number of the ${role} in international format: a plus sign, the country code and the number`,
		},
		{
			displayName: 'Company Name',
			name: 'companyName',
			type: 'string',
			default: '',
		},
	];
}

export const shipmentCreateDescription: INodeProperties[] = [
	{
		displayName: 'Send From',
		name: 'sendFrom',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'InPost Point',
				value: 'point',
				description: 'You drop the parcel off at a parcel locker, ParcelPoint or hub',
			},
			{
				name: 'Address',
				value: 'address',
				description: 'A courier collects the parcel from an address',
			},
		],
		default: 'point',
		displayOptions: {
			show: showOnlyForShipmentCreate,
		},
	},
	{
		displayName: 'Origin Country',
		name: 'originCountryCode',
		type: 'options',
		options: countryOptions(ADDRESS_COUNTRIES),
		default: 'PL',
		description: 'Country where you drop the parcel off',
		displayOptions: {
			show: {
				...showOnlyForShipmentCreate,
				sendFrom: ['point'],
			},
		},
	},
	{
		displayName: 'Drop-Off Type',
		name: 'shippingMethod',
		type: 'options',
		options: [
			{
				name: 'Any Point',
				value: 'ANY_POINT',
				description: 'Any parcel locker or ParcelPoint',
			},
			{
				name: 'Hub',
				value: 'HUB',
			},
			{
				name: 'Parcel Locker (APM)',
				value: 'APM',
			},
			{
				name: 'ParcelPoint (PUDO)',
				value: 'PUDO',
			},
		],
		default: 'APM',
		description: 'Where you drop the parcel off',
		displayOptions: {
			show: {
				...showOnlyForShipmentCreate,
				sendFrom: ['point'],
			},
		},
	},
	{
		displayName: 'Region',
		name: 'subdivisionCode',
		type: 'options',
		options: [
			{ name: 'England', value: 'GB-ENG' },
			{ name: 'Great Britain', value: 'GB-GBN' },
			{ name: 'Northern Ireland', value: 'GB-NIR' },
			{ name: 'Scotland', value: 'GB-SCT' },
			{ name: 'Wales', value: 'GB-WLS' },
		],
		default: 'GB-ENG',
		description: 'Region of the United Kingdom where you drop the parcel off',
		displayOptions: {
			show: {
				...showOnlyForShipmentCreate,
				sendFrom: ['point'],
				originCountryCode: ['GB'],
			},
		},
	},
	{
		displayName: 'Pickup Address',
		name: 'originAddress',
		type: 'collection',
		placeholder: 'Add Address Field',
		default: {},
		required: true,
		description: 'Address where the courier collects the parcel',
		displayOptions: {
			show: {
				...showOnlyForShipmentCreate,
				sendFrom: ['address'],
			},
		},
		options: addressFields(),
	},
	{
		displayName: 'Deliver To',
		name: 'deliverTo',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'InPost Point',
				value: 'point',
				description: 'Deliver to a parcel locker or ParcelPoint',
			},
			{
				name: 'Address',
				value: 'address',
				description: 'Deliver by courier to an address',
			},
		],
		default: 'point',
		displayOptions: {
			show: showOnlyForShipmentCreate,
		},
	},
	{
		displayName: 'Destination Country',
		name: 'destinationCountryCode',
		type: 'options',
		options: countryOptions(DESTINATION_POINT_COUNTRIES),
		default: 'PL',
		description: 'Country of the destination point',
		displayOptions: {
			show: {
				...showOnlyForShipmentCreate,
				deliverTo: ['point'],
			},
		},
	},
	{
		displayName: 'Point ID',
		name: 'pointId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'KRA09N',
		description:
			'ID of the destination parcel locker or ParcelPoint. An ID from the Point operations, such as PL_KRA09N, works too.',
		displayOptions: {
			show: {
				...showOnlyForShipmentCreate,
				deliverTo: ['point'],
			},
		},
	},
	{
		displayName: 'Delivery Address',
		name: 'destinationAddress',
		type: 'collection',
		placeholder: 'Add Address Field',
		default: {},
		required: true,
		description: 'Address where the courier delivers the parcel',
		displayOptions: {
			show: {
				...showOnlyForShipmentCreate,
				deliverTo: ['address'],
			},
		},
		options: addressFields(),
	},
	{
		displayName: 'Sender',
		name: 'sender',
		type: 'collection',
		placeholder: 'Add Sender Field',
		default: {},
		required: true,
		description: 'First name, last name, email and phone are required',
		displayOptions: {
			show: showOnlyForShipmentCreate,
		},
		options: partyFields('sender'),
	},
	{
		displayName: 'Recipient',
		name: 'recipient',
		type: 'collection',
		placeholder: 'Add Recipient Field',
		default: {},
		required: true,
		description: 'First name, last name, email and phone are required',
		displayOptions: {
			show: showOnlyForShipmentCreate,
		},
		options: partyFields('recipient'),
	},
	{
		displayName: 'Parcels',
		name: 'parcels',
		type: 'fixedCollection',
		placeholder: 'Add Parcel',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		required: true,
		description: 'A shipment sent from or to an InPost point can have only one parcel',
		displayOptions: {
			show: showOnlyForShipmentCreate,
		},
		options: [
			{
				displayName: 'Parcel',
				name: 'parcel',
				values: [
					{
						displayName: 'Dimension Unit',
						name: 'dimensionUnit',
						type: 'options',
						options: [
							{
								name: 'Centimeters',
								value: 'CM',
							},
							{
								name: 'Meters',
								value: 'M',
							},
							{
								name: 'Millimeters',
								value: 'MM',
							},
						],
						default: 'CM',
					},
					{
						displayName: 'Height',
						name: 'height',
						type: 'number',
						default: 0
					},
					{
						displayName: 'Length',
						name: 'length',
						type: 'number',
						default: 0
					},
					{
						displayName: 'Non-Standard Shape',
						name: 'nonStandardShape',
						type: 'boolean',
						default: false,
						description: 'Whether the parcel has a non-standard shape',
					},
					{
						displayName: 'Reference',
						name: 'reference',
						type: 'string',
						default: '',
						description: 'Your own ID for this parcel, used to find it across systems. Some products require it.',
					},
					{
						displayName: 'Weight',
						name: 'weight',
						type: 'number',
						default: 0
					},
					{
						displayName: 'Weight Unit',
						name: 'weightUnit',
						type: 'options',
						options: [
							{
								name: 'Grams',
								value: 'G',
							},
							{
								name: 'Kilograms',
								value: 'KG',
							},
					],
						default: 'KG',
					},
					{
						displayName: 'Width',
						name: 'width',
						type: 'number',
						default: 0
					},
			],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: showOnlyForShipmentCreate,
		},
		options: [
			{
				displayName: 'Additional Cover',
				name: 'additionalCover',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0, maxValue: 5000, numberPrecision: 2 },
				description:
					'Extra insurance amount, 0–5000, in the selected currency. Courier shipments with Cash on Delivery need cover of at least the same amount.',
			},
			{
				displayName: 'Cash on Delivery',
				name: 'cashOnDelivery',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0, maxValue: 5000, numberPrecision: 2 },
				description: 'Amount the recipient pays on delivery, 0–5000, in the selected currency',
			},
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'options',
				options: [
					{ name: 'EUR', value: 'EUR' },
					{ name: 'PLN', value: 'PLN' },
				],
				default: 'PLN',
				description:
					'Currency of Cash on Delivery and Additional Cover. Use PLN for shipments within Poland and EUR for international shipments.',
			},
			{
				displayName: 'Custom References',
				name: 'customReferences',
				type: 'fixedCollection',
				placeholder: 'Add Reference',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				description: 'Up to 3 of your own key-value pairs to find the shipment later, such as an order number',
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
								placeholder: 'orderId',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								placeholder: 'ORD-12345',
							},
						],
					},
				],
			},
			{
				displayName: 'Deduplication ID',
				name: 'deduplicationId',
				type: 'string',
				default: '',
				placeholder: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
				description:
					'A UUID that stops InPost from creating the same shipment twice when the request is retried. Use a value stored with your order.',
			},
			{
				displayName: 'Delivery Window',
				name: 'deliveryWindow',
				type: 'options',
				options: [
					'08:00-10:00',
					'08:00-12:00',
					'08:00-17:00',
					'08:30-09:00',
					'09:30-10:00',
					'10:30-11:00',
					'11:30-12:00',
					'12:30-13:00',
					'13:30-14:00',
					'14:30-15:00',
					'15:30-16:00',
					'16:30-17:00',
					'17:00-20:00',
				].map((window) => ({ name: window, value: window })),
				default: '08:00-10:00',
				description:
					'Delivery time window. Express courier within Poland, address to address only.',
			},
			{
				displayName: 'Email Notification',
				name: 'emailNotification',
				type: 'boolean',
				default: false,
				description:
					'Whether to notify the recipient by email. Courier within Poland, address to address only.',
			},
			{
				displayName: 'Enable Drop-Off Code',
				name: 'enableDropOffCode',
				type: 'boolean',
				default: false,
				description:
					'Whether you can drop the parcel off with a code instead of a printed label. Only when you send from an InPost point.',
			},
			{
				displayName: 'Evening Delivery',
				name: 'eveningDelivery',
				type: 'boolean',
				default: false,
				description:
					'Whether to deliver in the evening. Standard courier within Poland, address to address only.',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				options: [
					{ name: 'Express', value: 'EXPRESS' },
					{ name: 'Standard', value: 'STANDARD' },
				],
				default: 'STANDARD',
				description: 'Delivery speed. Express is for courier within Poland, address to address only.',
			},
			{
				displayName: 'Product Variant',
				name: 'productVariant',
				type: 'options',
				options: [
					{
						name: 'Courier',
						value: 'COURIER',
						description: 'Address to address, billed by volumetric weight',
					},
					{
						name: 'Standard',
						value: 'STANDARD',
					},
				],
				default: 'STANDARD',
			},
			{
				displayName: 'Return of Documents',
				name: 'returnOfDocuments',
				type: 'boolean',
				default: false,
				description:
					'Whether the courier brings signed documents back to you. Courier within Poland, address to address only.',
			},
			{
				displayName: 'Saturday Delivery',
				name: 'saturdayDelivery',
				type: 'boolean',
				default: false,
				description: 'Whether to deliver on Saturday. Within Poland only.',
			},
			{
				displayName: 'SMS Notification',
				name: 'smsNotification',
				type: 'boolean',
				default: false,
				description:
					'Whether to notify the recipient by SMS. Courier within Poland, address to address only.',
			},
		],
	},
];
