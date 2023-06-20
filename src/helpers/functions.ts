import { DeviceInfo } from '../types/types';
import { getAddressRegister } from '../index';
import { NotificationState } from '../types/enums';
import { RgbBody } from '../types/requests';
import { defaultState, fertilizer, sun, water } from '../config/config';

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
export function getRandomInt(min: number, max: number) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}


/**
 * Generates a new random (and valid) notification based on all available 'NotificationStates'
 * @returns a random notification state
 */
export function generateRandomNotification(): NotificationState {
	const stateAmount = getNotificationStatusSize();

	// substract 1 to get valid max index from amount of state entires
	return getRandomInt(0, stateAmount - 1);
}

/**
 * Gets the size of all valid 'NotificationState' entries.
 * Modify 'invalidStateEntires', if more invalid entires are added.
 * @returns number of entires in the 'NotificationState' enum
 */
export function getNotificationStatusSize() {
	const invalidStateEntries = 1;
	return (Object.keys(NotificationState).length / 2) - invalidStateEntries;
}

/**
 * Adds a random notification to a device. If the specified device does not exist, a new
 * entry for it will be created.
 * @param {string} host what device to update notification for
 * @returns the generated notification
 */
export function addRandomNotification(host: string): NotificationState {
	// Returns notification object, if device name is already stored
	const addressRegister = getAddressRegister();
	const deviceInfo = addressRegister.get(host);

	// If no notification object for device is stored, return "none" state
	if (!deviceInfo) {
		return NotificationState.NONE;
	}

	// Generate new random notification to "send"
	const randomNotification = generateRandomNotification();

	// Add new notification to array and return generated one
	deviceInfo.notifications.push(randomNotification);
	return randomNotification;
}

/**
 * Add new entry to global address register based on parameters.
 * For duplicate entries (same public ip + mac address), entries will be overriden.
 * Otherwise, new entries will be added.
 * @param host mac address of new entry
 * @param deviceInfo device info of new entry
 */
export function putAddressRegisterEntry(host: string, deviceInfo: DeviceInfo) {
	const register = getAddressRegister();
	const device = register.get(host);

	if (device) {
		// Update deviceName
		device.deviceName = deviceInfo.deviceName;

		// Check if notifications already exist and only update if not
		const oldNotifications = device.notifications;
		if (!oldNotifications) {
			device.notifications = deviceInfo.notifications;
		}

		// Save result
		register.set(host, device);
	} else {
		register.set(host, deviceInfo);
	}
}

/**
 * used to stringify nested map
 */
export function replacer(key: any, value: any) {
	if (value instanceof Map) {
		return {
			dataType: 'Map',
			value: Array.from(value.entries()), // or with spread: value: [...value]
		};
	} else {
		return value;
	}
}

/**
 * Gets the current state of a given device (by host name) or 'NONE', if host was not found
 * @param host which device to get state of
 * @returns Current state of device or 'NONE', if device is in no state or not found
 */
export function getCurrentState(host: string): NotificationState {
	// Get device from register
	const deviceInfo = getAddressRegister().get(host);

	// If in invalid state, return NONE
	if (!deviceInfo || deviceInfo.notifications.length === 0) {
		return NotificationState.NONE;
	}

	// Get most recent state and return it
	const notifications = deviceInfo.notifications;
	const state = notifications[notifications.length - 1];
	return state;
}

export function stateToRgb(state: NotificationState): RgbBody {
	console.log('Called with state:_ ', state);
	if (state === 0 || state === 1) {
		return { rgb: water, isBreathing: state % 2 === 0 };
	} else if (state === 2 || state === 3) {
		return { rgb: sun, isBreathing: state % 2 === 0 };
	} else if (state === 4 || state === 5) {
		return { rgb: fertilizer, isBreathing: state % 2 === 0 };
	} else {
		return { rgb: defaultState, isBreathing: false };
	}
	// switch (state) {
	// case NotificationState.LOW_WATER: {
	// 	return { rgb: water, isBreathing: true };
	// }
	// case NotificationState.HIGH_WATER: {
	// 	return { rgb: water, isBreathing: false };
	// }
	// case NotificationState.LOW_SOIL: {
	// 	return { rgb: fertilizer, isBreathing: true };
	// }
	// case NotificationState.HIGH_SOIL: {
	// 	return { rgb: fertilizer, isBreathing: false };
	// }
	// case NotificationState.LOW_SUN: {
	// 	return { rgb: sun, isBreathing: true };
	// }
	// case NotificationState.HIGH_SUN: {
	// 	return { rgb: sun, isBreathing: false };
	// }
	// default: {
	// 	return { rgb: defaultState, isBreathing: false };
	// }
	// }
}
