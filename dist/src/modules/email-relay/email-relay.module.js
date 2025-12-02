"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailRelayModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const prisma_module_1 = require("../../prisma/prisma.module");
const message_service_1 = require("./services/message.service");
const relay_email_service_1 = require("./services/relay-email.service");
const imap_poller_service_1 = require("./services/imap-poller.service");
const email_poll_queue_service_1 = require("./services/email-poll-queue.service");
const email_poll_processor_1 = require("./processors/email-poll.processor");
const message_controller_1 = require("./controllers/message.controller");
const hotbox_controller_1 = require("./controllers/hotbox.controller");
let EmailRelayModule = class EmailRelayModule {
};
exports.EmailRelayModule = EmailRelayModule;
exports.EmailRelayModule = EmailRelayModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            config_1.ConfigModule,
            jwt_1.JwtModule.register({}),
            bullmq_1.BullModule.registerQueue({
                name: 'email-relay-poll',
            }),
        ],
        controllers: [message_controller_1.MessageController, hotbox_controller_1.HotboxController],
        providers: [
            message_service_1.MessageService,
            relay_email_service_1.RelayEmailService,
            imap_poller_service_1.ImapPollerService,
            email_poll_queue_service_1.EmailPollQueueService,
            email_poll_processor_1.EmailPollProcessor,
        ],
        exports: [relay_email_service_1.RelayEmailService, message_service_1.MessageService],
    })
], EmailRelayModule);
//# sourceMappingURL=email-relay.module.js.map