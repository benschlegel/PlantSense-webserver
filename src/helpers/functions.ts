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
