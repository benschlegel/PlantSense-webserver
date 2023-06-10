import fetch from 'node-fetch';
import * as Fastify from 'fastify';
import { Notification, RgbPayload } from './types/types';
import { ClearNotificationQuery, NotificationParams, SendNotificationBody, SetStateBody } from './types/requests';
import { generateRandomNotification } from './helpers/functions';
import { setState, setLed } from './helpers/networkFunctions';
import { HTTP_TIMEOUT, DEFAULT_DEVICE_NAME, ADDRESS_PREFIX, DEFAULT_STATE } from './config/config';
import { generalEndpoints } from './endpoints/general/general';
import { microcontrollerEndpoints } from './endpoints/microcontroller/microcontroller';
import { appEndpoints } from './endpoints/app/app';

// Initial notification (mock only)
const defaultNotification: Notification = { name: 'Planty', notifications: [0, 1] };

// Storage notifications for all devices
const notifications: Notification[] = [defaultNotification];

// TODO: change this to be arr of [{name: string(esp name), address: string}]
// Change default value here, gets overriden by [POST: /registerDevice]
let espAddress = 'http://192.168.141.35';

// Export server so routes can be defined in different files/folders
export const server: Fastify.FastifyInstance = Fastify.fastify({ logger: true });

// Register all endpoints in different files/folders
// To add a new file/folder, follow the structure of "endpoints/general/general.ts" and export a function
// containing all endpoints
// all routes from register will be prefixed with prefix
server.register(generalEndpoints);
server.register(microcontrollerEndpoints, { prefix: '/mc' });
server.register(appEndpoints, { prefix: '/app' });

// Declare a route
server.get('/', function(request, reply) {
	console.log('Got request, ' + request.ip);
	reply.send('Response (Hello World)');
});

server.get('/heartbeat', async (request, reply) => {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), HTTP_TIMEOUT);

	try {
		const response = await fetch(espAddress + '/heartbeat', {
			signal: controller.signal,
		}).then(() => {
			// If request was successful, pass success status code
			console.log('Esp heartbeat ack');
			reply.status(200);
		});
		console.log(response);
	}
	catch (error) {
		// 503 service unavailable
		console.log('Error:', error);
		reply.status(503);
	}
	finally {
		clearTimeout(timeoutId);
	}
});

// Endpoint to receive notification from esp32 microcontroller (contains device name)
// needs payload with scheme:
// {name: "device name here"}
server.post<{Body: SendNotificationBody}>('/sendNotification', async (request, reply) => {
	try {
		// Process the request and perform any necessary operations
		const data = request.body; // Access the request body

		const deviceName = data['name'];
		console.log('Received request: ', deviceName);

		// Update notifications array
		const state = updateNotifications(deviceName);

		// Set state of microcontroller
		if (deviceName === DEFAULT_DEVICE_NAME) {
			setState(state, espAddress);
		}

		// Send the response
		reply.status(200);
	}
	catch (error) {
		console.error(error);
		reply.status(500).send({ success: false, message: 'An error occurred' });
	}
});

// Endpoint that esp calls on startup to register itself (if not already registered on server)
// Needs refactoring on esp32 microcontroller side, for now almost duplicate endpoint (see "/sendNotification")
server.post<{Body: SendNotificationBody}>('/registerDevice', async (request, reply) => {
	try {
		espAddress = ADDRESS_PREFIX + request.ip;
		console.log('Registered with address: ', espAddress);
		// Process the request and perform any necessary operations
		const data = request.body; // Access the request body
		const deviceName = data['name'];

		// Register device in notifications array (if it does not already exist)
		const notificationsOfDevice = notifications.find(o => o.name === deviceName);
		if (!notificationsOfDevice) {
			notifications.push({ name: deviceName, notifications: [] });
		}

		setState(DEFAULT_STATE, espAddress);
		// Send the response
		reply.status(200);
	}
	catch (error) {
		console.error(error);
		reply.status(500).send({ success: false, message: 'An error occurred' });
	}
});

// Returns the name of all registered devices on the server
// e.g: (["Planty", "Device2"])
server.get('/devices', async (request, reply) => {
	const devices = [];
	for (const element of notifications) {
		devices.push(element.name);
	}

	reply.send(devices);
});

