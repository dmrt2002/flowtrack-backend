import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private clerkClient: ReturnType<typeof createClerkClient>;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    if (!secretKey) {
      throw new Error('CLERK_SECRET_KEY is not configured');
    }
    this.clerkClient = createClerkClient({ secretKey });
  }

  /**
   * Get or create a user in our database based on Clerk auth ID
   */
  async getOrCreateUser(authId: string) {
    // Check if user exists in our database
    let user = await this.prisma.user.findUnique({
      where: { authId },
    });

    if (user) {
      return user;
    }

    // If not, fetch from Clerk and create
    try {
      const clerkUser = await this.clerkClient.users.getUser(authId);

      const email =
        clerkUser.emailAddresses.find(
          (e: any) => e.id === clerkUser.primaryEmailAddressId,
        )?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;

      if (!email) {
        throw new Error('User has no email address');
      }

      const name =
        clerkUser.firstName || clerkUser.lastName
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
    } catch (error) {
      this.logger.error(`Failed to create user from Clerk: ${authId}`, error);
      throw error;
    }
  }

  /**
   * Sync user data from Clerk (useful for webhooks)
   */
  async syncUserFromClerk(authId: string) {
    try {
      const clerkUser = await this.clerkClient.users.getUser(authId);

      const email =
        clerkUser.emailAddresses.find(
          (e: any) => e.id === clerkUser.primaryEmailAddressId,
        )?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;

      if (!email) {
        throw new Error('User has no email address');
      }

      const name =
        clerkUser.firstName || clerkUser.lastName
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
    } catch (error) {
      this.logger.error(`Failed to sync user from Clerk: ${authId}`, error);
      throw error;
    }
  }
}
