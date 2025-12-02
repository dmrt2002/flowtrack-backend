"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRelayEmailSchema = void 0;
const zod_1 = require("zod");
exports.sendRelayEmailSchema = zod_1.z.object({
    subject: zod_1.z.string().min(1, 'Subject is required').max(500, 'Subject is too long'),
    htmlBody: zod_1.z.string().optional(),
    textBody: zod_1.z.string().min(1, 'Text body is required'),
    senderName: zod_1.z.string().optional(),
});
//# sourceMappingURL=send-relay-email.dto.js.map