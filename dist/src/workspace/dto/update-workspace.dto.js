"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWorkspaceSchema = void 0;
const zod_1 = require("zod");
exports.updateWorkspaceSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(1, 'Workspace name is required')
        .max(100, 'Workspace name must not exceed 100 characters')
        .trim()
        .optional(),
});
//# sourceMappingURL=update-workspace.dto.js.map