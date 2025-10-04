import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import workoutRoutes from './routes/workouts.js';
import setRoutes from './routes/sets.js';
import recoveryRoutes from './routes/recovery.js';
import analyticsRoutes from './routes/analytics.js';
import programDaysRoutes from './routes/programDays.js';
import exerciseRoutes from './routes/exercises.js';
import programRoutes from './routes/programs.js';
import programExerciseRoutes from './routes/program-exercises.js';
import vo2maxRoutes from './routes/vo2max.js';
const JWT_SECRET = process.env.JWT_SECRET || 'fitflow-dev-secret-change-in-production';
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
export async function buildApp() {
    const app = Fastify({
        logger: {
            level: process.env.LOG_LEVEL || 'info',
        },
        trustProxy: true,
    });
    await app.register(cors, {
        origin: true,
        credentials: true,
    });
    await app.register(jwt, {
        secret: JWT_SECRET,
        sign: {
            expiresIn: '30d',
        },
    });
    app.get('/health', async () => {
        return { status: 'ok', timestamp: Date.now() };
    });
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(userRoutes, { prefix: '/api' });
    await app.register(workoutRoutes, { prefix: '/api' });
    await app.register(setRoutes, { prefix: '/api' });
    await app.register(recoveryRoutes, { prefix: '/api' });
    await app.register(analyticsRoutes, { prefix: '/api' });
    await app.register(programDaysRoutes, { prefix: '/api' });
    await app.register(exerciseRoutes, { prefix: '/api/exercises' });
    await app.register(programRoutes, { prefix: '/api' });
    await app.register(programExerciseRoutes, { prefix: '/api' });
    await app.register(vo2maxRoutes, { prefix: '/api' });
    return app;
}
async function start() {
    try {
        const app = await buildApp();
        await app.listen({ port: PORT, host: HOST });
        console.log(`FitFlow Pro API server listening on ${HOST}:${PORT}`);
    }
    catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    start();
}
export default buildApp;
//# sourceMappingURL=server.js.map