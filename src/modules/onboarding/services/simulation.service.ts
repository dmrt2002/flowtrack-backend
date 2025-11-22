import { Injectable } from '@nestjs/common';

export interface SimulationLead {
  id: string;
  name: string;
  email: string;
  source: string;
  timestamp: string;
}

export interface SimulationAction {
  leadId: string;
  action: string;
  status: 'success' | 'pending';
  timestamp: string;
}

export interface SimulationMetrics {
  leadsProcessed: number;
  emailsSent: number;
  timeSaved: number; // minutes
  estimatedConversions: number;
}

type StrategyId = 'inbound-leads' | 'outbound-sales' | 'customer-nurture';

@Injectable()
export class SimulationService {
  /**
   * Generate sample leads based on strategy
   */
  generateSampleLeads(strategyId: string, count: number = 3): SimulationLead[] {
    const now = new Date();
    const leads: SimulationLead[] = [];

    const sampleNames = [
      { name: 'Sarah Johnson', email: 'sarah.j@techcorp.com' },
      { name: 'Michael Chen', email: 'mchen@startupxyz.io' },
      { name: 'Emily Rodriguez', email: 'emily.r@innovate.com' },
    ];

    const sources: Record<StrategyId, string> = {
      'inbound-leads': 'Contact Form',
      'outbound-sales': 'LinkedIn Outreach',
      'customer-nurture': 'Trial Signup',
    };

    for (let i = 0; i < Math.min(count, sampleNames.length); i++) {
      const minutesAgo = (i + 1) * 15;
      const timestamp = new Date(now.getTime() - minutesAgo * 60000);

      leads.push({
        id: `lead_sim_${i + 1}`,
        name: sampleNames[i].name,
        email: sampleNames[i].email,
        source: sources[strategyId as StrategyId] || 'Web Form',
        timestamp: timestamp.toISOString(),
      });
    }

    return leads;
  }

  /**
   * Simulate workflow execution for each lead
   */
  simulateWorkflowExecution(
    workflowPreview: any[],
    leads: SimulationLead[],
  ): SimulationAction[] {
    const actions: SimulationAction[] = [];
    const now = new Date();

    leads.forEach((lead, leadIndex) => {
      workflowPreview.forEach((step, stepIndex) => {
        const minutesOffset = leadIndex * 10 + stepIndex * 2;
        const timestamp = new Date(now.getTime() + minutesOffset * 60000);

        let action = '';
        switch (step.nodeType) {
          case 'trigger_form':
          case 'trigger_prospect':
          case 'trigger_customer':
            action = `Detected new ${lead.source} from ${lead.name}`;
            break;
          case 'delay':
            action = `Waiting ${step.action}`;
            break;
          case 'send_email':
            action = `Sent personalized email to ${lead.email}`;
            break;
          case 'qualify_lead':
            action = `Qualified ${lead.name} (Score: 85/100)`;
            break;
          case 'crm_sync':
            action = `Added ${lead.name} to CRM`;
            break;
          case 'enrich_prospect':
            action = `Enriched data for ${lead.name}`;
            break;
          case 'wait_for_reply':
            action = `Monitoring inbox for reply from ${lead.email}`;
            break;
          case 'check_activity':
            action = `Checked activity for ${lead.name}`;
            break;
          default:
            action = `${step.action} for ${lead.name}`;
        }

        actions.push({
          leadId: lead.id,
          action,
          status: 'success',
          timestamp: timestamp.toISOString(),
        });
      });
    });

    return actions;
  }

  /**
   * Calculate metrics from simulation
   */
  calculateMetrics(
    actions: SimulationAction[],
    leads: SimulationLead[],
    strategyId: string,
  ): SimulationMetrics {
    const emailActions = actions.filter((a) => a.action.includes('email'));
    const emailsSent = emailActions.length;
    const leadsProcessed = leads.length;

    // Estimate time saved (varies by strategy)
    const timeSavedPerLead: Record<StrategyId, number> = {
      'inbound-leads': 15, // 15 minutes per lead
      'outbound-sales': 20, // 20 minutes per lead (research + writing)
      'customer-nurture': 10, // 10 minutes per customer
    };

    const timeSaved =
      leadsProcessed * (timeSavedPerLead[strategyId as StrategyId] || 15);

    // Estimate conversions (conservative)
    const conversionRates: Record<StrategyId, number> = {
      'inbound-leads': 0.33, // 33% of inbound leads convert
      'outbound-sales': 0.15, // 15% of outbound prospects respond
      'customer-nurture': 0.25, // 25% of at-risk customers retained
    };

    const estimatedConversions = Math.round(
      leadsProcessed * (conversionRates[strategyId as StrategyId] || 0.2),
    );

    return {
      leadsProcessed,
      emailsSent,
      timeSaved,
      estimatedConversions: Math.max(1, estimatedConversions),
    };
  }

  /**
   * Generate complete simulation data
   */
  generateSimulation(strategyId: string, workflowPreview: any[]) {
    const sampleLeads = this.generateSampleLeads(strategyId, 3);
    const actionsPerformed = this.simulateWorkflowExecution(
      workflowPreview,
      sampleLeads,
    );
    const metrics = this.calculateMetrics(
      actionsPerformed,
      sampleLeads,
      strategyId,
    );

    return {
      sampleLeads,
      actionsPerformed,
      metrics,
    };
  }
}
