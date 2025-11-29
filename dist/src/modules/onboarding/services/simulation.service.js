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
    getLogicStepsForStrategy(strategyId, configuration) {
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
                const steps = [
                    { id: 'form', label: 'Form Submission', type: 'trigger' },
                ];
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
    generateTestLeadsForStrategy(strategyId, configuration) {
        const normalizedId = this.normalizeStrategyId(strategyId);
        switch (normalizedId) {
            case 'gatekeeper':
            case 'inbound-leads': {
                const budgetThreshold = configuration?.budgetThreshold || 2000;
                return [
                    {
                        name: 'John Doe',
                        email: 'john@example.com',
                        budget: Math.floor(budgetThreshold * 0.25),
                    },
                    {
                        name: 'Sarah Johnson',
                        email: 'sarah@example.com',
                        budget: Math.floor(budgetThreshold * 2.5),
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
    normalizeStrategyId(strategyId) {
        const mapping = {
            gatekeeper: 'inbound-leads',
            nurturer: 'customer-nurture',
            closer: 'outbound-sales',
        };
        return (mapping[strategyId] || strategyId);
    }
    generateSampleLeads(strategyId, count = 3) {
        const now = new Date();
        const leads = [];
        const sampleNames = [
            { name: 'Sarah Johnson', email: 'sarah.j@techcorp.com', company: 'TechCorp' },
            { name: 'Michael Chen', email: 'mchen@startupxyz.io', company: 'StartupXYZ' },
            { name: 'Emily Rodriguez', email: 'emily.r@innovate.com', company: 'Innovate Inc' },
        ];
        const sources = {
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
            const lead = {
                id: `lead_sim_${i + 1}`,
                name: sampleNames[i].name,
                email: sampleNames[i].email,
                source: sources[strategyId] || sources[normalizedId] || 'Web Form',
                timestamp: timestamp.toISOString(),
            };
            if (normalizedId === 'customer-nurture' || normalizedId === 'nurturer' ||
                normalizedId === 'outbound-sales' || normalizedId === 'closer') {
                lead.company = sampleNames[i].company;
            }
            leads.push(lead);
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
    calculateMetrics(actions, leads, strategyId) {
        const emailActions = actions.filter((a) => a.action.includes('email'));
        const emailsSent = emailActions.length;
        const leadsProcessed = leads.length;
        const normalizedId = this.normalizeStrategyId(strategyId);
        const timeSavedPerLead = {
            'inbound-leads': 15,
            'gatekeeper': 15,
            'outbound-sales': 20,
            'closer': 5,
            'customer-nurture': 10,
            'nurturer': 10,
        };
        const timeSaved = leadsProcessed * (timeSavedPerLead[normalizedId] || timeSavedPerLead[strategyId] || 15);
        const conversionRates = {
            'inbound-leads': 0.33,
            'gatekeeper': 0.33,
            'outbound-sales': 0.15,
            'closer': 0.20,
            'customer-nurture': 0.25,
            'nurturer': 0.25,
        };
        const estimatedConversions = Math.round(leadsProcessed * (conversionRates[normalizedId] || conversionRates[strategyId] || 0.2));
        return {
            leadsProcessed,
            emailsSent,
            timeSaved,
            estimatedConversions: Math.max(1, estimatedConversions),
        };
    }
    generateSimulation(strategyId, workflowPreview, configuration) {
        const sampleLeads = this.generateSampleLeads(strategyId, 3);
        const actionsPerformed = this.simulateWorkflowExecution(workflowPreview, sampleLeads);
        const metrics = this.calculateMetrics(actionsPerformed, sampleLeads, strategyId);
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
};
exports.SimulationService = SimulationService;
exports.SimulationService = SimulationService = __decorate([
    (0, common_1.Injectable)()
], SimulationService);
//# sourceMappingURL=simulation.service.js.map