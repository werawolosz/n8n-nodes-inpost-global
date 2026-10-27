import {
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IgnoreStatusErrorConfig,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
} from 'n8n-workflow';

/**
 * Lets InPost's problem details reach `checkInPostResponse` instead of n8n's generic messages.
 * 401 still throws, so that n8n fetches a new OAuth2 token and retries the request.
 */
export const IGNORE_STATUS_ERRORS: IgnoreStatusErrorConfig = { ignore: true, except: [401] };

const CONTRACT_HINT =
	'Your InPost account probably has no active logistics contract yet. Shipments and pickups work only after InPost activates its services for your organization, so contact InPost about the contract.';

const ORGANIZATION_ID_HINT =
	"Also check that 'Organization ID' in the credentials is the organization ID from the API tab of the InPost Merchant Portal, not the ID from the page address.";

const STATUS_TITLES: Record<number, string> = {
	400: 'InPost did not accept the request',
	403: 'InPost refused access with this token',
	404: 'InPost could not find what was requested',
	409: 'InPost reported a conflict with existing data',
	422: 'InPost did not accept the request',
	429: 'InPost received too many requests',
};

const STATUS_HINTS: Record<number, string> = {
	403: 'Check that your API client has the scope this operation needs, and that the credentials use the right environment.',
	429: "Wait a moment and try again, or space the requests out with the node setting 'Retry On Fail'.",
};

function parseBody(body: unknown): IDataObject {
	let value = body;
	if (Buffer.isBuffer(value)) {
		value = value.toString('utf8');
	}
	if (typeof value === 'string') {
		const text = value.trim();
		try {
			value = JSON.parse(text);
		} catch {
			return text ? { detail: text } : {};
		}
	}
	return value && typeof value === 'object' && !Array.isArray(value) ? (value as IDataObject) : {};
}

/** InPost lists field problems as `{ field: [messages] }` or as an array of `{ field, message }`. */
function formatFieldErrors(errors: unknown): string[] {
	if (Array.isArray(errors)) {
		return errors.map((entry) => {
			if (entry && typeof entry === 'object') {
				const error = entry as IDataObject;
				const field = error.field ?? error.path ?? error.name ?? error.parameter;
				const message = error.message ?? error.code ?? error.detail ?? error.reason;
				return [field, message].filter((part) => part !== undefined).join(': ');
			}
			return String(entry);
		});
	}
	if (errors && typeof errors === 'object') {
		return Object.entries(errors as IDataObject).map(([field, messages]) => {
			const text = Array.isArray(messages) ? messages.map(String).join(', ') : String(messages);
			return `${field}: ${text}`;
		});
	}
	return [];
}

function getParameter(context: IExecuteSingleFunctions, name: string): string {
	try {
		return String(context.getNodeParameter(name, '') ?? '').trim();
	} catch {
		return '';
	}
}

/**
 * Stops with InPost's own title, detail and field messages when a request was rejected.
 * Put it first in every operation's `postReceive`, next to `ignoreHttpStatusErrors: IGNORE_STATUS_ERRORS`.
 */
export async function checkInPostResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const status = response.statusCode;
	if (status < 400) {
		return items;
	}

	const body = parseBody(response.body);
	const resource = getParameter(this, 'resource');
	const operation = getParameter(this, 'operation');
	const bodyText = JSON.stringify(body);

	const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : undefined;
	const detail = typeof body.detail === 'string' && body.detail.trim() ? body.detail.trim() : undefined;
	const fieldErrors = formatFieldErrors(
		body.errors ?? (body.properties as IDataObject | undefined)?.errors,
	);

	let message =
		title ??
		STATUS_TITLES[status] ??
		(status >= 500
			? 'InPost is not available at the moment'
			: `InPost answered with status ${status}`);
	const hints: string[] = [];

	if (status === 404 && resource === 'shipment' && (operation === 'get' || operation === 'getLabel')) {
		message = `InPost has no shipment with tracking number ${getParameter(this, 'trackingNumber')}`;
		hints.push(
			'Check that the tracking number is typed correctly and that the shipment was created by your organization.',
			ORGANIZATION_ID_HINT,
		);
	} else if (status === 404 && resource === 'pickup' && (operation === 'get' || operation === 'cancel')) {
		message = `InPost has no pickup with order ID ${getParameter(this, 'orderId')}`;
		hints.push(
			'Check that the order ID is typed correctly and that the pickup was created by your organization.',
			ORGANIZATION_ID_HINT,
		);
	} else if (resource === 'shipment' && status === 403) {
		hints.push(CONTRACT_HINT, ORGANIZATION_ID_HINT);
	} else if (resource === 'pickup' && /PayerNotFound/i.test(bodyText)) {
		hints.push(CONTRACT_HINT, ORGANIZATION_ID_HINT);
	} else if (status >= 500) {
		hints.push(
			'Try again in a few minutes. If it keeps happening, contact InPost and include the details below.',
		);
	} else if (STATUS_HINTS[status]) {
		hints.push(STATUS_HINTS[status]);
	}

	const description = [
		detail && detail !== message ? detail : undefined,
		fieldErrors.length > 0 ? `Fields to fix: ${fieldErrors.join('; ')}` : undefined,
		...hints,
		`HTTP status ${status}${typeof body.type === 'string' ? `, type ${body.type}` : ''}.`,
	]
		.filter((part) => part !== undefined)
		.join('\n\n');

	throw new NodeOperationError(this.getNode(), message, {
		itemIndex: this.getItemIndex(),
		description,
	});
}
