"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendVerificationSchema = void 0;
const zod_1 = require("zod");
exports.resendVerificationSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email('Invalid email address')
        .toLowerCase()
        .trim(),
});
//# sourceMappingURL=resend-verification.dto.js.map