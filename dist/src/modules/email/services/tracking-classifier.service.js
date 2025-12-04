"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TrackingClassifierService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingClassifierService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
let TrackingClassifierService = TrackingClassifierService_1 = class TrackingClassifierService {
    configService;
    logger = new common_1.Logger(TrackingClassifierService_1.name);
    PREFETCH_WINDOW_SECONDS;
    constructor(configService) {
        this.configService = configService;
        this.PREFETCH_WINDOW_SECONDS = this.configService.get('EMAIL_TRACKING_PREFETCH_WINDOW_SECONDS', 60);
    }
    classify(isAppleProxy, sentAt, openedAt) {
        const timeDeltaMs = openedAt - sentAt;
        const timeDeltaSeconds = Math.floor(timeDeltaMs / 1000);
        if (!isAppleProxy) {
            this.logger.debug(`Classification: DIRECT_OPEN (non-Apple IP, timeDelta=${timeDeltaSeconds}s)`);
            return {
                classification: client_1.EmailTrackingClassification.DIRECT_OPEN,
                timeDeltaSeconds,
            };
        }
        if (timeDeltaSeconds < this.PREFETCH_WINDOW_SECONDS) {
            this.logger.debug(`Classification: BOT_PREFETCH (Apple proxy, timeDelta=${timeDeltaSeconds}s < ${this.PREFETCH_WINDOW_SECONDS}s threshold)`);
            return {
                classification: client_1.EmailTrackingClassification.BOT_PREFETCH,
                timeDeltaSeconds,
            };
        }
        if (timeDeltaSeconds >= this.PREFETCH_WINDOW_SECONDS) {
            this.logger.debug(`Classification: GENUINE_OPEN (Apple proxy, timeDelta=${timeDeltaSeconds}s >= ${this.PREFETCH_WINDOW_SECONDS}s threshold)`);
            return {
                classification: client_1.EmailTrackingClassification.GENUINE_OPEN,
                timeDeltaSeconds,
            };
        }
        this.logger.warn(`Classification: AMBIGUOUS (unexpected state, timeDelta=${timeDeltaSeconds}s)`);
        return {
            classification: client_1.EmailTrackingClassification.AMBIGUOUS,
            timeDeltaSeconds,
        };
    }
    getClassificationReason(classification, timeDeltaSeconds, isAppleProxy) {
        switch (classification) {
            case client_1.EmailTrackingClassification.BOT_PREFETCH:
                return `Apple MPP automated prefetch detected (opened ${timeDeltaSeconds}s after send, < ${this.PREFETCH_WINDOW_SECONDS}s threshold)`;
            case client_1.EmailTrackingClassification.GENUINE_OPEN:
                return `Genuine user open via Apple MPP (opened ${timeDeltaSeconds}s after send, >= ${this.PREFETCH_WINDOW_SECONDS}s threshold)`;
            case client_1.EmailTrackingClassification.DIRECT_OPEN:
                return `Direct open from user's real IP (non-Apple infrastructure, ${timeDeltaSeconds}s after send)`;
            case client_1.EmailTrackingClassification.AMBIGUOUS:
                return `Ambiguous classification (isApple=${isAppleProxy}, timeDelta=${timeDeltaSeconds}s)`;
            default:
                return 'Unknown classification';
        }
    }
    getPrefetchWindowSeconds() {
        return this.PREFETCH_WINDOW_SECONDS;
    }
};
exports.TrackingClassifierService = TrackingClassifierService;
exports.TrackingClassifierService = TrackingClassifierService = TrackingClassifierService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TrackingClassifierService);
//# sourceMappingURL=tracking-classifier.service.js.map