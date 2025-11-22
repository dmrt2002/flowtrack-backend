import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
export declare class UnifiedAuthGuard implements CanActivate {
    private reflector;
    private configService;
    private jwtService;
    private prisma;
    private readonly logger;
    private clerkClient;
    constructor(reflector: Reflector, configService: ConfigService, jwtService: JwtService, prisma: PrismaService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
