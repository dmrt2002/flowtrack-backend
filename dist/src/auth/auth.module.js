"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const password_service_1 = require("./services/password.service");
const token_service_1 = require("./services/token.service");
const email_service_1 = require("./services/email.service");
const rate_limit_service_1 = require("./services/rate-limit.service");
const unified_auth_guard_1 = require("./guards/unified-auth.guard");
const google_strategy_1 = require("./strategies/google.strategy");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            passport_1.PassportModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: async (configService) => ({
                    secret: configService.get('JWT_SECRET'),
                    signOptions: {
                        expiresIn: '6h',
                    },
                }),
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [
            auth_service_1.AuthService,
            password_service_1.PasswordService,
            token_service_1.TokenService,
            email_service_1.EmailService,
            rate_limit_service_1.RateLimitService,
            google_strategy_1.GoogleStrategy,
            unified_auth_guard_1.UnifiedAuthGuard,
            {
                provide: core_1.APP_GUARD,
                useClass: unified_auth_guard_1.UnifiedAuthGuard,
            },
        ],
        exports: [
            auth_service_1.AuthService,
            password_service_1.PasswordService,
            token_service_1.TokenService,
            email_service_1.EmailService,
            rate_limit_service_1.RateLimitService,
            unified_auth_guard_1.UnifiedAuthGuard,
        ],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map