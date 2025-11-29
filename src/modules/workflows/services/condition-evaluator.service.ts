import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { WorkflowNode } from '@prisma/client';

@Injectable()
export class ConditionEvaluatorService {
  private readonly logger = new Logger(ConditionEvaluatorService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Evaluate a condition node
   */
  async evaluateCondition(node: WorkflowNode, lead: any): Promise<boolean> {
    const conditionType = (node.config as any)?.conditionType;

    this.logger.log(
      `Evaluating condition: ${conditionType} for lead ${lead.id}`,
    );

    switch (conditionType) {
      case 'budget_qualification':
        return this.checkBudgetQualification(node, lead);

      case 'reply_received':
        return this.checkReplyReceived(lead);

      case 'booking_completed':
        return this.checkBookingCompleted(lead);

      default:
        this.logger.warn(`Unknown condition type: ${conditionType}`);
        return true; // Default to passing unknown conditions
    }
  }

  /**
   * Check if lead's budget meets qualification threshold
   */
  private async checkBudgetQualification(
    node: WorkflowNode,
    lead: any,
  ): Promise<boolean> {
    const threshold = (node.config as any)?.budgetThreshold || 2000;

    // Find budget field in lead's field data
    const budgetField = lead.fieldData?.find(
      (field: any) => field.formField?.fieldKey === 'budget',
    );

    if (!budgetField) {
      this.logger.log(
        `No budget field found for lead ${lead.id}, passing by default`,
      );
      return true;
    }

    const budget = parseInt(budgetField.value);
    const qualified = budget >= threshold;

    this.logger.log(
      `Budget qualification: ${budget} >= ${threshold} = ${qualified}`,
    );

    return qualified;
  }

  /**
   * Check if lead has replied to email
   */
  private async checkReplyReceived(lead: any): Promise<boolean> {
    const replied = lead.lastEmailOpenedAt != null;

    this.logger.log(`Reply check for lead ${lead.id}: ${replied}`);

    return replied;
  }

  /**
   * Check if lead has completed a booking
   */
  private async checkBookingCompleted(lead: any): Promise<boolean> {
    const bookingCount = await this.prisma.booking.count({
      where: { leadId: lead.id },
    });

    const hasBooking = bookingCount > 0;

    this.logger.log(
      `Booking check for lead ${lead.id}: ${hasBooking} (count: ${bookingCount})`,
    );

    return hasBooking;
  }
}
