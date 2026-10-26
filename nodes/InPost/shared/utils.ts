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

/** Turns the comma-separated Tracking Numbers field into a repeated `trackingNumbers` query parameter. */
export async function setTrackingNumbers(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const input = this.getNodeParameter('trackingNumbers', '') as string;
	const trackingNumbers = [
		...new Set(
			String(input)
				.split(',')
				.map((value) => value.trim())
				.filter((value) => value !== ''),
		),
	];

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
 */
export async function splitParcels(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	return items.flatMap((item) => {
		const parcels = item.json.parcels;
		if (Array.isArray(parcels)) {
			return parcels.map((parcel) => ({ json: parcel as IDataObject }));
		}
		return [item];
	});
}
