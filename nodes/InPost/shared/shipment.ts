import {
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type INodeExecutionData,
} from 'n8n-workflow';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LABEL_FILE_TYPES: Record<string, { extension: string; mimeType: string }> = {
	'application/pdf+json;format=A6': { extension: 'pdf', mimeType: 'application/pdf' },
	'application/pdf+json;format=A4': { extension: 'pdf', mimeType: 'application/pdf' },
	'text/zpl+json;dpi=203': { extension: 'zpl', mimeType: 'text/plain' },
	'text/zpl+json;dpi=300': { extension: 'zpl', mimeType: 'text/plain' },
	'text/epl2+json;dpi=203': { extension: 'epl', mimeType: 'text/plain' },
};

type Party = {
	firstName?: string;
	lastName?: string;
	email?: string;
	phone?: string;
	companyName?: string;
};

type AddressFields = {
	countryCode?: string;
	street?: string;
	houseNumber?: string;
	flatNumber?: string;
	city?: string;
	postalCode?: string;
};

type ParcelFields = {
	length?: number;
	width?: number;
	height?: number;
	dimensionUnit?: string;
	weight?: number;
	weightUnit?: string;
	nonStandardShape?: boolean;
	reference?: string;
};

type CreateAdditionalFields = {
	productVariant?: string;
	currency?: string;
	cashOnDelivery?: number;
	additionalCover?: number;
	priority?: string;
	deliveryWindow?: string;
	smsNotification?: boolean;
	emailNotification?: boolean;
	saturdayDelivery?: boolean;
	eveningDelivery?: boolean;
	returnOfDocuments?: boolean;
	enableDropOffCode?: boolean;
	customReferences?: { reference?: Array<{ key?: string; value?: string }> };
	deduplicationId?: string;
};

function compact(object: IDataObject): IDataObject {
	const result: IDataObject = {};
	for (const [key, value] of Object.entries(object)) {
		if (value !== undefined && value !== null && value !== '') {
			result[key] = value;
		}
	}
	return result;
}

function buildParty(party: Party): IDataObject {
	return compact({
		firstName: party.firstName,
		lastName: party.lastName,
		email: party.email,
		phone: party.phone,
		companyName: party.companyName,
	});
}

function buildAddress(address: AddressFields): IDataObject {
	return compact({
		countryCode: address.countryCode,
		street: address.street,
		houseNumber: address.houseNumber,
		flatNumber: address.flatNumber,
		city: address.city,
		postalCode: address.postalCode,
	});
}

/** Point IDs from the Location API look like `PL_KRA09N`; the Shipping API expects `KRA09N`. */
export function normalizePointId(pointId: string, countryCode: string): string {
	const trimmed = pointId.trim();
	const prefix = `${countryCode.toUpperCase()}_`;
	return trimmed.toUpperCase().startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
}

function getOrganizationId(credentials: IDataObject): string {
	return String(credentials.organizationId ?? '').trim();
}

/** Stops early when the credentials have no Organization ID, which every Shipping API path needs. */
export async function requireOrganizationId(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const credentials = await this.getCredentials('inPostGlobalOAuth2Api');
	if (!getOrganizationId(credentials)) {
		throw new NodeOperationError(this.getNode(), 'The credentials have no Organization ID', {
			itemIndex: this.getItemIndex(),
			description:
				"Open the InPost Global OAuth2 API credentials and fill in 'Organization ID'. You get it from InPost when your account is set up, or in the Merchant Portal.",
		});
	}
	return requestOptions;
}

