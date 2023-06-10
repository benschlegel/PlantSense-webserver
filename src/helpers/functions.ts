import { getNotifications } from '../index';
import { NotificationState } from '../types/enums';

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
 * @param {string} deviceName what device to update notification for
 * @returns the generated notification
 */
export function addRandomNotification(deviceName: string) {
	// Returns notification object, if device name is already stored
	// e.g. {name: "Planty", notifications: [1]}
	const notifications = getNotifications();
	const notificationsOfDevice = notifications.find(o => o.name === deviceName);

	// Generate new random notification to "send"
	const randomNotification = generateRandomNotification();

	// If no notification object for device is stored, generate new one and add notification
	if (!notificationsOfDevice) {
		notifications.push({ name: deviceName, notifications: [randomNotification] });
	}
	else {
		notificationsOfDevice.notifications.push(randomNotification);
	}

	return randomNotification;
}
