export interface SimulationLead {
    id: string;
    name: string;
    email: string;
    source: string;
    timestamp: string;
    budget?: number;
    company?: string;
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
export interface StrategyLogicStep {
    id: string;
    label: string;
    type: 'trigger' | 'delay' | 'condition' | 'action';
    delayDays?: number;
    emailNumber?: number;
}
export interface StrategyTestLead {
    name: string;
    email: string;
    budget?: number;
    company?: string;
}
type StrategyId = 'inbound-leads' | 'outbound-sales' | 'customer-nurture' | 'gatekeeper' | 'nurturer' | 'closer';
export declare class SimulationService {
    getLogicStepsForStrategy(strategyId: string, configuration?: Record<string, any>): StrategyLogicStep[];
    generateTestLeadsForStrategy(strategyId: string, configuration?: Record<string, any>): StrategyTestLead[];
    private normalizeStrategyId;
    generateSampleLeads(strategyId: string, count?: number): SimulationLead[];
    simulateWorkflowExecution(workflowPreview: any[], leads: SimulationLead[]): SimulationAction[];
    calculateMetrics(actions: SimulationAction[], leads: SimulationLead[], strategyId: string): SimulationMetrics;
    generateSimulation(strategyId: string, workflowPreview: any[], configuration?: Record<string, any>): {
        sampleLeads: SimulationLead[];
        actionsPerformed: SimulationAction[];
        metrics: SimulationMetrics;
        logicSteps: StrategyLogicStep[];
        testLeads: StrategyTestLead[];
        strategyId: StrategyId;
    };
}
export {};