server.get<{Querystring: NotificationParams}>('/notifications', async (request, reply) => {
	// gets the '?name=' parameter
	const deviceName = request.query.name;

	// Find notifications for device
	const notificationsOfDevice = notifications.find(o => o.name === deviceName);
	if (!notificationsOfDevice) {
		console.log('Invalid device');
		reply.status(404);
	}
	else {
		reply.status(200).send(notificationsOfDevice.notifications);
	}
});

/**
 * Returns all notifications for all devices stored on the server.
 * Scheme: [{name: string, notifications: number}]
 */
server.get('/allNotifications', async (req, reply) => {
	if (!notifications) {
		reply.status(500);
		return;
	}
	reply.status(200).send(notifications);
});

server.post<{Body: SetStateBody}>('/setState', async (request, reply) => {
	try {
		// gets the '?state=' parameter
		const stateBody = request.body['state'];

		// TODO: validation

		setState(stateBody, espAddress);
		reply.status(200);
	}
	catch (error) {
		console.error(error);
		reply.status(500).send({ success: false, message: 'An error occurred' });
	}
});

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
	}
	catch (error) {
		console.error(error);
		reply.status(500).send({ success: false, message: 'An error occurred' });
	}
});

/**
 * Endpoint to delete a single notification of a single device
 * Takes two url parameters: ?name: name of the device, ?index: index of the notification to be deleted
 */
server.delete<{Querystring: ClearNotificationQuery}>('/clearNotification', async (request, reply) => {
	if (!notifications) {
		reply.status(500);
		return;
	}

	// gets the '?name=' and '?index=' parameter
	const deviceName = request.query.name;
	const index = request.query.index;

	// Get notification array of device, 404 if device was not found
	const notificationsOfDevice = notifications.find(o => o.name === deviceName);
	if (!notificationsOfDevice) {
		reply.status(404);
		return;
	}

	// Return with 400, if index is invalid
	if (index < 0 || index > notificationsOfDevice.notifications.length - 1) {
		reply.status(400);
		return;
	}
	// Remove notification at index from array
	notificationsOfDevice.notifications.splice(index, 1);

	// After removing notification, set state to last notification entry
	const notificationLength = notificationsOfDevice.notifications.length;
	// If there are remaining notifications, pick most recent one after deleting

	if (deviceName === DEFAULT_DEVICE_NAME) {
		if (notificationLength > 0) {
			const state = notificationsOfDevice.notifications[notificationsOfDevice.notifications.length - 1];
			setState(state, espAddress);
		}
		else {
			setState(DEFAULT_STATE, espAddress);
		}
	}
	reply.status(200);
});

server.get('/deviceAddress', async (request, reply) => {
	reply.status(200).send({ address: espAddress });
});

// Set leds on esp32 microcontroller
server.post<{Body: RgbPayload}>('/led', async (request, reply) => {
	try {
		// Process the request and perform any necessary operations
		const data = request.body; // Access the request body

		// const red = data['red'];
		// const green = data['green'];
		// const blue = data['blue'];

		// Return if payload is not valid
		// TODO: check if incoming payload is valid before passing on
		// if(!red || !green || !blue) {
		//   console.log("validation failed")
		//   reply.status(500).send({ success: false, message: 'An error occurred' });
		//   return;
		// }

		// console.log("validation passed!")

		// console.log("Red: " + red + ", green: " + green + ", blue: " + blue);

		// const payload = {
		//   "red": red,
		//   "green": green,
		//   "blue": blue
		// }

		// TODO: just pass data, no need to reformat (maybe)
		// TODO: split routes into folders/files
		// Send post request to esp (with incoming payload)
		setLed(data, espAddress);

		// Send the response
		reply.send({ success: true, message: 'Data received successfully' });
	}
	catch (error) {
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
});


// Helpers
// Hard to move since it modifies global notification state
/**
 *
 * @param {string} deviceName what device to update notification for
 * @returns the generated notification
 */
function updateNotifications(deviceName: string) {
	// Returns notification object, if device name is already stored
	// e.g. {name: "Planty", notifications: [1]}
	const notificationsOfDevice = notifications.find(o => o.name === deviceName);

	// Generate new random notification to "send"
	const randomNotification = generateRandomNotification();

	// If no notification object for device is stored, generate new one and add notification
	if (!notificationsOfDevice) {
		notifications.push({ name: deviceName, notifications: [randomNotification] });
		console.log('Adding new notifications for: ', deviceName);
	}
	else {
		notificationsOfDevice.notifications.push(randomNotification);
		console.log('Notifications for device \'' + deviceName + '\': ', notificationsOfDevice.notifications);
	}

	return randomNotification;
}

