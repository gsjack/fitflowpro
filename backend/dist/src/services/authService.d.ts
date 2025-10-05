import { JWT_EXPIRATION } from '../utils/constants.js';
export { JWT_EXPIRATION };
export interface User {
    id: number;
    username: string;
    age?: number;
    weight_kg?: number;
    experience_level?: 'beginner' | 'intermediate' | 'advanced';
    created_at: number;
    updated_at: number;
}
export interface RegisterResponse {
    user_id: number;
    userId: number;
    username: string;
    token: string;
}
export interface LoginResponse {
    token: string;
    user: User;
}
export declare function registerUser(username: string, password: string, age: number | undefined, weight_kg: number | undefined, experience_level: 'beginner' | 'intermediate' | 'advanced' | undefined, jwtSign: (payload: {
    userId: number;
    username: string;
}) => string): Promise<RegisterResponse>;
export declare function loginUser(username: string, password: string, jwtSign: (payload: {
    userId: number;
    username: string;
}) => string): Promise<LoginResponse>;
//# sourceMappingURL=authService.d.ts.map