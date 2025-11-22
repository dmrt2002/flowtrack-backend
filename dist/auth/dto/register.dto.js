"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email('Invalid email address')
        .toLowerCase()
        .trim(),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must not exceed 128 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    firstName: zod_1.z
        .string()
        .min(1, 'First name is required')
        .max(50, 'First name must not exceed 50 characters')
        .trim()
        .optional(),
    lastName: zod_1.z
        .string()
        .min(1, 'Last name is required')
        .max(50, 'Last name must not exceed 50 characters')
        .trim()
        .optional(),
});
//# sourceMappingURL=register.dto.js.map