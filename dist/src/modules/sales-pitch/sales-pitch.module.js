"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesPitchModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("../../prisma/prisma.module");
const prisma_service_1 = require("../../prisma/prisma.service");
const sales_pitch_controller_1 = require("./sales-pitch.controller");
const pitch_config_controller_1 = require("./controllers/pitch-config.controller");
const sales_pitch_service_1 = require("./services/sales-pitch.service");
const ollama_pitch_service_1 = require("./services/ollama-pitch.service");
const pitch_queue_service_1 = require("./services/pitch-queue.service");
const pitch_processor_1 = require("./processors/pitch.processor");
const pitch_template_service_1 = require("./services/pitch-template.service");
const pitch_config_service_1 = require("./services/pitch-config.service");
let SalesPitchModule = class SalesPitchModule {
};
exports.SalesPitchModule = SalesPitchModule;
exports.SalesPitchModule = SalesPitchModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            jwt_1.JwtModule.register({}),
            prisma_module_1.PrismaModule,
            bullmq_1.BullModule.registerQueue({
                name: 'pitch-generation',
            }),
        ],
        controllers: [sales_pitch_controller_1.SalesPitchController, pitch_config_controller_1.PitchConfigController],
        providers: [
            prisma_service_1.PrismaService,
            sales_pitch_service_1.SalesPitchService,
            ollama_pitch_service_1.OllamaPitchService,
            pitch_queue_service_1.PitchQueueService,
            pitch_processor_1.PitchProcessor,
            pitch_template_service_1.PitchTemplateService,
            pitch_config_service_1.PitchConfigService,
        ],
        exports: [sales_pitch_service_1.SalesPitchService, pitch_queue_service_1.PitchQueueService, pitch_config_service_1.PitchConfigService],
    })
], SalesPitchModule);
//# sourceMappingURL=sales-pitch.module.js.map