import { Injectable } from '@nestjs/common';

export interface SimulationLead {
  id: string;
  name: string;
  email: string;
  source: string;
  timestamp: string;
  budget?: number; // Only for Gatekeeper
  company?: string; // For Nurturer/Closer
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

export interface StrategyLogicStep {
  id: string;
  label: string;
  type: 'trigger' | 'delay' | 'condition' | 'action';
  delayDays?: number; // For nurturer delays
  emailNumber?: number; // For nurturer email sequence
}

export interface StrategyTestLead {
  name: string;
  email: string;
  budget?: number; // Only for Gatekeeper
  company?: string; // For Nurturer/Closer
}

type StrategyId =
  | 'inbound-leads'
  | 'outbound-sales'
  | 'customer-nurture'
  | 'gatekeeper'
  | 'nurturer'
  | 'closer';

@Injectable()
export class SimulationService {
  /**
   * Get logic steps for a specific strategy
   */
  getLogicStepsForStrategy(
    strategyId: string,
    configuration?: Record<string, any>,
  ): StrategyLogicStep[] {
    const normalizedId = this.normalizeStrategyId(strategyId);

    switch (normalizedId) {
      case 'gatekeeper':
      case 'inbound-leads':
        return [
          { id: 'form', label: 'Form Submission', type: 'trigger' },
          { id: 'check', label: 'Check Budget', type: 'condition' },
          { id: 'action', label: 'Send Email', type: 'action' },
        ];

      case 'nurturer':
      case 'customer-nurture': {
        const firstEmailDelay = configuration?.firstEmailDelay || 3;
        const steps: StrategyLogicStep[] = [
          { id: 'form', label: 'Form Submission', type: 'trigger' },
        ];

        // Add 5 emails with delays between them
        for (let i = 1; i <= 5; i++) {
          steps.push({
            id: `delay${i}`,
            label: `Wait ${firstEmailDelay} days`,
            type: 'delay',
            delayDays: firstEmailDelay,
          });
          steps.push({
            id: `email${i}`,
            label: `Send Email ${i}`,
            type: 'action',
            emailNumber: i,
          });
        }

        return steps;
      }

      case 'closer':
      case 'outbound-sales':
        return [
          { id: 'form', label: 'Form Submission', type: 'trigger' },
          { id: 'booking', label: 'Send Booking Link', type: 'action' },
          { id: 'delay', label: 'Wait 1 day', type: 'delay', delayDays: 1 },
          { id: 'reminder', label: 'Send Reminder', type: 'action' },
        ];

      default:
        return [
          { id: 'form', label: 'Form Submission', type: 'trigger' },
          { id: 'action', label: 'Send Email', type: 'action' },
        ];
    }
  }

  /**
   * Generate test leads for a specific strategy
   */
  generateTestLeadsForStrategy(
    strategyId: string,
    configuration?: Record<string, any>,
  ): StrategyTestLead[] {
    const normalizedId = this.normalizeStrategyId(strategyId);

    switch (normalizedId) {
      case 'gatekeeper':
      case 'inbound-leads': {
        const budgetThreshold = (configuration?.budgetThreshold as number) || 2000;
        return [
          {
            name: 'John Doe',
            email: 'john@example.com',
            budget: Math.floor(budgetThreshold * 0.25), // Below threshold
          },
          {
            name: 'Sarah Johnson',
            email: 'sarah@example.com',
            budget: Math.floor(budgetThreshold * 2.5), // Above threshold
          },
        ];
      }

      case 'nurturer':
      case 'customer-nurture':
        return [
          {
            name: 'Emily Rodriguez',
            email: 'emily@example.com',
            company: 'Acme Corp',
          },
        ];

      case 'closer':
      case 'outbound-sales':
        return [
          {
            name: 'Mike Chen',
            email: 'mike@example.com',
            company: 'Tech Startup',
          },
        ];

      default:
        return [
          {
            name: 'Test Lead',
            email: 'test@example.com',
          },
        ];
    }
  }

