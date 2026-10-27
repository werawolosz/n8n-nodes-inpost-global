import {
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type INodeExecutionData,
} from 'n8n-workflow';

const SIMPLIFIED_POINT_FIELDS = [
	'id',
	'type',
	'displayName',
	'locationType',
	'location247',
	'capabilities',
	'address',
	'coordinates',
	'distance',
];

const MAX_TRACKING_NUMBERS_PER_REQUEST = 10;

export function simplifyPoint(point: IDataObject): IDataObject {
	const simplified: IDataObject = {};
	for (const field of SIMPLIFIED_POINT_FIELDS) {
		if (point[field] !== undefined) {
			simplified[field] = point[field];
		}
	}
	const description = point.description as IDataObject | undefined;
	if (description?.content !== undefined) {
		simplified.description = description.content;
	}
	return simplified;
}

export async function simplifyPoints(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const simplify = this.getNodeParameter('simplify', true) as boolean;
	if (!simplify) {
		return items;
	}
	return items.map((item) => ({ ...item, json: simplifyPoint(item.json) }));
}

function parseTrackingNumbers(input: unknown): string[] {
	return [
		...new Set(
			String(input ?? '')
				.split(',')
				.map((value) => value.trim())
				.filter((value) => value !== ''),
		),
	];
}

/**
 * Sends the Search Nearby Country as `address.country`. With `relativePostCode` InPost requires
 * exactly one country (400 `only_one_country_must_be_selected`), which the OpenAPI spec does not say.
 */
export async function setPostalCodeCountry(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const country = String(this.getNodeParameter('country', '')).trim().toUpperCase();

	if (!/^[A-Z]{2}$/.test(country)) {
		throw new NodeOperationError(this.getNode(), 'Searching by postal code needs exactly one country', {
			itemIndex: this.getItemIndex(),
			description:
				"Enter one two-letter country code in 'Country', for example PL. To search in several countries, use one input item per country.",
		});
	}

	return {
		...requestOptions,
		qs: { ...requestOptions.qs, 'address.country': country },
	};
}

/** Turns the comma-separated Tracking Numbers field into a repeated `trackingNumbers` query parameter. */
export async function setTrackingNumbers(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const trackingNumbers = parseTrackingNumbers(this.getNodeParameter('trackingNumbers', ''));

	if (trackingNumbers.length === 0) {
		throw new NodeOperationError(this.getNode(), 'No tracking number was entered', {
			itemIndex: this.getItemIndex(),
			description: "Enter at least one tracking number in 'Tracking Numbers'.",
		});
	}

	if (trackingNumbers.length > MAX_TRACKING_NUMBERS_PER_REQUEST) {
		throw new NodeOperationError(
			this.getNode(),
			`You entered ${trackingNumbers.length} tracking numbers, but InPost accepts at most ${MAX_TRACKING_NUMBERS_PER_REQUEST} per request`,
			{
				itemIndex: this.getItemIndex(),
				description: `Split the tracking numbers across several input items, with at most ${MAX_TRACKING_NUMBERS_PER_REQUEST} in each.`,
			},
		);
	}

	return {
		...requestOptions,
		qs: { ...requestOptions.qs, trackingNumbers },
		arrayFormat: 'repeat',
	};
}

/**
 * Returns one item per parcel. The spec's example shows `{ parcels: [...] }`, while its schema
 * describes an array of such objects, so both shapes are accepted.
 * Stops with a clear message when InPost returns no data for some of the requested numbers.
 */
export async function splitParcels(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const parcels = items.flatMap((item) => {
		const itemParcels = item.json.parcels;
		if (Array.isArray(itemParcels)) {
			return itemParcels.map((parcel) => ({ json: parcel as IDataObject }));
		}
		return item.json.trackingNumber !== undefined ? [item] : [];
	});

	const found = new Set(
		parcels.map((parcel) => String(parcel.json.trackingNumber ?? '').toUpperCase()),
	);
	const missing = parseTrackingNumbers(this.getNodeParameter('trackingNumbers', '')).filter(
		(trackingNumber) => !found.has(trackingNumber.toUpperCase()),
	);

	if (missing.length > 0) {
		const label = missing.length === 1 ? 'tracking number' : 'tracking numbers';
		throw new NodeOperationError(
			this.getNode(),
			`InPost has no tracking data for ${label} ${missing.join(', ')}`,
			{
				itemIndex: this.getItemIndex(),
				description:
					"Check that the number is typed correctly and belongs to your organization. InPost keeps tracking data for 121 days, and a new parcel appears only after its first event. To skip such numbers and keep going, set 'On Error' to 'Continue' in the node settings.",
			},
		);
	}

	return parcels;
}
