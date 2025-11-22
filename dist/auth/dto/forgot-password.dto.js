"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forgotPasswordSchema = void 0;
const zod_1 = require("zod");
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email('Invalid email address')
        .toLowerCase()
        .trim(),
});
//# sourceMappingURL=forgot-password.dto.js.map