  /**
   * Normalize strategy ID (map frontend IDs to backend IDs)
   */
  private normalizeStrategyId(strategyId: string): StrategyId {
    const mapping: Record<string, StrategyId> = {
      gatekeeper: 'inbound-leads',
      nurturer: 'customer-nurture',
      closer: 'outbound-sales',
    };

    return (mapping[strategyId] || strategyId) as StrategyId;
  }

  /**
   * Generate sample leads based on strategy
   */
  generateSampleLeads(strategyId: string, count: number = 3): SimulationLead[] {
    const now = new Date();
    const leads: SimulationLead[] = [];

    const sampleNames = [
      { name: 'Sarah Johnson', email: 'sarah.j@techcorp.com', company: 'TechCorp' },
      { name: 'Michael Chen', email: 'mchen@startupxyz.io', company: 'StartupXYZ' },
      { name: 'Emily Rodriguez', email: 'emily.r@innovate.com', company: 'Innovate Inc' },
    ];

    const sources: Record<string, string> = {
      'inbound-leads': 'Contact Form',
      'gatekeeper': 'Contact Form',
      'outbound-sales': 'LinkedIn Outreach',
      'closer': 'LinkedIn Outreach',
      'customer-nurture': 'Trial Signup',
      'nurturer': 'Trial Signup',
    };

    const normalizedId = this.normalizeStrategyId(strategyId);

    for (let i = 0; i < Math.min(count, sampleNames.length); i++) {
      const minutesAgo = (i + 1) * 15;
      const timestamp = new Date(now.getTime() - minutesAgo * 60000);

      const lead: SimulationLead = {
        id: `lead_sim_${i + 1}`,
        name: sampleNames[i].name,
        email: sampleNames[i].email,
        source: sources[strategyId] || sources[normalizedId] || 'Web Form',
        timestamp: timestamp.toISOString(),
      };

      // Add company for nurturer/closer
      if (normalizedId === 'customer-nurture' || normalizedId === 'nurturer' || 
          normalizedId === 'outbound-sales' || normalizedId === 'closer') {
        lead.company = sampleNames[i].company;
      }

      leads.push(lead);
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
          case 'send_followup':
            action = `Sent follow-up email to ${lead.email}`;
            break;
          case 'send_reminder':
            action = `Sent reminder email to ${lead.email}`;
            break;
          case 'create_meeting_event':
            action = `Created calendar event with ${lead.name}`;
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

    // Normalize strategy ID
    const normalizedId = this.normalizeStrategyId(strategyId);

    // Estimate time saved (varies by strategy)
    const timeSavedPerLead: Record<string, number> = {
      'inbound-leads': 15, // 15 minutes per lead
      'gatekeeper': 15,
      'outbound-sales': 20, // 20 minutes per lead (research + writing)
      'closer': 5, // 5 minutes per lead (instant booking)
      'customer-nurture': 10, // 10 minutes per customer
      'nurturer': 10,
    };

    const timeSaved =
      leadsProcessed * (timeSavedPerLead[normalizedId] || timeSavedPerLead[strategyId] || 15);

    // Estimate conversions (conservative)
    const conversionRates: Record<string, number> = {
      'inbound-leads': 0.33, // 33% of inbound leads convert
      'gatekeeper': 0.33,
      'outbound-sales': 0.15, // 15% of outbound prospects respond
      'closer': 0.20, // 20% booking rate
      'customer-nurture': 0.25, // 25% of at-risk customers retained
      'nurturer': 0.25,
    };

    const estimatedConversions = Math.round(
      leadsProcessed * (conversionRates[normalizedId] || conversionRates[strategyId] || 0.2),
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
  generateSimulation(
    strategyId: string,
    workflowPreview: any[],
    configuration?: Record<string, any>,
  ) {
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

    // Generate strategy-specific logic steps and test leads
    const logicSteps = this.getLogicStepsForStrategy(strategyId, configuration);
    const testLeads = this.generateTestLeadsForStrategy(strategyId, configuration);

    return {
      sampleLeads,
      actionsPerformed,
      metrics,
      logicSteps,
      testLeads,
      strategyId: this.normalizeStrategyId(strategyId),
    };
  }
}
