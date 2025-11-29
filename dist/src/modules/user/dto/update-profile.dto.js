"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateProfileSchema = zod_1.z.object({
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
    avatarUrl: zod_1.z
        .string()
        .url('Invalid URL format')
        .max(500, 'Avatar URL must not exceed 500 characters')
        .optional()
        .nullable(),
});
//# sourceMappingURL=update-profile.dto.js.map