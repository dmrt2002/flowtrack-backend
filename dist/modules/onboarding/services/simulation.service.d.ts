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
    timeSaved: number;
    estimatedConversions: number;
}
export declare class SimulationService {
    generateSampleLeads(strategyId: string, count?: number): SimulationLead[];
    simulateWorkflowExecution(workflowPreview: any[], leads: SimulationLead[]): SimulationAction[];
    calculateMetrics(actions: SimulationAction[], leads: SimulationLead[], strategyId: string): SimulationMetrics;
    generateSimulation(strategyId: string, workflowPreview: any[]): {
        sampleLeads: SimulationLead[];
        actionsPerformed: SimulationAction[];
        metrics: SimulationMetrics;
    };
}
