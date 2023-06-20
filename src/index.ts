import fetch from 'node-fetch';
import * as Fastify from 'fastify';
import { RgbPayload, AddressRegisterMap, TempIP, NotificationResponse } from './types/types';
import { ClearBody, ClearNotificationQuery, CurrentInfoBody, CurrentInfoResponse, NotificationBody, RgbBody, SetStateBody, StateToRgbBody } from './types/requests';
import { setState, setLed } from './helpers/networkFunctions';
import { VERSION_PREFIX } from './config/config';
import { generalEndpoints } from './endpoints/server/server';
import { microcontrollerEndpoints } from './endpoints/microcontroller/microcontroller';
import { appEndpoints } from './endpoints/app/app';
import { getCurrentState, replacer, stateToRgb } from './helpers/functions';
import { DeviceInfo, AddMockDeviceRequest } from './types/types';
import metadata from './metadata.json';
import { NotificationState } from './types/enums';

const ips: TempIP[] = [];
// stores all devices and their notifications
const addressRegister: AddressRegisterMap = new Map();

// TODO: change this to be arr of [{name: string(esp name), address: string}]
// Change default value here, gets overriden by [POST: /registerDevice]
let espAddress = 'http://192.168.141.35';

// Export server so routes can be defined in different files/folders
export const server: Fastify.FastifyInstance = Fastify.fastify({ logger: true, trustProxy: true });

// Register all endpoints in different files/folders
// To add a new file/folder, follow the structure of "endpoints/general/general.ts" and export a function
// containing all endpoints
// all routes from register will be prefixed with prefix
server.register(generalEndpoints);
server.register(microcontrollerEndpoints, { prefix: VERSION_PREFIX + '/mc' });
server.register(appEndpoints, { prefix: VERSION_PREFIX + '/app' });

// Declare a route
server.get('/', function(request, reply) {
	console.log('Got request, ' + request.ip);
	reply.send('Response (Hello World)');
});

/**
 * Returns the name of all registered devices on the server
 * e.g: (["Planty", "Device2"])
 */
server.get('/devices', async (request, reply) => {
	const devices:string[] = [];

	console.log(addressRegister.size);

	addressRegister.forEach(element => {
		devices.push(element.deviceName);
	});


	reply.send(devices);
});

/**
 * Gets all notifications for a specific device.
 * Query specifies all hosts to search for (multiple '?hosts=' chained)
 * @returns all notifications for given devices or 404 if none of the hosts were valid.
 */
server.get<{Querystring: NotificationBody, Reply: NotificationResponse[]}>('/notifications', async (request, reply) => {
	const hosts = request.query['hosts'];
	console.log('All incoming hosts: ', hosts);
	console.log('Is array: ', Array.isArray(hosts));
	console.log('Is string: ', typeof hosts === 'string' || hosts instanceof String);
	const resultArray: NotificationResponse[] = [];

	// Return early if request is bad
	if (!hosts || hosts.length === 0) {
		reply.status(500);
	}

	// Check for only one argument
	if (typeof hosts === 'string' || hosts instanceof String) {
		// TODO: code duplication, refactor to function
		const device = addressRegister.get(hosts + '');
		if (device) {
			const entry: NotificationResponse = { deviceName: device.deviceName, notifications: device.notifications, host: hosts + '' };
			resultArray.push(entry);
		}
	}

	for (const host of hosts) {
		const device = addressRegister.get(host);
		if (device) {
			const entry: NotificationResponse = { deviceName: device.deviceName, notifications: device.notifications, host: host };
			resultArray.push(entry);
		}
	}

	// if (resultArray.length === 0) {
	// 	console.warn('invalid hosts specified!');
	// 	reply.status(404);
	// } else {
	// }
	console.log('found notifications for ' + resultArray.length + ' device(s) of ' + hosts.length + ' device(s) given');
	reply.status(200).send(resultArray);
});

/**
 * Returns all notifications for all devices stored on the server.
 * Scheme: [{name: string, notifications: number}]
 */
server.get<{Reply: NotificationResponse[]}>('/allNotifications', async (req, reply) => {
	if (addressRegister.size == 0) reply.status(500);

	const notifications:NotificationResponse[] = [];

	addressRegister.forEach((element, key) => {
		const entry: NotificationResponse = { deviceName: element.deviceName, notifications: element.notifications, host: key };
		notifications.push(entry);
	});

	reply.status(200).send(notifications);
});

/**
 * Temp endpoint to clear all devices
 */
server.delete<{Body: ClearBody}>('/clear', async (req, reply) => {
	const envPW = process.env['PASSWORD'];
	if (!envPW || envPW === '') {
		// If env pw is not set (should only be the case on local setup), clear register
		// addressRegister.clear();
		reply.status(200);
		return;
	}

	const pw = req.body['pw'];
	// For deployed version of server, check if password matches
	if (pw === envPW) {
		addressRegister.clear();
		reply.status(200);
	} else {
		reply.status(500);
	}
});

/**
 * Returns the current server version
 */
server.get('/version', async (req, reply) => {
	const versionDenominators = [metadata.buildMajor, metadata.buildMinor, metadata.buildRevision];
	const version = versionDenominators.join('.') ;
	reply.status(200).send(version);
});

/**
 * Sets the state of the microcontroller (via 'NotificationState' type).
 * Takes 'state' (?state=) as a query parameter to set new state
 * @returns 200, if successful or 500 if not.
 */
