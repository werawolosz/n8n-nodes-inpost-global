import {
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type INodeExecutionData,
} from 'n8n-workflow';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const MIN_WINDOW_MINUTES = 120;
const MAX_DAYS_AHEAD = 7;
const OPEN_STATUSES = ['CREATED', 'PENDING', 'RESCHEDULED'];

type WallTime = {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
};

type PickupAddress = {
	street?: string;
	houseNumber?: string;
	flatNumber?: string;
	city?: string;
	postalCode?: string;
	locationDescription?: string;
};

type ContactPerson = {
	firstName?: string;
	lastName?: string;
	email?: string;
	phone?: string;
};

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

function wallTimeIn(timestamp: number, timeZone: string): WallTime {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	}).formatToParts(new Date(timestamp));
	const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
	return {
		year: get('year'),
		month: get('month'),
		day: get('day'),
		hour: get('hour'),
		minute: get('minute'),
		second: get('second'),
	};
}

function wallTimeToUtc(wall: WallTime): number {
	return Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
}

/** Offset of `timeZone` from UTC at the given moment, in milliseconds. */
function offsetAt(timestamp: number, timeZone: string): number {
	return wallTimeToUtc(wallTimeIn(timestamp, timeZone)) - Math.floor(timestamp / 1000) * 1000;
}

