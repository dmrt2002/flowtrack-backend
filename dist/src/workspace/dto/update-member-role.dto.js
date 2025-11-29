"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMemberRoleSchema = void 0;
const zod_1 = require("zod");
exports.updateMemberRoleSchema = zod_1.z.object({
    role: zod_1.z.enum(['admin', 'member', 'viewer']),
});
//# sourceMappingURL=update-member-role.dto.js.map