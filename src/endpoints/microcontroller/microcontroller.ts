import { FastifyInstance } from 'fastify';

export async function microcontrollerEndpoints(server: FastifyInstance) {
	server.get('/', async (req, reply) => {
		reply.send('Hello from microcontroller endpoint');
	});
}
