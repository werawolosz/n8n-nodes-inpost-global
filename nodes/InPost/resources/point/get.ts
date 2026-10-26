import type { INodeProperties } from 'n8n-workflow';
import { languageOption } from '../../shared/descriptions';

const showOnlyForPointGet = {
	operation: ['get'],
	resource: ['point'],
};

export const pointGetDescription: INodeProperties[] = [
	{
		displayName: 'Point ID',
		name: 'pointId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'PL_KRA02APP',
		description: 'ID of the point: the country code, an underscore and the point name',
		displayOptions: {
			show: showOnlyForPointGet,
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: showOnlyForPointGet,
		},
		options: [languageOption],
	},
];
