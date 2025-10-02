export async function authenticateJWT(request, reply) {
    try {
        await request.jwtVerify();
    }
    catch (error) {
        return reply.status(401).send({
            error: 'Unauthorized - Invalid or expired token',
        });
    }
}
//# sourceMappingURL=auth.js.map