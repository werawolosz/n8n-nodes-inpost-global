import type {
	IDataObject,
	IExecuteSingleFunctions,
	INodeExecutionData,
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
