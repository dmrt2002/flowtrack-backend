/**
 * Sales Pitch Service
 *
 * Core service for generating and managing AI-powered sales pitches
 * Combines user company data + lead enrichment data for personalized intelligence
 */

import { Injectable, Logger, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { OllamaPitchService } from './ollama-pitch.service';
import { PitchTemplateService } from './pitch-template.service';
import { PitchConfigService } from './pitch-config.service';
import { PitchContext, SalesPitch } from '../types/pitch.types';

@Injectable()
export class SalesPitchService {
  private readonly logger = new Logger(SalesPitchService.name);
  private readonly CACHE_EXPIRY_DAYS = 7; // Regenerate pitch after 7 days

  constructor(
    private readonly prisma: PrismaService,
    private readonly ollamaPitch: OllamaPitchService,
    private readonly templateService: PitchTemplateService,
    private readonly configService: PitchConfigService,
  ) {}

  /**
   * Generate or retrieve cached sales pitch for a lead
   * Uses smart caching to avoid unnecessary LLM calls
   */
  async generateOrGetCachedPitch(leadId: string, workspaceId: string): Promise<SalesPitch> {
    try {
      // Fetch lead with relations
      const lead = await this.prisma.lead.findFirst({
        where: {
          id: leadId,
          workspaceId,
        },
        include: {
          workspace: {
            include: {
              onboardingSessions: {
                where: { isComplete: true },
                orderBy: { completedAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      });

      if (!lead) {
        throw new NotFoundException(`Lead ${leadId} not found`);
      }

      // Check if cached pitch exists and is fresh
      if (lead.salesPitchData) {
        const cached = lead.salesPitchData as any;
        if (cached.generatedAt) {
          const age = Date.now() - new Date(cached.generatedAt).getTime();
          const maxAge = this.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

          if (age < maxAge) {
            this.logger.log(`Using cached pitch for lead ${leadId} (age: ${Math.round(age / 1000 / 60)} minutes)`);
            return {
              ...cached,
              generatedAt: new Date(cached.generatedAt),
            } as SalesPitch;
          }
        }
      }

      // Check if Ollama is available
      const isOllamaAvailable = await this.ollamaPitch.checkOllamaAvailable();
      if (!isOllamaAvailable) {
        throw new HttpException(
          {
            code: 'OLLAMA_UNAVAILABLE',
            message: 'AI pitch generation is currently unavailable. Please ensure Ollama is running.',
            details: { ollamaUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434' },
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      // Build context for pitch generation
      const context = this.buildPitchContext(lead);

      // Validate context has minimum required data
      if (!context.userCompany.name || !context.leadCompany.name) {
        throw new HttpException(
          {
            code: 'INSUFFICIENT_DATA',
            message: 'Cannot generate pitch: Missing required company data',
            details: {
              hasUserCompany: !!context.userCompany.name,
              hasLeadCompany: !!context.leadCompany.name,
            },
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Get workspace pitch configuration
      const config = await this.configService.getConfig(workspaceId);

      // Build prompt from template
      const customPrompt = this.templateService.buildPromptFromConfig(context, config);

      // Generate new pitch with custom prompt
      this.logger.log(`Generating new pitch for lead ${leadId}`);
      const pitch = await this.ollamaPitch.generatePitch(
        context,
        customPrompt,
        config.advancedConfig.temperature,
      );

      // Cache the result
      await this.prisma.lead.update({
        where: { id: leadId },
        data: {
          salesPitchData: JSON.parse(JSON.stringify(pitch)) as any,
        },
      });

      this.logger.log(`Successfully generated and cached pitch for lead ${leadId}`);

      return pitch;
    } catch (error) {
      this.logger.error(`Error generating pitch for lead ${leadId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Force regenerate pitch (bypass cache)
   */
  async regeneratePitch(leadId: string, workspaceId: string): Promise<SalesPitch> {
    this.logger.log(`Force regenerating pitch for lead ${leadId}`);

    // Clear cached pitch
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { salesPitchData: Prisma.DbNull },
    });

    // Generate fresh pitch
    return this.generateOrGetCachedPitch(leadId, workspaceId);
  }

  /**
   * Build pitch context from lead and user company data
   */
  private buildPitchContext(lead: any): PitchContext {
    // Extract user company from onboarding session
    const session = lead.workspace.onboardingSessions?.[0];
    const userCompanyData = (session?.configurationData as any)?.enrichedCompany;

    // Extract lead enrichment data
    const enrichment = lead.enrichmentData as any;

    const context: PitchContext = {
      userCompany: {
        name: userCompanyData?.companyName || lead.workspace.name,
        industry: userCompanyData?.industry,
        businessModel: userCompanyData?.businessModel,
        companySize: userCompanyData?.companySize,
        summary: userCompanyData?.summary,
        techStack: userCompanyData?.structuredData?.techStack,
      },
      leadCompany: {
        name: enrichment?.company?.name || lead.companyName || lead.email.split('@')[1],
        domain: enrichment?.company?.domain || lead.email.split('@')[1],
        industry: enrichment?.company?.industry,
        size: enrichment?.company?.size,
        description: enrichment?.company?.description,
        techStack: enrichment?.company?.techStack,
        emailProvider: enrichment?.company?.emailProvider,
        location: enrichment?.company?.location || enrichment?.company?.headquarters,
      },
      leadPerson: {
        name: enrichment?.person?.fullName || lead.name || lead.email.split('@')[0],
        jobTitle: enrichment?.person?.jobTitle,
        seniority: enrichment?.person?.seniority,
        department: enrichment?.person?.department,
      },
    };

    this.logger.debug(`Built pitch context: User=${context.userCompany.name}, Lead=${context.leadCompany.name}`);

    return context;
  }

  /**
   * Get pitch if cached, return null if not
   */
  async getCachedPitch(leadId: string, workspaceId: string): Promise<SalesPitch | null> {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        workspaceId,
      },
      select: {
        salesPitchData: true,
      },
    });

    if (!lead?.salesPitchData) {
      return null;
    }

    const cached = lead.salesPitchData as any;
    return {
      ...cached,
      generatedAt: new Date(cached.generatedAt),
    } as SalesPitch;
  }
}
