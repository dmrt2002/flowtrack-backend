import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
export declare class ClerkAuthGuard implements CanActivate {
    private reflector;
    private configService;
    private readonly logger;
    private clerkClient;
    constructor(reflector: Reflector, configService: ConfigService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractTokenFromHeader;
}