function formatOffset(offset: number): string {
	const sign = offset < 0 ? '-' : '+';
	const minutes = Math.abs(Math.round(offset / MINUTE));
	return `${sign}${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export type PickupMoment = {
	/** Milliseconds since epoch. */
	timestamp: number;
	/** ISO 8601 date-time with the offset of the time zone, as InPost expects it. */
	iso: string;
	/** Calendar date (YYYY-MM-DD) in the time zone. */
	date: string;
};

/**
 * Reads a date-time parameter. Values without an offset (as the n8n date picker gives them) are
 * read as wall-clock time in `timeZone`; values with an offset or `Z` keep their moment.
 */
export function toPickupMoment(value: unknown, timeZone: string): PickupMoment | undefined {
	const text = String(value ?? '').trim();
	const match = text.match(
		/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/i,
	);
	if (!match) {
		return undefined;
	}
	const [, year, month, day, hour, minute, second = '0', zone] = match;
	let timestamp: number;
	if (zone) {
		timestamp = Date.parse(text.replace(' ', 'T'));
	} else {
		const guess = wallTimeToUtc({
			year: Number(year),
			month: Number(month),
			day: Number(day),
			hour: Number(hour),
			minute: Number(minute),
			second: Number(second),
		});
		timestamp = guess - offsetAt(guess, timeZone);
		timestamp = guess - offsetAt(timestamp, timeZone);
	}
	if (Number.isNaN(timestamp)) {
		return undefined;
	}
	const wall = wallTimeIn(timestamp, timeZone);
	const date = `${wall.year}-${pad(wall.month)}-${pad(wall.day)}`;
	const iso = `${date}T${pad(wall.hour)}:${pad(wall.minute)}:${pad(wall.second)}${formatOffset(offsetAt(timestamp, timeZone))}`;
	return { timestamp, iso, date };
}

/** Splits a Polish phone number into the `{ prefix, number }` object the Pickups API expects. */
export function parsePolishPhone(input: string): { prefix: string; number: string } | undefined {
	let digits = input.replace(/[\s\-().]/g, '');
	if (digits.startsWith('+48')) {
		digits = digits.slice(3);
	} else if (digits.startsWith('0048')) {
		digits = digits.slice(4);
	} else if (digits.startsWith('48') && digits.length === 11) {
		digits = digits.slice(2);
	}
	return /^\d{9}$/.test(digits) ? { prefix: '+48', number: digits } : undefined;
}

function compact(object: IDataObject): IDataObject {
	const result: IDataObject = {};
	for (const [key, value] of Object.entries(object)) {
		if (value !== undefined && value !== null && value !== '') {
			result[key] = value;
		}
	}
	return result;
}

export function buildPickupBody(this: IExecuteSingleFunctions, now = Date.now()): IDataObject {
	const node = this.getNode();
	const timeZone = this.getTimezone();

	const address = this.getNodeParameter('pickupAddress', {}) as PickupAddress;
	const contact = this.getNodeParameter('contactPerson', {}) as ContactPerson;

	const phone = parsePolishPhone(String(contact.phone ?? ''));
	if (!phone) {
		throw new NodeOperationError(node, "The 'Phone' of the contact person is not a Polish phone number", {
			itemIndex: this.getItemIndex(),
			description:
				'InPost pickups accept only Polish numbers (+48). Enter 9 digits, for example 512345678 or +48 512 345 678.',
		});
	}

	const from = toPickupMoment(this.getNodeParameter('pickupFrom'), timeZone);
	const to = toPickupMoment(this.getNodeParameter('pickupTo'), timeZone);
	if (!from || !to) {
		throw new NodeOperationError(node, "'Pickup From' and 'Pickup To' need a date and a time", {
			itemIndex: this.getItemIndex(),
			description: 'Pick both values in the date picker, or use a date-time such as 2026-10-27T09:00.',
		});
	}
	if (from.date !== to.date) {
		throw new NodeOperationError(node, 'The pickup window must start and end on the same day', {
			itemIndex: this.getItemIndex(),
			description: `'Pickup From' is on ${from.date} and 'Pickup To' is on ${to.date}. Choose times on one day, usually between 09:00 and 18:00.`,
		});
	}
	if (to.timestamp - from.timestamp < MIN_WINDOW_MINUTES * MINUTE) {
		throw new NodeOperationError(
			node,
			`The pickup window must be at least ${MIN_WINDOW_MINUTES} minutes long`,
			{
				itemIndex: this.getItemIndex(),
				description: "Move 'Pickup To' later, or 'Pickup From' earlier, so that there are at least 2 hours between them.",
			},
		);
	}
	if (to.timestamp <= now) {
		throw new NodeOperationError(node, 'The pickup window is already over', {
			itemIndex: this.getItemIndex(),
			description: "Choose a 'Pickup To' time in the future.",
		});
	}
	const latestDate = toPickupMoment(new Date(now + MAX_DAYS_AHEAD * DAY).toISOString(), timeZone)?.date;
	if (latestDate && from.date > latestDate) {
		throw new NodeOperationError(
			node,
			`A pickup can be booked at most ${MAX_DAYS_AHEAD} days ahead`,
			{
				itemIndex: this.getItemIndex(),
				description: `Choose a day up to ${latestDate}.`,
			},
		);
	}

	const itemType = this.getNodeParameter('itemType') as string;
	const count = this.getNodeParameter('count') as number;
	const body: IDataObject = {
		address: compact({
			countryCode: 'PL',
			street: address.street,
			houseNumber: address.houseNumber,
			flatNumber: address.flatNumber,
			city: address.city,
			postalCode: address.postalCode,
			locationDescription: address.locationDescription,
		}),
		contactPerson: compact({
			firstName: contact.firstName,
			lastName: contact.lastName,
			email: contact.email,
			phone,
		}),
		pickupTime: { from: from.iso, to: to.iso },
	};

	if (itemType === 'RECYCLABLE_PACKAGING') {
		const trackingNumbers = String(this.getNodeParameter('trackingNumbers', ''))
			.split(',')
			.map((value) => value.trim())
			.filter((value) => value !== '');
		if (trackingNumbers.length === 0) {
			throw new NodeOperationError(node, 'Recyclable packaging pickups need tracking numbers', {
				itemIndex: this.getItemIndex(),
				description: 'Enter the tracking numbers of the packaging, separated by commas.',
			});
		}
		body.volume = {
			itemType,
			count,
			totalVolume: { amount: this.getNodeParameter('totalVolume') as number, unit: 'L' },
		};
		body.trackingNumbers = [...new Set(trackingNumbers)];
	} else {
		body.volume = {
			itemType,
			count,
			totalWeight: {
				amount: this.getNodeParameter('totalWeight') as number,
				unit: this.getNodeParameter('weightUnit', 'KG') as string,
			},
		};
	}

	const additional = this.getNodeParameter('additionalFields', {}) as {
		customReferences?: { reference?: Array<{ key?: string; value?: string }> };
	};
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
	if (Object.keys(customReferences).length > 0) {
		body.references = { custom: customReferences };
	}

	return body;
}

/** Builds the nested Create Pickup body from the node's flat parameters. */
export async function setPickupBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	return { ...requestOptions, body: buildPickupBody.call(this) };
}

function formatAddress(address: IDataObject | undefined): string | undefined {
	if (!address) {
		return undefined;
	}
	const building = [address.houseNumber, address.flatNumber].filter(Boolean).join('/');
	const street = [address.street, building].filter(Boolean).join(' ');
	const city = [address.postalCode, address.city].filter(Boolean).join(' ');
	return [street, city].filter(Boolean).join(', ') || undefined;
}

export function simplifyPickup(order: IDataObject): IDataObject {
	const pickupTime = order.pickupTime as IDataObject | undefined;
	const volume = order.volume as IDataObject | undefined;
	const carrierReference = order.carrierReference as IDataObject | undefined;
	const status = order.status as string | undefined;
	const simplified: IDataObject = {
		id: order.id,
		status,
		isOpen: status === undefined ? undefined : OPEN_STATUSES.includes(status),
		pickupFrom: pickupTime?.from,
		pickupTo: pickupTime?.to,
		address: formatAddress(order.address as IDataObject | undefined),
		itemType: volume?.itemType,
		count: volume?.count,
		carrierTrackingNumber: carrierReference?.trackingNumber,
		createdTime: order.createdTime,
	};
	return compact(simplified);
}

export async function simplifyPickups(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const simplify = this.getNodeParameter('simplify', true) as boolean;
	if (!simplify) {
		return items;
	}
	return items.map((item) => ({ ...item, json: simplifyPickup(item.json) }));
}

export async function cancelPickupOutput(
	this: IExecuteSingleFunctions,
): Promise<INodeExecutionData[]> {
	const id = String(this.getNodeParameter('orderId')).trim();
	return [{ json: { id, cancelRequested: true } }];
}

/** The spec shows the cut-off both as `{ hour, minute, ... }` and as "13:00:00"; output "13:00". */
export function formatCutoffTime(value: unknown): string | undefined {
	if (typeof value === 'string') {
		const match = value.match(/^(\d{1,2}):(\d{2})/);
		return match ? `${pad(Number(match[1]))}:${match[2]}` : value;
	}
	if (value && typeof value === 'object') {
		const time = value as IDataObject;
		if (typeof time.hour === 'number') {
			return `${pad(time.hour)}:${pad(typeof time.minute === 'number' ? time.minute : 0)}`;
		}
	}
	return undefined;
}

export async function cutoffTimeOutput(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const postalCode = String(this.getNodeParameter('postalCode')).trim();
	return items.map((item) => ({
		json: {
			postalCode: item.json.postalCode ?? postalCode,
			cutoffTime: formatCutoffTime(item.json.cutoffTime),
		},
	}));
}
