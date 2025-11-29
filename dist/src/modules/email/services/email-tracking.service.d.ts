import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import type { EmailTrackingPayload } from '../dto/email-tracking.dto';
export declare class EmailTrackingService {
    private jwtService;
    private prisma;
    private configService;
    private readonly logger;
    constructor(jwtService: JwtService, prisma: PrismaService, configService: ConfigService);
    generateTrackingToken(payload: EmailTrackingPayload): string;
    verifyTrackingToken(token: string): Promise<EmailTrackingPayload | null>;
    recordEmailOpen(payload: EmailTrackingPayload): Promise<void>;
    getTrackingPixel(): Buffer;
}