server.post<{Body: SetStateBody}>('/setState', async (request, reply) => {
	try {
		// gets the '?state=' parameter
		const stateBody = request.body['state'];

		// TODO: validation

		setState(stateBody, espAddress);
		reply.status(200);
	} catch (error) {
		console.error(error);
		reply.status(500).send({ success: false, message: 'An error occurred' });
	}
});

/**
 * Toggles the state of the microcontroller (solid light <-> blinking).
 * @returns 200, if successful or 500 if not
 */
server.post('/toggleState', (req, reply) => {
	try {
		// Set isSolid state on esp
		fetch(espAddress + '/toggleState', {
			method: 'POST',
		})
			.catch(error => {
				console.error('Error:', error);
			});

		reply.status(200);
	} catch (error) {
		console.error(error);
		reply.status(500).send({ success: false, message: 'An error occurred' });
	}
});

/**
 * Endpoint to delete a single notification of a single device
 * Takes two url parameters: ?host: host of the device, ?index: index of the notification to be deleted
 */
server.delete<{Querystring: ClearNotificationQuery}>('/clearNotification', async (request, reply) => {
	if (addressRegister.size == 0) {
		reply.status(500);
		return;
	}

	// gets the '?name=' and '?index=' parameter
	const requestHost = request.query.host;
	const index = request.query.index;

	// Get notification array of device, 404 if device was not found
	const currentDevice = addressRegister.get(requestHost);

	if (!currentDevice) {
		reply.status(404);
		return;
	}

	// Return with 400, if index is invalid
	if (index < 0 || index > currentDevice.notifications.length - 1) {
		reply.status(400);
		return;
	}

	// Remove notification at index from array
	currentDevice.notifications.splice(index, 1);
	// paranoid
	addressRegister.set(requestHost, currentDevice);

	// If there are remaining notifications, pick most recent one after deleting
	reply.status(200);
});

/**
 * Gets the current IP address of the microcontroller
 */
server.get('/deviceAddress', async (request, reply) => {
	reply.status(200).send({ address: espAddress });
});

/**
 * Gets current info of a selected host/device (via body)
 */
server.get<{Querystring: CurrentInfoBody, Reply: CurrentInfoResponse}>('/currentInfo', async (request, reply) => {
	// TODO: check if host param exists
	const host = request.query.host;
	const stateNumber = parseInt(getCurrentState(host) + '');
	console.log('State number: ', stateNumber);
	const currentRgb = stateToRgb(stateNumber);
	let notifications = 0;
	addressRegister.forEach((element, key) => {
		console.log('Lenght for: ' + key + ' = ' + element.notifications.length);
		notifications += element.notifications.length;
	});
	reply.status(200).send({ totalNotificationAmount: notifications, isBreathing: currentRgb.isBreathing, rgb: currentRgb.rgb });
});

/**
 * Returns the rgb values for a given state
 * TODO: fix query string type, doesnt work with number or notificationstate
 */
server.get<{Querystring: {state: string}, Reply: RgbBody}>('/stateToRgb', async (request, reply) => {
	const state = parseInt(request.query.state);
	const rgb = stateToRgb(state);
	reply.status(200).send(rgb);
});

/**
 * Gets all saved IP addresses
 */
server.get('/ips', async (request, reply) => {
	const stringMap = JSON.stringify(addressRegister, replacer);
	return reply.status(200).send(stringMap);
});


/**
 * Set the color of the LED-strip connected to the microcontroller.
 * @param rgb takes an object of type 'RgbPayload' in http body. ({red: 0-255, green: 0-255, blue: 0-255})
 */
server.post<{Body: RgbPayload}>('/led', async (request, reply) => {
	try {
		// Process the request and perform any necessary operations
		const data = request.body; // Access the request body
		// TODO: check if incoming payload is valid before passing on
		// Send post request to esp (with incoming payload)
		setLed(data, espAddress);

		// Send the response
		reply.send({ success: true, message: 'Data received successfully' });
	} catch (error) {
		console.error(error);
		reply.status(500).send({ success: false, message: 'An error occurred' });
	}
});

// Run the server!
server.listen({ port: 80, host:'0.0.0.0' }, function(err, address) {
	if (err) {
		server.log.error(err);
		process.exit(1);
	}

	console.log('Server is now listening on: ', address);
	console.log('Routes: ', server.printRoutes());
});

// simply add Planty to the address register, mock
server.post<{Body: AddMockDeviceRequest}>('/addPlanty', async (request, reply) => {
	console.log('adding Planty to addressregister');
	let amount = request.body['deviceAmount'];
	const { notificationAmount, randomizeAmount } = request.body;
	if (!amount) amount = 1;

	for (let i = 0; i < amount; i++) {
		const name = 'Planty' + i;
		const host = 'testHost' + i;
		const planty = { deviceName: name, notifications: [0, 1] };
		addressRegister.set(host, planty);
	}

	console.log('added ' + amount + ' planty(s)! addressregister size: ', addressRegister.size);
	reply.send(200);
});

// Setters and getters
export function setEspAddress(newAddress: string) {
	espAddress = newAddress;
}

export function getEspAddress() {
	return espAddress;
}

export function getIPs() {
	return ips;
}

export function getAddressRegister() {
	return addressRegister;
}
