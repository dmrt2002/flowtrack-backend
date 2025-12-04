import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailTrackingClassification } from '@prisma/client';
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
    createTrackingEvent(data: {
        sentEmailId: string;
        workspaceId: string;
        sentAt: Date;
        openedAt: Date;
        timeDeltaSeconds: number;
        clientIp: string;
        resolvedHostname: string | null;
        userAgent: string | null;
        isAppleProxy: boolean;
        classification: EmailTrackingClassification;
        metadata?: any;
    }): Promise<void>;
    updateSentEmailCounters(sentEmailId: string, classification: EmailTrackingClassification, openedAt: Date): Promise<void>;
    findSentEmailByPayload(payload: EmailTrackingPayload): Promise<{
        id: string;
        workspaceId: string;
        sentAt: Date;
    } | null>;
}
