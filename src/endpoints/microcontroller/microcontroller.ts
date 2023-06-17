import { FastifyInstance } from 'fastify';
import { ADDRESS_PREFIX, DEFAULT_STATE, HTTP_TIMEOUT } from '../../config/config';
import { setState } from '../../helpers/networkFunctions';
import { RegisterDeviceBody, SendNotificationBody } from '../../types/requests';
import { getEspAddress, setEspAddress, getAddressRegister } from '../../index';
import { addRandomNotification, putAddressRegisterEntry } from '../../helpers/functions';

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

			const host = data['host'];
			console.log('Received request: ', host);

			// get register and check if host valid
			const addressRegister = getAddressRegister();

			if (!addressRegister.has(host)) {
				console.log('given host not found!');
				reply.status(500);
				return;
			}
			const deviceInfo = addressRegister.get(host);
			addressRegister.get(host);

			// generate new notification
			const newNotificationState = addRandomNotification(host);
			// Update notifications of device
			deviceInfo?.notifications.push(newNotificationState);

			// Send the response, return the new state
			const length = addressRegister.get(host)?.notifications.length;
			const notificationsArr = addressRegister.get(host)?.notifications;
			if (notificationsArr && length) {
				reply.status(200).send(notificationsArr[length - 1]);
			}
		} catch (error) {
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
		} catch (error) {
		// 503 service unavailable
			console.log('Error:', error);
			reply.status(503);
		} finally {
			clearTimeout(timeoutId);
		}
	});

	/**
   * Endpoint that esp32 calls on startup to register itself (if not already registered on server)
   * Needs refactoring on esp32 microcontroller side, for now almost duplicate endpoint (see "/sendNotification")
   */
	server.post<{Body: RegisterDeviceBody}>('/registerDevice', async (request, reply) => {
		try {
			const newAddr = ADDRESS_PREFIX + request.ip;
			setEspAddress(newAddr);
			console.log('Registered with address: ', newAddr);
			console.log('REQUEST headers', request.headers);
			// Process the request and perform any necessary operations
			const { deviceName, host } = request.body; // Access the request body		const publicIP = request.ip;


			putAddressRegisterEntry(host, { deviceName, notifications: [] });

			// Register device in notifications array (if it does not already exist)
			// const notifications = getNotifications();
			// const notificationsOfDevice = notifications.find(o => o.name === deviceName);
			// if (!notificationsOfDevice) {
			// 	notifications.push({ name: deviceName, notifications: [] });
			// }
			setState(DEFAULT_STATE, newAddr);
			// Send the response
			// TODO: also send back current status
			reply.status(200);
		} catch (error) {
			console.error(error);
			reply.status(500).send({ success: false, message: 'An error occurred' });
		}
	});
}
