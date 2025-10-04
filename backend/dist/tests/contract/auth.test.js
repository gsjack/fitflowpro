import tap from 'tap';
import buildApp from '../../src/server.js';
tap.test('Authentication Endpoints Contract Tests', async (t) => {
    const app = await buildApp();
    await t.test('POST /api/auth/register', async (t) => {
        await t.test('should register new user with valid data and return 201', async (t) => {
            const validRegistration = {
                username: 'test@example.com',
                password: 'SecurePass123!',
                age: 28,
                weight_kg: 75.5,
                experience_level: 'intermediate'
            };
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/register',
                payload: validRegistration
            });
            t.equal(response.statusCode, 201, 'should return 201 Created');
            const body = JSON.parse(response.body);
            t.ok(body.user_id, 'response should contain user_id');
            t.type(body.user_id, 'number', 'user_id should be a number');
            t.ok(body.token, 'response should contain token');
            t.type(body.token, 'string', 'token should be a string');
            t.match(body.token, /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/, 'token should be a valid JWT');
        });
        await t.test('should validate username is email format', async (t) => {
            const invalidUsername = {
                username: 'notanemail',
                password: 'SecurePass123!',
                age: 28,
                weight_kg: 75.5,
                experience_level: 'intermediate'
            };
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/register',
                payload: invalidUsername
            });
            t.equal(response.statusCode, 400, 'should return 400 for invalid email format');
            const body = JSON.parse(response.body);
            t.ok(body.error, 'response should contain error field');
            t.type(body.error, 'string', 'error should be a string');
        });
        await t.test('should validate password minimum length (8 characters)', async (t) => {
            const shortPassword = {
                username: 'test@example.com',
                password: 'short',
                age: 28,
                weight_kg: 75.5,
                experience_level: 'intermediate'
            };
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/register',
                payload: shortPassword
            });
            t.equal(response.statusCode, 400, 'should return 400 for password < 8 chars');
            const body = JSON.parse(response.body);
            t.ok(body.error, 'response should contain error field');
        });
        await t.test('should validate age range (13-100)', async (t) => {
            const invalidAge = {
                username: 'test@example.com',
                password: 'SecurePass123!',
                age: 10,
                weight_kg: 75.5,
                experience_level: 'intermediate'
            };
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/register',
                payload: invalidAge
            });
            t.equal(response.statusCode, 400, 'should return 400 for age < 13');
            const body = JSON.parse(response.body);
            t.ok(body.error, 'response should contain error field');
        });
        await t.test('should validate weight_kg range (30-300)', async (t) => {
            const invalidWeight = {
                username: 'test@example.com',
                password: 'SecurePass123!',
                age: 28,
                weight_kg: 25,
                experience_level: 'intermediate'
            };
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/register',
                payload: invalidWeight
            });
            t.equal(response.statusCode, 400, 'should return 400 for weight_kg < 30');
            const body = JSON.parse(response.body);
            t.ok(body.error, 'response should contain error field');
        });
        await t.test('should validate experience_level enum', async (t) => {
            const invalidExperience = {
                username: 'test@example.com',
                password: 'SecurePass123!',
                age: 28,
                weight_kg: 75.5,
                experience_level: 'expert'
            };
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/register',
                payload: invalidExperience
            });
            t.equal(response.statusCode, 400, 'should return 400 for invalid experience_level');
            const body = JSON.parse(response.body);
            t.ok(body.error, 'response should contain error field');
        });
        await t.test('should return 409 for duplicate username', async (t) => {
            const registration = {
                username: 'existing@example.com',
                password: 'SecurePass123!',
                age: 28,
                weight_kg: 75.5,
                experience_level: 'intermediate'
            };
            await app.inject({
                method: 'POST',
                url: '/api/auth/register',
                payload: registration
            });
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/register',
                payload: registration
            });
            t.equal(response.statusCode, 409, 'should return 409 for duplicate username');
            const body = JSON.parse(response.body);
            t.ok(body.error, 'response should contain error field');
            t.type(body.error, 'string', 'error should be a string');
        });
        await t.test('should allow registration without optional fields', async (t) => {
            const minimalRegistration = {
                username: 'minimal@example.com',
                password: 'SecurePass123!'
            };
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/register',
                payload: minimalRegistration
            });
            t.equal(response.statusCode, 201, 'should return 201 with only required fields');
            const body = JSON.parse(response.body);
            t.ok(body.user_id, 'response should contain user_id');
            t.ok(body.token, 'response should contain token');
        });
    });
    await t.test('POST /api/auth/login', async (t) => {
        await t.test('should login with valid credentials and return 200', async (t) => {
            await app.inject({
                method: 'POST',
                url: '/api/auth/register',
                payload: {
                    username: 'login@example.com',
                    password: 'SecurePass123!',
                    age: 28,
                    weight_kg: 75.5,
                    experience_level: 'intermediate'
                }
            });
            const loginData = {
                username: 'login@example.com',
                password: 'SecurePass123!'
            };
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: loginData
            });
            t.equal(response.statusCode, 200, 'should return 200 OK');
            const body = JSON.parse(response.body);
            t.ok(body.token, 'response should contain token');
            t.type(body.token, 'string', 'token should be a string');
            t.match(body.token, /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/, 'token should be a valid JWT');
            t.ok(body.user, 'response should contain user object');
            t.type(body.user, 'object', 'user should be an object');
            t.ok(body.user.id, 'user should have id');
            t.type(body.user.id, 'number', 'user.id should be a number');
            t.equal(body.user.username, 'login@example.com', 'user should have correct username');
            t.type(body.user.username, 'string', 'user.username should be a string');
            t.ok(body.user.created_at, 'user should have created_at timestamp');
            t.type(body.user.created_at, 'number', 'user.created_at should be a number (Unix timestamp)');
        });
        await t.test('should return 401 for invalid username', async (t) => {
            const invalidLogin = {
                username: 'nonexistent@example.com',
                password: 'SecurePass123!'
            };
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: invalidLogin
            });
            t.equal(response.statusCode, 401, 'should return 401 for invalid username');
            const body = JSON.parse(response.body);
            t.ok(body.error, 'response should contain error field');
            t.type(body.error, 'string', 'error should be a string');
        });
        await t.test('should return 401 for invalid password', async (t) => {
            await app.inject({
                method: 'POST',
                url: '/api/auth/register',
                payload: {
                    username: 'wrongpass@example.com',
                    password: 'CorrectPass123!',
                    age: 28,
                    weight_kg: 75.5,
                    experience_level: 'intermediate'
                }
            });
            const invalidLogin = {
                username: 'wrongpass@example.com',
                password: 'WrongPassword!'
            };
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: invalidLogin
            });
            t.equal(response.statusCode, 401, 'should return 401 for invalid password');
            const body = JSON.parse(response.body);
            t.ok(body.error, 'response should contain error field');
            t.type(body.error, 'string', 'error should be a string');
        });
        await t.test('should require both username and password', async (t) => {
            const missingPassword = {
                username: 'test@example.com'
            };
            const response = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: missingPassword
            });
            t.equal(response.statusCode, 400, 'should return 400 for missing password');
            const body = JSON.parse(response.body);
            t.ok(body.error, 'response should contain error field');
        });
    });
    await app.close();
});
//# sourceMappingURL=auth.test.js.map