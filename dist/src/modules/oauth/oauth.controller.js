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
exports.OAuthController = void 0;
const common_1 = require("@nestjs/common");
const oauth_service_1 = require("./oauth.service");
const unified_auth_guard_1 = require("../../auth/guards/unified-auth.guard");
const user_decorator_1 = require("../../auth/decorators/user.decorator");
let OAuthController = class OAuthController {
    oauthService;
    constructor(oauthService) {
        this.oauthService = oauthService;
    }
    initiateGmailOAuth(user) {
        const authUrl = this.oauthService.getGmailAuthUrl();
        return {
            success: true,
            message: 'Gmail OAuth URL generated',
            data: {
                authUrl,
            },
        };
    }
    async handleGmailCallback(code, user, res) {
        try {
            if (!code) {
                return res.status(common_1.HttpStatus.BAD_REQUEST).send(`
          <html>
            <body>
              <script>
                window.opener.postMessage({
                  type: 'GMAIL_OAUTH_ERROR',
                  error: 'No authorization code provided'
                }, window.location.origin);
                window.close();
              </script>
            </body>
          </html>
        `);
            }
            const { accessToken, refreshToken, expiresAt, email } = await this.oauthService.exchangeCodeForTokens(code);
            if (!email) {
                return res.status(common_1.HttpStatus.BAD_REQUEST).send(`
          <html>
            <body>
              <script>
                window.opener.postMessage({
                  type: 'GMAIL_OAUTH_ERROR',
                  error: 'Failed to retrieve email from Google account'
                }, window.location.origin);
                window.close();
              </script>
            </body>
          </html>
        `);
            }
            await this.oauthService.saveGmailCredentials(user.id, email, accessToken, refreshToken, expiresAt);
            return res.status(common_1.HttpStatus.OK).send(`
        <html>
          <body>
            <h2>Gmail Connected Successfully!</h2>
            <p>You can close this window now.</p>
            <script>
              window.opener.postMessage({
                type: 'GMAIL_OAUTH_SUCCESS',
                email: '${email}'
              }, window.location.origin);
              setTimeout(() => window.close(), 1500);
            </script>
          </body>
        </html>
      `);
        }
        catch (error) {
            console.error('Gmail OAuth callback error:', error);
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).send(`
        <html>
          <body>
            <h2>Failed to Connect Gmail</h2>
            <p>Please try again.</p>
            <script>
              window.opener.postMessage({
                type: 'GMAIL_OAUTH_ERROR',
                error: 'Failed to authenticate with Gmail'
              }, window.location.origin);
              setTimeout(() => window.close(), 2000);
            </script>
          </body>
        </html>
      `);
        }
    }
};
exports.OAuthController = OAuthController;
__decorate([
    (0, common_1.Get)('gmail/initiate'),
    (0, common_1.UseGuards)(unified_auth_guard_1.UnifiedAuthGuard),
    __param(0, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OAuthController.prototype, "initiateGmailOAuth", null);
__decorate([
    (0, common_1.Get)('gmail/callback'),
    (0, common_1.UseGuards)(unified_auth_guard_1.UnifiedAuthGuard),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, user_decorator_1.User)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], OAuthController.prototype, "handleGmailCallback", null);
exports.OAuthController = OAuthController = __decorate([
    (0, common_1.Controller)('oauth'),
    __metadata("design:paramtypes", [oauth_service_1.OAuthService])
], OAuthController);
//# sourceMappingURL=oauth.controller.js.map