import { NotificationState } from '../types/enums';
import { RgbPayload } from '../types/types';

export const water: RgbPayload = {
	red: 0,
	green: 0,
	blue: 255,
};

export const sun: RgbPayload = {
	red: 255,
	green: 63,
	blue: 0,
};

export const fertilizer: RgbPayload = {
	red: 255,
	green: 0,
	blue: 255,
};

export const defaultState: RgbPayload = {
	red: 0,
	green: 63,
	blue: 0,
};

export const DEFAULT_STATE = NotificationState.NONE;
export const DEFAULT_DEVICE_NAME = 'PlantSense - Planty';

export const HTTP_TIMEOUT = 4000;
export const ADDRESS_PREFIX = 'http://';

export const VERSION_PREFIX = '/v1';
