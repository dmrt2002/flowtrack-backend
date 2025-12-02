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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var OAuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
const googleapis_1 = require("googleapis");
const axios_1 = __importDefault(require("axios"));
let OAuthService = OAuthService_1 = class OAuthService {
    prisma;
    config;
    logger = new common_1.Logger(OAuthService_1.name);
    oauth2Client;
    oauthStateStore = new Map();
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.oauth2Client = new googleapis_1.google.auth.OAuth2(this.config.get('GOOGLE_CLIENT_ID'), this.config.get('GOOGLE_CLIENT_SECRET'), this.config.get('GOOGLE_REDIRECT_URI'));
    }
    storeOAuthState(userId, workspaceId) {
        this.oauthStateStore.set(userId, workspaceId);
    }
    retrieveOAuthState(userId) {
        const workspaceId = this.oauthStateStore.get(userId);
        if (workspaceId) {
            this.oauthStateStore.delete(userId);
        }
        return workspaceId || null;
    }
    getGmailAuthUrl(userId) {
        const scopes = [
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/calendar',
        ];
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent',
            state: userId,
        });
    }
    async exchangeCodeForTokens(code) {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);
            const oauth2 = googleapis_1.google.oauth2({
                auth: this.oauth2Client,
                version: 'v2',
            });
            const { data } = await oauth2.userinfo.get();
            return {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: tokens.expiry_date
                    ? new Date(tokens.expiry_date)
                    : null,
                email: data.email,
            };
        }
        catch (error) {
            console.error('Error exchanging code for tokens:', error);
            throw new common_1.UnauthorizedException('Failed to authenticate with Google');
        }
    }
    async saveGmailCredentials(userId, email, accessToken, refreshToken, expiresAt, workspaceId) {
        let targetWorkspaceId = workspaceId;
        if (!targetWorkspaceId) {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                include: {
                    ownedWorkspaces: true,
                    workspaceMemberships: {
                        include: {
                            workspace: true,
                        },
                    },
                },
            });
            if (!user) {
                throw new Error('User not found');
            }
            const workspace = user.ownedWorkspaces[0] ||
                user.workspaceMemberships[0]?.workspace ||
                null;
            if (!workspace) {
                throw new Error('No workspace found for user');
            }
            targetWorkspaceId = workspace.id;
        }
        const existingCredential = await this.prisma.oAuthCredential.findFirst({
            where: {
                workspaceId: targetWorkspaceId,
                providerType: 'GOOGLE_EMAIL',
            },
        });
        if (existingCredential) {
            return this.prisma.oAuthCredential.update({
                where: { id: existingCredential.id },
                data: {
                    providerEmail: email,
                    accessToken,
                    refreshToken: refreshToken || null,
                    expiresAt,
                    isActive: true,
                },
            });
        }
        else {
            return this.prisma.oAuthCredential.create({
                data: {
                    userId,
                    workspaceId: targetWorkspaceId,
                    providerType: 'GOOGLE_EMAIL',
                    providerEmail: email,
                    accessToken,
                    refreshToken: refreshToken || null,
                    expiresAt,
                    isActive: true,
                },
            });
        }
    }
    async refreshAccessToken(refreshToken) {
        try {
            this.oauth2Client.setCredentials({
                refresh_token: refreshToken,
            });
            const { credentials } = await this.oauth2Client.refreshAccessToken();
            return {
                accessToken: credentials.access_token,
                expiresAt: credentials.expiry_date
                    ? new Date(credentials.expiry_date)
                    : null,
            };
        }
        catch (error) {
            console.error('Error refreshing access token:', error);
            throw new common_1.UnauthorizedException('Failed to refresh access token');
        }
    }
    async getGmailCredentials(workspaceId) {
        const credential = await this.prisma.oAuthCredential.findFirst({
            where: {
                workspaceId,
                providerType: 'GOOGLE_EMAIL',
                isActive: true,
            },
        });
        if (!credential) {
            return null;
        }
        if (credential.expiresAt && credential.expiresAt < new Date()) {
            if (!credential.refreshToken) {
                throw new common_1.UnauthorizedException('Gmail token expired and no refresh token available');
            }
            const { accessToken, expiresAt } = await this.refreshAccessToken(credential.refreshToken);
            await this.prisma.oAuthCredential.update({
                where: { id: credential.id },
                data: {
                    accessToken,
                    expiresAt,
                },
            });
            return {
                ...credential,
                accessToken,
                expiresAt,
            };
        }
        return credential;
    }
    async getEmailProvider(workspaceId) {
        const gmailCredentials = await this.getGmailCredentials(workspaceId);
        if (gmailCredentials) {
            return {
                type: 'GMAIL',
                credentials: gmailCredentials,
            };
        }
        return {
            type: 'SYSTEM',
            config: {
                host: this.config.get('SMTP_HOST'),
                port: parseInt(this.config.get('SMTP_PORT') || '587'),
                secure: this.config.get('SMTP_PORT') === '465',
                auth: {
                    user: this.config.get('SMTP_USER'),
                    pass: this.config.get('SMTP_PASS'),
                },
                from: {
                    email: this.config.get('SMTP_FROM_EMAIL') || 'noreply@flowtrack.app',
                    name: this.config.get('SMTP_FROM_NAME') || 'FlowTrack',
                },
            },
        };
    }
    async saveCalendlyLink(userId, workspaceId, calendlyLink) {
        const existingCredential = await this.prisma.oAuthCredential.findFirst({
            where: {
                workspaceId,
                providerType: 'CALENDLY',
            },
        });
        if (existingCredential) {
            return this.prisma.oAuthCredential.update({
                where: { id: existingCredential.id },
                data: {
                    accessToken: calendlyLink,
                    isActive: true,
                },
            });
        }
        else {
            return this.prisma.oAuthCredential.create({
                data: {
                    userId,
                    workspaceId,
                    providerType: 'CALENDLY',
                    accessToken: calendlyLink,
                    isActive: true,
                },
            });
        }
    }
    async getCalendlyLink(workspaceId) {
        const credential = await this.prisma.oAuthCredential.findFirst({
            where: {
                workspaceId,
                providerType: 'CALENDLY',
                isActive: true,
            },
        });
        if (!credential) {
            return null;
        }
        const metadata = credential.metadata;
        if (metadata?.schedulingUrl) {
            return metadata.schedulingUrl;
        }
        this.logger.log(`Scheduling URL not cached for workspace ${workspaceId}. Fetching from Calendly API...`);
        try {
            let accessToken = credential.accessToken;
            const isExpired = credential.expiresAt
                ? credential.expiresAt < new Date()
                : false;
            if (isExpired && credential.refreshToken) {
                this.logger.log(`Access token expired. Refreshing token for credential ${credential.id}...`);
                const clientId = this.config.get('CALENDLY_CLIENT_ID');
                const clientSecret = this.config.get('CALENDLY_CLIENT_SECRET');
                if (!clientId || !clientSecret) {
                    throw new Error('Calendly OAuth credentials not configured');
                }
                const refreshResponse = await axios_1.default.post('https://auth.calendly.com/oauth/token', {
                    grant_type: 'refresh_token',
                    refresh_token: credential.refreshToken,
                }, {
                    auth: {
                        username: clientId,
                        password: clientSecret,
                    },
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                const { access_token, refresh_token, expires_in } = refreshResponse.data;
                await this.prisma.oAuthCredential.update({
                    where: { id: credential.id },
                    data: {
                        accessToken: access_token,
                        refreshToken: refresh_token || credential.refreshToken,
                        expiresAt: new Date(Date.now() + expires_in * 1000),
                    },
                });
                accessToken = access_token;
                this.logger.log(`Successfully refreshed token for credential ${credential.id}`);
            }
            const userResponse = await axios_1.default.get('https://api.calendly.com/users/me', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            const schedulingUrl = userResponse.data.resource.scheduling_url ||
                userResponse.data.resource.link;
            if (schedulingUrl) {
                await this.prisma.oAuthCredential.update({
                    where: { id: credential.id },
                    data: {
                        metadata: {
                            ...metadata,
                            schedulingUrl,
                        },
                    },
                });
                this.logger.log(`Successfully fetched and cached scheduling URL for workspace ${workspaceId}: ${schedulingUrl}`);
                return schedulingUrl;
            }
            this.logger.warn(`No scheduling URL found in Calendly API response for workspace ${workspaceId}`);
            return null;
        }
        catch (error) {
            this.logger.error(`Failed to fetch Calendly scheduling URL for workspace ${workspaceId}: ${error.response?.data?.message || error.message}`);
            return null;
        }
    }
    async getCalendarCredentials(workspaceId) {
        return this.getGmailCredentials(workspaceId);
    }
    async getGmailConnectionStatus(workspaceId) {
        const credential = await this.prisma.oAuthCredential.findFirst({
            where: {
                workspaceId,
                providerType: 'GOOGLE_EMAIL',
                isActive: true,
            },
        });
        return {
            connected: !!credential,
            email: credential?.providerEmail || null,
            lastUsedAt: credential?.lastUsedAt || null,
        };
    }
};
exports.OAuthService = OAuthService;
exports.OAuthService = OAuthService = OAuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], OAuthService);
//# sourceMappingURL=oauth.service.js.map