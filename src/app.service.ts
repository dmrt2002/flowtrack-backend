import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  getHello(): string {
    return 'FlowTrack Backend API - Running';
  }

  async getHealth() {
    const dbHealthy = await this.checkDatabaseHealth();

    return {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: this.configService.get('NODE_ENV'),
      services: {
        database: dbHealthy ? 'up' : 'down',
      },
    };
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      return false;
    }
  }
}
