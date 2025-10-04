/**
 * JWT Authentication Middleware
 *
 * Verifies JWT tokens from Authorization header and attaches user info to request
 */

import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Extended FastifyRequest with authenticated user information
 */
export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    userId: number;
    username: string;
  };
}

/**
 * JWT Authentication Middleware
 *
 * Verifies JWT from Authorization header (Bearer token format)
 * Attaches decoded user info to req.user for authenticated routes
 * Returns 401 if token is invalid, expired, or missing
 *
 * Usage:
 * fastify.addHook('preHandler', authenticateJWT)
 * OR
 * fastify.get('/protected', { preHandler: authenticateJWT }, handler)
 */
export async function authenticateJWT(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // Verify JWT token - Fastify JWT plugin automatically checks Authorization header
    await request.jwtVerify();

    // Token is valid, user payload is attached by @fastify/jwt
    // The plugin attaches the decoded payload to request.user
    // Type assertion needed because Fastify types don't know our payload structure
  } catch (error) {
    // Token is invalid, expired, or missing
    return reply.status(401).send({
      error: 'Unauthorized - Invalid or expired token',
    });
  }
}
