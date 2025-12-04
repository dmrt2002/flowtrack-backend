import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailTrackingClassification } from '@prisma/client';

/**
 * TrackingClassifierService
 *
 * Classifies email tracking events based on temporal analysis and infrastructure detection.
 * Distinguishes between Apple MPP bot prefetches and genuine human opens.
 */
@Injectable()
export class TrackingClassifierService {
  private readonly logger = new Logger(TrackingClassifierService.name);
  private readonly PREFETCH_WINDOW_SECONDS: number;

  constructor(private readonly configService: ConfigService) {
    this.PREFETCH_WINDOW_SECONDS = this.configService.get<number>(
      'EMAIL_TRACKING_PREFETCH_WINDOW_SECONDS',
      60, // Default 60 seconds (aggressive mode)
    );
  }

  /**
   * Classify a tracking event based on temporal and infrastructure analysis
   *
   * Classification Rules:
   * - BOT_PREFETCH: Apple proxy + opened within PREFETCH_WINDOW (60s default)
   * - GENUINE_OPEN: Apple proxy + opened after PREFETCH_WINDOW
   * - DIRECT_OPEN: Non-Apple infrastructure (genuine user)
   * - AMBIGUOUS: Edge cases or uncertainty
   *
   * @param isAppleProxy - Whether the request came from Apple infrastructure
   * @param sentAt - Unix timestamp (milliseconds) when email was sent
   * @param openedAt - Unix timestamp (milliseconds) when email was opened
   * @returns Classification result with time delta
   */
  classify(
    isAppleProxy: boolean,
    sentAt: number,
    openedAt: number,
  ): {
    classification: EmailTrackingClassification;
    timeDeltaSeconds: number;
  } {
    // Calculate time delta in seconds
    const timeDeltaMs = openedAt - sentAt;
    const timeDeltaSeconds = Math.floor(timeDeltaMs / 1000);

    // Scenario 1: Non-Apple infrastructure
    // This is a direct open from the user's real IP (not proxied)
    if (!isAppleProxy) {
      this.logger.debug(
        `Classification: DIRECT_OPEN (non-Apple IP, timeDelta=${timeDeltaSeconds}s)`,
      );
      return {
        classification: EmailTrackingClassification.DIRECT_OPEN,
        timeDeltaSeconds,
      };
    }

    // Scenario 2: Apple proxy with very short time delta
    // This is almost certainly an automated prefetch
    if (timeDeltaSeconds < this.PREFETCH_WINDOW_SECONDS) {
      this.logger.debug(
        `Classification: BOT_PREFETCH (Apple proxy, timeDelta=${timeDeltaSeconds}s < ${this.PREFETCH_WINDOW_SECONDS}s threshold)`,
      );
      return {
        classification: EmailTrackingClassification.BOT_PREFETCH,
        timeDeltaSeconds,
      };
    }

    // Scenario 3: Apple proxy with significant time delta
    // User is reopening the email or opening it for the first time after delay
    if (timeDeltaSeconds >= this.PREFETCH_WINDOW_SECONDS) {
      this.logger.debug(
        `Classification: GENUINE_OPEN (Apple proxy, timeDelta=${timeDeltaSeconds}s >= ${this.PREFETCH_WINDOW_SECONDS}s threshold)`,
      );
      return {
        classification: EmailTrackingClassification.GENUINE_OPEN,
        timeDeltaSeconds,
      };
    }

    // Edge case: Should not reach here
    this.logger.warn(
      `Classification: AMBIGUOUS (unexpected state, timeDelta=${timeDeltaSeconds}s)`,
    );
    return {
      classification: EmailTrackingClassification.AMBIGUOUS,
      timeDeltaSeconds,
    };
  }

  /**
   * Get human-readable classification reason
   * @param classification - The classification enum
   * @param timeDeltaSeconds - Time delta in seconds
   * @param isAppleProxy - Whether it's from Apple infrastructure
   * @returns Human-readable explanation
   */
  getClassificationReason(
    classification: EmailTrackingClassification,
    timeDeltaSeconds: number,
    isAppleProxy: boolean,
  ): string {
    switch (classification) {
      case EmailTrackingClassification.BOT_PREFETCH:
        return `Apple MPP automated prefetch detected (opened ${timeDeltaSeconds}s after send, < ${this.PREFETCH_WINDOW_SECONDS}s threshold)`;

      case EmailTrackingClassification.GENUINE_OPEN:
        return `Genuine user open via Apple MPP (opened ${timeDeltaSeconds}s after send, >= ${this.PREFETCH_WINDOW_SECONDS}s threshold)`;

      case EmailTrackingClassification.DIRECT_OPEN:
        return `Direct open from user's real IP (non-Apple infrastructure, ${timeDeltaSeconds}s after send)`;

      case EmailTrackingClassification.AMBIGUOUS:
        return `Ambiguous classification (isApple=${isAppleProxy}, timeDelta=${timeDeltaSeconds}s)`;

      default:
        return 'Unknown classification';
    }
  }

  /**
   * Get current prefetch window threshold
   * @returns Threshold in seconds
   */
  getPrefetchWindowSeconds(): number {
    return this.PREFETCH_WINDOW_SECONDS;
  }
}
