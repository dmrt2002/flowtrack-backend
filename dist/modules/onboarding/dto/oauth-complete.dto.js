"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.oauthCompleteSchema = void 0;
const zod_1 = require("zod");
exports.oauthCompleteSchema = zod_1.z.object({
    provider: zod_1.z.enum(['gmail', 'outlook']),
    email: zod_1.z.string().email('Invalid email address').toLowerCase().trim(),
});
//# sourceMappingURL=oauth-complete.dto.js.map