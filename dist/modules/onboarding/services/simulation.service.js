"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationService = void 0;
const common_1 = require("@nestjs/common");
let SimulationService = class SimulationService {
    generateSampleLeads(strategyId, count = 3) {
        const now = new Date();
        const leads = [];
        const sampleNames = [
            { name: 'Sarah Johnson', email: 'sarah.j@techcorp.com' },
            { name: 'Michael Chen', email: 'mchen@startupxyz.io' },
            { name: 'Emily Rodriguez', email: 'emily.r@innovate.com' },
        ];
        const sources = {
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
                source: sources[strategyId] || 'Web Form',
                timestamp: timestamp.toISOString(),
            });
        }
        return leads;
    }
    simulateWorkflowExecution(workflowPreview, leads) {
        const actions = [];
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
    calculateMetrics(actions, leads, strategyId) {
        const emailActions = actions.filter((a) => a.action.includes('email'));
        const emailsSent = emailActions.length;
        const leadsProcessed = leads.length;
        const timeSavedPerLead = {
            'inbound-leads': 15,
            'outbound-sales': 20,
            'customer-nurture': 10,
        };
        const timeSaved = leadsProcessed * (timeSavedPerLead[strategyId] || 15);
        const conversionRates = {
            'inbound-leads': 0.33,
            'outbound-sales': 0.15,
            'customer-nurture': 0.25,
        };
        const estimatedConversions = Math.round(leadsProcessed * (conversionRates[strategyId] || 0.2));
        return {
            leadsProcessed,
            emailsSent,
            timeSaved,
            estimatedConversions: Math.max(1, estimatedConversions),
        };
    }
    generateSimulation(strategyId, workflowPreview) {
        const sampleLeads = this.generateSampleLeads(strategyId, 3);
        const actionsPerformed = this.simulateWorkflowExecution(workflowPreview, sampleLeads);
        const metrics = this.calculateMetrics(actionsPerformed, sampleLeads, strategyId);
        return {
            sampleLeads,
            actionsPerformed,
            metrics,
        };
    }
};
exports.SimulationService = SimulationService;
exports.SimulationService = SimulationService = __decorate([
    (0, common_1.Injectable)()
], SimulationService);
//# sourceMappingURL=simulation.service.js.map