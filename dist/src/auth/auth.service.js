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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const clerk_sdk_node_1 = require("@clerk/clerk-sdk-node");
const config_1 = require("@nestjs/config");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    configService;
    logger = new common_1.Logger(AuthService_1.name);
    clerkClient;
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
        const secretKey = this.configService.get('CLERK_SECRET_KEY');
        if (!secretKey) {
            throw new Error('CLERK_SECRET_KEY is not configured');
        }
        this.clerkClient = (0, clerk_sdk_node_1.createClerkClient)({ secretKey });
    }
    async getOrCreateUser(authId) {
        let user = await this.prisma.user.findUnique({
            where: { authId },
        });
        if (user) {
            return user;
        }
        try {
            const clerkUser = await this.clerkClient.users.getUser(authId);
            const email = clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;
            if (!email) {
                throw new Error('User has no email address');
            }
            const name = clerkUser.firstName || clerkUser.lastName
                ? `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim()
                : null;
            user = await this.prisma.user.create({
                data: {
                    authId,
                    email,
                    name,
                },
            });
            this.logger.log(`Created new user: ${user.id} (${email})`);
            return user;
        }
        catch (error) {
            this.logger.error(`Failed to create user from Clerk: ${authId}`, error);
            throw error;
        }
    }
    async syncUserFromClerk(authId) {
        try {
            const clerkUser = await this.clerkClient.users.getUser(authId);
            const email = clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;
            if (!email) {
                throw new Error('User has no email address');
            }
            const name = clerkUser.firstName || clerkUser.lastName
                ? `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim()
                : null;
            const user = await this.prisma.user.upsert({
                where: { authId },
                update: {
                    email,
                    name,
                },
                create: {
                    authId,
                    email,
                    name,
                },
            });
            this.logger.log(`Synced user: ${user.id} (${email})`);
            return user;
        }
        catch (error) {
            this.logger.error(`Failed to sync user from Clerk: ${authId}`, error);
            throw error;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map