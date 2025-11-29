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
var OAuthStateManagerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthStateManagerService = void 0;
const common_1 = require("@nestjs/common");
let OAuthStateManagerService = OAuthStateManagerService_1 = class OAuthStateManagerService {
    logger = new common_1.Logger(OAuthStateManagerService_1.name);
    stateStore = new Map();
    STATE_TTL = 10 * 60 * 1000;
    constructor() {
        setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
    storeState(userId, workspaceId) {
        this.logger.log(`Storing OAuth state - userId: ${userId}, workspaceId: ${workspaceId}`);
        this.stateStore.set(userId, {
            workspaceId,
            timestamp: Date.now(),
        });
    }
    retrieveState(userId) {
        const state = this.stateStore.get(userId);
        if (!state) {
            this.logger.warn(`OAuth state not found for userId: ${userId}. Either expired or never stored.`);
            return null;
        }
        const age = Date.now() - state.timestamp;
        if (age > this.STATE_TTL) {
            this.logger.warn(`OAuth state expired for userId: ${userId}. Age: ${Math.round(age / 1000)}s`);
            this.stateStore.delete(userId);
            return null;
        }
        this.logger.log(`Retrieved OAuth state - userId: ${userId}, workspaceId: ${state.workspaceId}`);
        this.stateStore.delete(userId);
        return state.workspaceId;
    }
    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        for (const [userId, state] of this.stateStore.entries()) {
            if (now - state.timestamp > this.STATE_TTL) {
                this.stateStore.delete(userId);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            this.logger.log(`Cleaned up ${cleaned} expired OAuth state entries`);
        }
    }
    getStoreSize() {
        return this.stateStore.size;
    }
};
exports.OAuthStateManagerService = OAuthStateManagerService;
exports.OAuthStateManagerService = OAuthStateManagerService = OAuthStateManagerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], OAuthStateManagerService);
//# sourceMappingURL=oauth-state-manager.service.js.map