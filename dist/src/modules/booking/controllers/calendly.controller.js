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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendlyController = void 0;
const common_1 = require("@nestjs/common");
const calendly_service_1 = require("../services/calendly.service");
const oauth_state_manager_service_1 = require("../services/oauth-state-manager.service");
const unified_auth_guard_1 = require("../../../auth/guards/unified-auth.guard");
let CalendlyController = class CalendlyController {
    calendlyService;
    oauthStateManager;
    constructor(calendlyService, oauthStateManager) {
        this.calendlyService = calendlyService;
        this.oauthStateManager = oauthStateManager;
    }
    authorize(workspaceId, req, res) {
        const userId = req.user?.id;
        console.log('Calendly OAuth authorize - userId:', userId, 'user object:', req.user, 'workspaceId:', workspaceId);
        if (!userId) {
            console.error('Calendly OAuth authorize: Missing userId from auth');
            return res.redirect(`${process.env.FRONTEND_URL}/onboarding/integrations?calendly=error&reason=missing_user`);
        }
        if (!workspaceId) {
            console.error('Calendly OAuth authorize: Missing workspaceId parameter');
            return res.redirect(`${process.env.FRONTEND_URL}/onboarding/integrations?calendly=error&reason=missing_workspace_init`);
        }
        this.oauthStateManager.storeState(userId, workspaceId);
        const authUrl = this.calendlyService.getAuthorizationUrl(userId);
        console.log('Calendly OAuth authorize - redirecting to:', authUrl);
        return res.redirect(authUrl);
    }
    async callback(code, userId, res) {
        try {
            console.log('Calendly OAuth callback - code:', code, 'state (userId):', userId);
            if (!code) {
                console.error('Calendly OAuth callback: Missing code parameter');
                return res.redirect(`${process.env.FRONTEND_URL}/onboarding/integrations?calendly=error&reason=missing_code`);
            }
            let workspaceId = null;
            if (userId) {
                workspaceId = this.oauthStateManager.retrieveState(userId);
                console.log('Calendly OAuth callback - Retrieved workspaceId from state manager:', workspaceId);
            }
            else {
                console.warn('Calendly OAuth callback: No state parameter returned by Calendly');
            }
            if (!workspaceId) {
                console.error('Calendly OAuth callback: Unable to retrieve workspaceId. State expired or missing.');
                return res.redirect(`${process.env.FRONTEND_URL}/onboarding/integrations?calendly=error&reason=state_expired`);
            }
            const { accessToken, refreshToken, expiresAt, organization, owner } = await this.calendlyService.exchangeCodeForTokens(code, workspaceId);
            const planType = await this.calendlyService.detectPlanType(accessToken, organization);
            await this.calendlyService.saveCredentials(userId, workspaceId, accessToken, refreshToken, expiresAt, organization, owner, planType);
            return res.redirect(`${process.env.FRONTEND_URL}/onboarding/integrations?calendly=success&plan=${planType}`);
        }
        catch (error) {
            console.error('Calendly OAuth callback error:', error);
            return res.redirect(`${process.env.FRONTEND_URL}/onboarding/integrations?calendly=error`);
        }
    }
    async webhook(credentialId, signature, payload) {
        return this.calendlyService.processWebhookEvent(credentialId, signature, payload);
    }
    async poll(credentialId) {
        return this.calendlyService.pollEvents(credentialId);
    }
    async getConnectionStatus(workspaceId) {
        const credential = await this.calendlyService['prisma'].oAuthCredential.findFirst({
            where: {
                workspaceId,
                providerType: 'CALENDLY',
                isActive: true,
            },
            select: {
                id: true,
                providerEmail: true,
                providerPlan: true,
                webhookEnabled: true,
                pollingEnabled: true,
            },
        });
        if (!credential) {
            return {
                success: true,
                data: {
                    connected: false,
                },
            };
        }
        return {
            success: true,
            data: {
                connected: true,
                email: credential.providerEmail,
                plan: credential.providerPlan,
                webhookEnabled: credential.webhookEnabled,
                pollingEnabled: credential.pollingEnabled,
            },
        };
    }
    async disconnect(workspaceId) {
        await this.calendlyService['prisma'].oAuthCredential.updateMany({
            where: {
                workspaceId,
                providerType: 'CALENDLY',
            },
            data: {
                isActive: false,
            },
        });
        return {
            success: true,
            message: 'Calendly disconnected',
        };
    }
};
exports.CalendlyController = CalendlyController;
__decorate([
    (0, common_1.Get)('oauth/authorize'),
    (0, common_1.UseGuards)(unified_auth_guard_1.UnifiedAuthGuard),
    __param(0, (0, common_1.Query)('workspaceId')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], CalendlyController.prototype, "authorize", null);
__decorate([
    (0, common_1.Get)('oauth/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CalendlyController.prototype, "callback", null);
__decorate([
    (0, common_1.Post)('webhooks/:credentialId'),
    __param(0, (0, common_1.Param)('credentialId')),
    __param(1, (0, common_1.Headers)('calendly-webhook-signature')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CalendlyController.prototype, "webhook", null);
__decorate([
    (0, common_1.Post)('poll/:credentialId'),
    (0, common_1.UseGuards)(unified_auth_guard_1.UnifiedAuthGuard),
    __param(0, (0, common_1.Param)('credentialId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CalendlyController.prototype, "poll", null);
__decorate([
    (0, common_1.Get)('connection/:workspaceId'),
    (0, common_1.UseGuards)(unified_auth_guard_1.UnifiedAuthGuard),
    __param(0, (0, common_1.Param)('workspaceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CalendlyController.prototype, "getConnectionStatus", null);
__decorate([
    (0, common_1.Delete)('connection/:workspaceId'),
    (0, common_1.UseGuards)(unified_auth_guard_1.UnifiedAuthGuard),
    __param(0, (0, common_1.Param)('workspaceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CalendlyController.prototype, "disconnect", null);
exports.CalendlyController = CalendlyController = __decorate([
    (0, common_1.Controller)('calendly'),
    __metadata("design:paramtypes", [calendly_service_1.CalendlyService,
        oauth_state_manager_service_1.OAuthStateManagerService])
], CalendlyController);
//# sourceMappingURL=calendly.controller.js.map