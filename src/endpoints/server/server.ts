import { FastifyInstance } from 'fastify';

// Define all endpoints in this function
export async function generalEndpoints(server: FastifyInstance) {
	server.get('/ping', async (req, reply) => {
		reply.send('Hello from general');
		//
	});
}
