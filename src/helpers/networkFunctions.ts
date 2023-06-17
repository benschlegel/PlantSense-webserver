import { water, sun, fertilizer, defaultState } from '../config/config';
import { NotificationState } from '../types/enums';
import { RgbPayload } from '../types/types';

/**
 * Sends a request to set LED on esp32 microcontroller
 * @param {RgbPayload} payload must be of structure {red: 0-255, green: 0-255, blue: 0-255}
 */
export function setLed(payload: RgbPayload, espAddress: string) {
	fetch(espAddress + '/led', {
		method: 'POST',
		headers: {
			'Content-Type': 'text/plain',
		},
		body: JSON.stringify(payload),
	})
		.catch(error => {
			console.error('Error:', error);
		});
}


/**
 * Set microcontroller state (led color)
 * @param {NotificationState} state state to set microcontroller to
 */
export function setState(state: NotificationState, espAddress: string) {
	const isLedSolid = state % 2 === 1 || state === -1;
	const payload = {
		isSolid: isLedSolid,
	};

	// Set isSolid state on esp
	fetch(espAddress + '/setState', {
		method: 'POST',
		headers: {
			'Content-Type': 'text/plain',
		},
		body: JSON.stringify(payload),
	})
		.catch(error => {
			console.error('Error:', error);
		});

	// Set led state
	if (state === NotificationState.LOW_WATER || state === NotificationState.HIGH_WATER) {
		setLed(water, espAddress);
	}
	if (state === NotificationState.LOW_SUN || state === NotificationState.HIGH_SUN) {
		setLed(sun, espAddress);
	}
	if (state === NotificationState.LOW_SOIL || state === NotificationState.HIGH_SOIL) {
		setLed(fertilizer, espAddress);
	} else if (state === NotificationState.NONE) {
		setLed(defaultState, espAddress);
	}
}
