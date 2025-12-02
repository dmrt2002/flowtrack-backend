"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHotboxConversationsSchema = void 0;
const zod_1 = require("zod");
exports.getHotboxConversationsSchema = zod_1.z.object({
    limit: zod_1.z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 50))
        .refine((val) => val > 0 && val <= 100, {
        message: 'Limit must be between 1 and 100',
    }),
    offset: zod_1.z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 0))
        .refine((val) => val >= 0, {
        message: 'Offset must be >= 0',
    }),
});
//# sourceMappingURL=hotbox.dto.js.map