import bcrypt from 'bcrypt';
import { stmtGetUserByUsername, stmtCreateUser, } from '../database/db.js';
const BCRYPT_COST = 12;
export const JWT_EXPIRATION = '30d';
export async function registerUser(username, password, age, weight_kg, experience_level, jwtSign) {
    const existingUser = stmtGetUserByUsername.get(username);
    if (existingUser) {
        throw new Error('Username already exists');
    }
    const password_hash = await bcrypt.hash(password, BCRYPT_COST);
    const now = Date.now();
    const result = stmtCreateUser.run(username, password_hash, age ?? null, weight_kg ?? null, experience_level ?? null, now, now);
    const user_id = result.lastInsertRowid;
    const token = jwtSign({
        userId: user_id,
        username,
    });
    return {
        user_id,
        token,
    };
}
export async function loginUser(username, password, jwtSign) {
    const user = stmtGetUserByUsername.get(username);
    if (!user) {
        throw new Error('Invalid credentials');
    }
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
        throw new Error('Invalid credentials');
    }
    const token = jwtSign({
        userId: user.id,
        username: user.username,
    });
    const { password_hash, ...userData } = user;
    return {
        token,
        user: userData,
    };
}
//# sourceMappingURL=authService.js.map