export function buildShipmentBody(
	this: IExecuteSingleFunctions,
): { body: IDataObject; deduplicationId?: string } {
	const node = this.getNode();
	const sendFrom = this.getNodeParameter('sendFrom') as string;
	const deliverTo = this.getNodeParameter('deliverTo') as string;

	let origin: IDataObject;
	if (sendFrom === 'point') {
		origin = compact({
			countryCode: this.getNodeParameter('originCountryCode') as string,
			shippingMethod: this.getNodeParameter('shippingMethod') as string,
			subdivisionCode: this.getNodeParameter('subdivisionCode', '') as string,
		});
	} else {
		origin = buildAddress(this.getNodeParameter('originAddress', {}) as AddressFields);
	}

	let destination: IDataObject;
	if (deliverTo === 'point') {
		const countryCode = this.getNodeParameter('destinationCountryCode') as string;
		destination = {
			countryCode,
			pointId: normalizePointId(this.getNodeParameter('pointId') as string, countryCode),
		};
	} else {
		destination = buildAddress(this.getNodeParameter('destinationAddress', {}) as AddressFields);
	}

	const parcelsInput = this.getNodeParameter('parcels', {}) as { parcel?: ParcelFields[] };
	const parcels = (parcelsInput.parcel ?? []).map((parcel) => {
		const result: IDataObject = {
			type: 'STANDARD',
			dimensions: {
				length: parcel.length,
				width: parcel.width,
				height: parcel.height,
				unit: parcel.dimensionUnit ?? 'CM',
			},
			weight: {
				amount: parcel.weight,
				unit: parcel.weightUnit ?? 'KG',
			},
		};
		if (parcel.nonStandardShape) {
			result.nonStandardShape = true;
		}
		if (parcel.reference) {
			result.references = { trackableReference: parcel.reference };
		}
		return result;
	});

	if (parcels.length === 0) {
		throw new NodeOperationError(node, 'The shipment has no parcels', {
			itemIndex: this.getItemIndex(),
			description: "Add at least one parcel in 'Parcels'.",
		});
	}

	if ((sendFrom === 'point' || deliverTo === 'point') && parcels.length > 1) {
		throw new NodeOperationError(
			node,
			`A shipment sent from or to an InPost point can have only one parcel, but ${parcels.length} were added`,
			{
				itemIndex: this.getItemIndex(),
				description: 'Keep one parcel, or create a separate shipment for each parcel.',
			},
		);
	}

	const additional = this.getNodeParameter('additionalFields', {}) as CreateAdditionalFields;
	const currency = additional.currency ?? 'PLN';
	const valueAddedServices: IDataObject[] = [];

	if (additional.priority) {
		valueAddedServices.push({ id: 'priority', value: additional.priority });
	}
	if (additional.deliveryWindow) {
		valueAddedServices.push({ id: 'deliveryBetween', value: additional.deliveryWindow });
	}
	const flags: Array<[keyof CreateAdditionalFields, string]> = [
		['saturdayDelivery', 'saturdayDelivery'],
		['smsNotification', 'smsNotification'],
		['emailNotification', 'emailNotification'],
		['returnOfDocuments', 'returnOfDocuments'],
		['eveningDelivery', 'eveningDelivery'],
	];
	for (const [field, id] of flags) {
		if (additional[field] === true) {
			valueAddedServices.push({ id, value: true });
		}
	}
	if (additional.cashOnDelivery !== undefined) {
		valueAddedServices.push({ id: 'cashOnDelivery', value: additional.cashOnDelivery, currency });
	}
	if (additional.additionalCover !== undefined) {
		valueAddedServices.push({
			id: 'additionalCover',
			value: additional.additionalCover,
			currency,
		});
	}

	const isCourier = sendFrom === 'address' && deliverTo === 'address';
	if (
		isCourier &&
		additional.cashOnDelivery !== undefined &&
		(additional.additionalCover ?? 0) < additional.cashOnDelivery
	) {
		throw new NodeOperationError(
			node,
			'A courier shipment with Cash on Delivery needs Additional Cover of at least the same amount',
			{
				itemIndex: this.getItemIndex(),
				description: `Add Additional Cover of at least ${additional.cashOnDelivery} ${currency} in 'Additional Fields'.`,
			},
		);
	}

	const customReferences: IDataObject = {};
	for (const reference of additional.customReferences?.reference ?? []) {
		if (reference.key) {
			customReferences[reference.key] = reference.value ?? '';
		}
	}
	if (Object.keys(customReferences).length > 3) {
		throw new NodeOperationError(node, 'InPost accepts at most 3 custom references', {
			itemIndex: this.getItemIndex(),
			description: 'Remove custom references until at most 3 are left.',
		});
	}

	const deduplicationId = additional.deduplicationId?.trim();
	if (deduplicationId && !UUID_PATTERN.test(deduplicationId)) {
		throw new NodeOperationError(node, "'Deduplication ID' is not a UUID", {
			itemIndex: this.getItemIndex(),
			description:
				"Use a UUID such as 3fa85f64-5717-4562-b3fc-2c963f66afa6, ideally one stored with your order so that a retry sends the same value. Leave 'Deduplication ID' empty if you do not need it.",
		});
	}

	const body: IDataObject = {
		sender: buildParty(this.getNodeParameter('sender', {}) as Party),
		recipient: buildParty(this.getNodeParameter('recipient', {}) as Party),
		origin,
		destination,
		parcels,
	};
	if (additional.productVariant) {
		body.productVariant = additional.productVariant;
	}
	if (valueAddedServices.length > 0) {
		body.valueAddedServices = valueAddedServices;
	}
	if (additional.enableDropOffCode) {
		body.enableDropOffCode = true;
	}
	if (Object.keys(customReferences).length > 0) {
		body.references = { custom: customReferences };
	}

	return { body, deduplicationId: deduplicationId || undefined };
}

/** Builds the nested Create Shipment body from the node's flat parameters. */
export async function setShipmentBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const { body, deduplicationId } = buildShipmentBody.call(this);
	const headers: IDataObject = { ...requestOptions.headers };
	if (deduplicationId) {
		headers['X-Deduplication-Id'] = deduplicationId;
	}
	return { ...requestOptions, headers, body };
}

/** Turns the base64 label from the JSON response into a binary file. */
export async function labelToBinary(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const format = this.getNodeParameter('format') as string;
	const binaryProperty = (this.getNodeParameter('binaryPropertyName', 'data') as string) || 'data';
	const trackingNumber = String(this.getNodeParameter('trackingNumber')).trim();
	const fileType = LABEL_FILE_TYPES[format] ?? { extension: 'bin', mimeType: 'application/octet-stream' };

	return await Promise.all(
		items.map(async (item) => {
			const label = item.json.label as IDataObject | undefined;
			const content = label?.content;
			if (typeof content !== 'string' || content === '') {
				throw new NodeOperationError(
					this.getNode(),
					`InPost returned no label for shipment ${trackingNumber}`,
					{
						itemIndex: this.getItemIndex(),
						description:
							'Check the tracking number. If the shipment was created a moment ago, wait a few seconds and try again.',
					},
				);
			}
			const binary = await this.helpers.prepareBinaryData(
				Buffer.from(content, 'base64'),
				`label-${trackingNumber}.${fileType.extension}`,
				fileType.mimeType,
			);
			return {
				json: { trackingNumber, format },
				binary: { [binaryProperty]: binary },
			};
		}),
	);
}
