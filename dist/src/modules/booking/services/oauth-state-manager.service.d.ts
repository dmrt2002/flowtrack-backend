export declare class OAuthStateManagerService {
    private readonly logger;
    private readonly stateStore;
    private readonly STATE_TTL;
    constructor();
    storeState(userId: string, workspaceId: string): void;
    retrieveState(userId: string): string | null;
    private cleanup;
    getStoreSize(): number;
}
