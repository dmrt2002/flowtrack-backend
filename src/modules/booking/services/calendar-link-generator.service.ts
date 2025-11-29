import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CalendarLinkGeneratorService {
  private readonly logger = new Logger(CalendarLinkGeneratorService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate an attributed Calendly booking link for a lead
   */
  async generateCalendlyLink(
    leadId: string,
    workspaceId: string,
  ): Promise<string | null> {
    // Get Calendly credentials for workspace
    const credential = await this.prisma.oAuthCredential.findFirst({
      where: {
        workspaceId,
        providerType: 'CALENDLY',
        isActive: true,
      },
    });

    if (!credential) {
      this.logger.warn(`No Calendly credential found for workspace ${workspaceId}`);
      return null;
    }

    // For simple link storage (non-OAuth), accessToken contains the link
    const baseLink = credential.accessToken;

    if (!baseLink) {
      this.logger.warn(`No Calendly link found for workspace ${workspaceId}`);
      return null;
    }

    // Add UTM parameter for attribution
    const utmContent = `lead_${leadId}`;
    const url = new URL(baseLink);
    url.searchParams.set('utm_content', utmContent);

    this.logger.log(`Generated Calendly link for lead ${leadId}`);
    return url.toString();
  }

  /**
   * Get the primary calendar link for a workspace (Calendly only)
   */
  async getPrimaryCalendarLink(
    leadId: string,
    workspaceId: string,
  ): Promise<{
    provider: 'CALENDLY' | null;
    link: string | null;
  }> {
    const calendlyLink = await this.generateCalendlyLink(leadId, workspaceId);
    if (calendlyLink) {
      return {
        provider: 'CALENDLY',
        link: calendlyLink,
      };
    }

    return {
      provider: null,
      link: null,
    };
  }

  /**
   * Check if Calendly is available for a workspace
   */
  async isCalendlyAvailable(workspaceId: string): Promise<boolean> {
    const credential = await this.prisma.oAuthCredential.findFirst({
      where: {
        workspaceId,
        providerType: 'CALENDLY',
        isActive: true,
      },
    });

    return !!credential;
  }
}
