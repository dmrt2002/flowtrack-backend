import { Injectable, Logger } from '@nestjs/common';

interface OAuthState {
  workspaceId: string;
  timestamp: number;
}

/**
 * OAuth State Manager Service
 *
 * Manages temporary state storage for OAuth flows where the provider
 * doesn't reliably return the state parameter.
 *
 * BACKGROUND:
 * Calendly's OAuth implementation does not consistently return the state
 * parameter that we send during authorization. This causes issues when
 * trying to associate the OAuth callback with the original workspace context.
 *
 * SOLUTION:
 * Store userId → workspaceId mapping in memory when OAuth flow starts.
 * Retrieve workspaceId in callback using userId from state parameter.
 *
 * SECURITY:
 * - Both authorize and callback endpoints are protected by authentication
 * - State entries expire after 10 minutes
 * - Automatic cleanup prevents memory leaks
 * - Only stores userId and workspaceId (no sensitive data)
 */
@Injectable()
export class OAuthStateManagerService {
  private readonly logger = new Logger(OAuthStateManagerService.name);
  private readonly stateStore = new Map<string, OAuthState>();
  private readonly STATE_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds

  constructor() {
    // Run cleanup every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Store workspaceId for a user's OAuth flow
   */
  storeState(userId: string, workspaceId: string): void {
    this.logger.log(
      `Storing OAuth state - userId: ${userId}, workspaceId: ${workspaceId}`,
    );

    this.stateStore.set(userId, {
      workspaceId,
      timestamp: Date.now(),
    });
  }

  /**
   * Retrieve workspaceId for a user's OAuth callback
   */
  retrieveState(userId: string): string | null {
    const state = this.stateStore.get(userId);

    if (!state) {
      this.logger.warn(
        `OAuth state not found for userId: ${userId}. Either expired or never stored.`,
      );
      return null;
    }

    // Check if state has expired
    const age = Date.now() - state.timestamp;
    if (age > this.STATE_TTL) {
      this.logger.warn(
        `OAuth state expired for userId: ${userId}. Age: ${Math.round(age / 1000)}s`,
      );
      this.stateStore.delete(userId);
      return null;
    }

    this.logger.log(
      `Retrieved OAuth state - userId: ${userId}, workspaceId: ${state.workspaceId}`,
    );

    // Delete after retrieval (one-time use)
    this.stateStore.delete(userId);

    return state.workspaceId;
  }

  /**
   * Clean up expired state entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [userId, state] of this.stateStore.entries()) {
      if (now - state.timestamp > this.STATE_TTL) {
        this.stateStore.delete(userId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired OAuth state entries`);
    }
  }

  /**
   * Get current state store size (for debugging/monitoring)
   */
  getStoreSize(): number {
    return this.stateStore.size;
  }
}
