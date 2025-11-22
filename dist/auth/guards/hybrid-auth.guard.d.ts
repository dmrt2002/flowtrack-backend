import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
declare const HybridAuthGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class HybridAuthGuard extends HybridAuthGuard_base {
    private reflector;
    private configService;
    private clerkGuard;
    constructor(reflector: Reflector, configService: ConfigService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
export {};
