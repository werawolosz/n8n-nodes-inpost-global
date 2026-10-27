import type { INodeProperties } from 'n8n-workflow';
import { checkInPostResponse, IGNORE_STATUS_ERRORS } from '../../shared/errors';
import { labelToBinary, requireOrganizationId, setShipmentBody } from '../../shared/shipment';
import { shipmentCreateDescription } from './create';
import { shipmentTrackingNumberField } from './get';
import { shipmentGetLabelDescription } from './getLabel';

const showOnlyForShipments = {
	resource: ['shipment'],
};

const shipmentsUrl =
	'=/shipping/v2/organizations/{{ encodeURIComponent(String($credentials.organizationId).trim()) }}/shipments';

export const shipmentDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForShipments,
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create shipment',
				description: 'Create a new shipment to an InPost point or an address',
				routing: {
					request: {
						method: 'POST',
						ignoreHttpStatusErrors: IGNORE_STATUS_ERRORS,
						url: shipmentsUrl,
					},
					send: {
						preSend: [requireOrganizationId, setShipmentBody],
					},
					output: {
						postReceive: [checkInPostResponse],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get shipment',
				description: 'Get the parcel numbers and routing of a shipment',
				routing: {
					request: {
						method: 'GET',
						ignoreHttpStatusErrors: IGNORE_STATUS_ERRORS,
						url: `${shipmentsUrl}/{{ encodeURIComponent(String($parameter.trackingNumber).trim()) }}`,
					},
					send: {
						preSend: [requireOrganizationId],
					},
					output: {
						postReceive: [checkInPostResponse],
					},
				},
			},
			{
				name: 'Get Label',
				value: 'getLabel',
				action: 'Get shipment label',
				description: 'Download the label of a shipment as a PDF, ZPL or EPL2 file',
				routing: {
					request: {
						method: 'GET',
						ignoreHttpStatusErrors: IGNORE_STATUS_ERRORS,
						url: `${shipmentsUrl}/{{ encodeURIComponent(String($parameter.trackingNumber).trim()) }}/label`,
					},
					send: {
						preSend: [requireOrganizationId],
					},
					output: {
						postReceive: [checkInPostResponse, labelToBinary],
					},
				},
			},
		],
		default: 'create',
	},
	...shipmentCreateDescription,
	shipmentTrackingNumberField,
	...shipmentGetLabelDescription,
];
