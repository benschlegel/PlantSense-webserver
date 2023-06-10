import { FastifyInstance } from 'fastify';

// Define all endpoints in this function
export async function appEndpoints(server: FastifyInstance) {
	server.get('/', async (req, reply) => {
		reply.send('Hello from app');
	});
}
