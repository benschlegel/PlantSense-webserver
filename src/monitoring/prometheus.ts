import { FastifyInstance } from 'fastify';

import * as client from 'prom-client';

const collectDefaultMetrics = client.collectDefaultMetrics;
const prefix = 'plantsense_';
collectDefaultMetrics({ prefix });

export const devicesGauge = new client.Gauge({
	name: prefix + 'num_devices',
	help: 'Number of registered devices.',
});

// Define all endpoints in this function
export async function monitoringEndpoints(server: FastifyInstance) {
	server.get('/metrics', async (req, reply) => {
		return await client.register.metrics();
	});
}
