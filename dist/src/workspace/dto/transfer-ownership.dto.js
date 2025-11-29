"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transferOwnershipSchema = void 0;
const zod_1 = require("zod");
exports.transferOwnershipSchema = zod_1.z.object({
    newOwnerId: zod_1.z
        .string()
        .uuid('New owner ID must be a valid UUID')
        .min(1, 'New owner ID is required'),
});
//# sourceMappingURL=transfer-ownership.dto.js.map