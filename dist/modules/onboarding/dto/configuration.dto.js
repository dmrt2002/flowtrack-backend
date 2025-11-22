"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configurationSchema = void 0;
const zod_1 = require("zod");
exports.configurationSchema = zod_1.z.object({
    strategyId: zod_1.z.enum(['inbound-leads', 'outbound-sales', 'customer-nurture']),
    configuration: zod_1.z.record(zod_1.z.string(), zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean()])),
});
//# sourceMappingURL=configuration.dto.js.map