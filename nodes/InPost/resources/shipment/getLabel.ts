import type { INodeProperties } from 'n8n-workflow';

const showOnlyForShipmentGetLabel = {
	operation: ['getLabel'],
	resource: ['shipment'],
};

export const shipmentGetLabelDescription: INodeProperties[] = [
	{
		displayName: 'Format',
		name: 'format',
		type: 'options',
		options: [
			{
				name: 'EPL2 (203 Dpi)',
				value: 'text/epl2+json;dpi=203',
				description: 'For thermal printers. Domestic shipments within Poland only.',
			},
			{
				name: 'PDF A4',
				value: 'application/pdf+json;format=A4',
			},
			{
				name: 'PDF A6',
				value: 'application/pdf+json;format=A6',
				description: 'Label size, 105 × 148 mm',
			},
			{
				name: 'ZPL (203 Dpi)',
				value: 'text/zpl+json;dpi=203',
				description: 'For Zebra thermal printers',
			},
			{
				name: 'ZPL (300 Dpi)',
				value: 'text/zpl+json;dpi=300',
				description: 'For Zebra thermal printers',
			},
		],
		default: 'application/pdf+json;format=A6',
		description: 'File format of the label',
		displayOptions: {
			show: showOnlyForShipmentGetLabel,
		},
		routing: {
			request: {
				headers: {
					Accept: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		hint: 'The name of the output binary field to put the label file in',
		displayOptions: {
			show: showOnlyForShipmentGetLabel,
		},
	},
];
