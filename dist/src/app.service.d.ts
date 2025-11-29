import { PrismaService } from './prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
export declare class AppService {
    private prisma;
    private configService;
    constructor(prisma: PrismaService, configService: ConfigService);
    getHello(): string;
    getHealth(): Promise<{
        status: string;
        timestamp: string;
        environment: any;
        services: {
            database: string;
        };
    }>;
    private checkDatabaseHealth;
}
