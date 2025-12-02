"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessagesQuerySchema = void 0;
const zod_1 = require("zod");
exports.getMessagesQuerySchema = zod_1.z.object({
    direction: zod_1.z.enum(['INBOUND', 'OUTBOUND']).optional(),
    limit: zod_1.z.coerce.number().min(1).max(100).default(50),
    offset: zod_1.z.coerce.number().min(0).default(0),
});
//# sourceMappingURL=get-messages.dto.js.map