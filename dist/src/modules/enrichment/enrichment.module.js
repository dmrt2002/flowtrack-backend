"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrichmentModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const enrichment_service_1 = require("./services/enrichment.service");
const enrichment_queue_service_1 = require("./services/enrichment-queue.service");
const enrichment_processor_1 = require("./processors/enrichment.processor");
const enrichment_controller_1 = require("./enrichment.controller");
const prisma_module_1 = require("../../prisma/prisma.module");
let EnrichmentModule = class EnrichmentModule {
};
exports.EnrichmentModule = EnrichmentModule;
exports.EnrichmentModule = EnrichmentModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            bullmq_1.BullModule.registerQueue({
                name: 'lead-enrichment',
            }),
        ],
        controllers: [enrichment_controller_1.EnrichmentController],
        providers: [
            enrichment_service_1.EnrichmentService,
            enrichment_queue_service_1.EnrichmentQueueService,
            enrichment_processor_1.EnrichmentProcessor,
        ],
        exports: [enrichment_service_1.EnrichmentService, enrichment_queue_service_1.EnrichmentQueueService],
    })
], EnrichmentModule);
//# sourceMappingURL=enrichment.module.js.map