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

/** Turns the comma-separated Tracking Numbers field into a repeated `trackingNumbers` query parameter. */
export async function setTrackingNumbers(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const trackingNumbers = parseTrackingNumbers(this.getNodeParameter('trackingNumbers', ''));

	if (trackingNumbers.length === 0) {
		throw new NodeOperationError(this.getNode(), 'No tracking number was entered', {
			description: 'Enter at least one tracking number in the Tracking Numbers field.',
		});
	}

	if (trackingNumbers.length > MAX_TRACKING_NUMBERS_PER_REQUEST) {
		throw new NodeOperationError(
			this.getNode(),
			`You entered ${trackingNumbers.length} tracking numbers, but InPost accepts at most ${MAX_TRACKING_NUMBERS_PER_REQUEST} per request`,
			{
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
				description:
					'Check that the number is typed correctly and belongs to your organization. InPost keeps tracking data for 121 days, and a new parcel appears only after its first event. To skip such numbers and keep going, turn on the node setting On Error: Continue.',
			},
		);
	}

	return parcels;
}
