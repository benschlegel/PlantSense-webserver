import { FastifyInstance } from 'fastify';
import { ADDRESS_PREFIX, DEFAULT_DEVICE_NAME, DEFAULT_STATE, HTTP_TIMEOUT } from '../../config/config';
import { setState } from '../../helpers/networkFunctions';
import { SendNotificationBody } from '../../types/requests';
import { getEspAddress, setEspAddress, getNotifications } from '../../index';
import { addRandomNotification } from '../../helpers/functions';

export async function microcontrollerEndpoints(server: FastifyInstance) {
	// Enable this if prefix exists
	// server.get('/', async (req, reply) => {
	// 	reply.send('Hello from microcontroller endpoint');
	// });

	/**
   * Endpoint to receive notification from esp32 microcontroller (contains device name)
   * needs payload with scheme:
   * {name: "device name here"}
   */
	server.post<{Body: SendNotificationBody}>('/sendNotification', async (request, reply) => {
		try {
		// Process the request and perform any necessary operations
			const data = request.body; // Access the request body

			const deviceName = data['name'];
			console.log('Received request: ', deviceName);

			// Update notifications array
			const state = addRandomNotification(deviceName);

			// Set state of microcontroller
			if (deviceName === DEFAULT_DEVICE_NAME) {
				setState(state, getEspAddress());
			}

			// Send the response
			reply.status(200);
		}
		catch (error) {
			console.error(error);
			reply.status(500).send({ success: false, message: 'An error occurred' });
		}
	});


	/**
   * Responds with status code 200, if microcontroller sends response within time
   * specified in 'HTTP_TIMEOUT' (~4s) or 503, if unreachable
   */
	server.get('/heartbeat', async (request, reply) => {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), HTTP_TIMEOUT);

		try {
			const response = await fetch(getEspAddress() + '/heartbeat', {
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

	/**
   * Endpoint that esp32 calls on startup to register itself (if not already registered on server)
   * Needs refactoring on esp32 microcontroller side, for now almost duplicate endpoint (see "/sendNotification")
   */
	server.post<{Body: SendNotificationBody}>('/registerDevice', async (request, reply) => {
		try {
			const newAddr = ADDRESS_PREFIX + request.ip;
			setEspAddress(newAddr);
			console.log('Registered with address: ', newAddr);
			// Process the request and perform any necessary operations
			const data = request.body; // Access the request body
			const deviceName = data['name'];

			// Register device in notifications array (if it does not already exist)
			const notifications = getNotifications();
			const notificationsOfDevice = notifications.find(o => o.name === deviceName);
			if (!notificationsOfDevice) {
				notifications.push({ name: deviceName, notifications: [] });
			}

			setState(DEFAULT_STATE, newAddr);
			// Send the response
			reply.status(200);
		}
		catch (error) {
			console.error(error);
			reply.status(500).send({ success: false, message: 'An error occurred' });
		}
	});
}
