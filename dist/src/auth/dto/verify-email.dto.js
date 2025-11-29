"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmailSchema = void 0;
const zod_1 = require("zod");
exports.verifyEmailSchema = zod_1.z.object({
    token: zod_1.z
        .string()
        .min(1, 'Token is required'),
});
//# sourceMappingURL=verify-email.dto.js.map