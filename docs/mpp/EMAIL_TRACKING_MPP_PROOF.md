# Technical Design Document: Intelligent Email Tracking System (MPP-Proof)

**Target Stack:** NestJS (Node.js) / SQLite  
**Objective:** Accurate open rate tracking distinguishing between Apple Mail Privacy Protection (MPP) automated pre-fetches and genuine user interaction.

## 1. Architectural Overview

The system relies on a **"Temporal & Infrastructure Heuristic"** rather than simple resource requesting. We acknowledge that Apple will request the image; our goal is to classify who is making the request (the bot or the human) based on **when** they make it and **where** they come from.

We will utilize a **Side-Loading Architecture**:

- **Synchronous Path:** Immediate delivery of the tracking pixel (image) to ensure the email client never hangs.
- **Asynchronous Path:** Background processing of IP analysis, DNS resolution, and Database logging.

## 2. The Implementation Protocol

### Phase A: Payload Construction (The Email Side)

To enable temporal analysis, the tracking URL embedded in the email must carry the **"Birth Time"** of the email.

**Data Requirements in URL:**

- **Entity ID:** The unique ID of the email/campaign.
- **Sent Timestamp (T0):** The Unix timestamp (in seconds) of the exact moment the email was dispatched via SMTP.

**Logic:** You are not just tracking that it opened; you are tracking the **latency** of the open.

**Example URL:**
```
https://yourdomain.com/api/v1/email/track?e={emailId}&t={sentTimestamp}
```

### Phase B: The Ingress (NestJS Controller)

Create a dedicated GET route in your NestJS application. This route must operate at the raw HTTP protocol level, bypassing standard JSON serialization.

#### 1. Request Interception:

- **Extract the Client IP Address.**
  - **Critical:** If your NestJS app sits behind Nginx, AWS ALB, or Cloudflare, you must parse the `X-Forwarded-For` header to get the real IP. Do not use the direct connection IP (which will be your load balancer).
- **Extract the Sent Timestamp** from the query parameters.

#### 2. Response Header Manipulation (The Cache Poison):

You must forcefully disable caching at the browser/proxy level. If Apple caches the image, you lose all future tracking events for that user.

- Set `Content-Type: image/gif`
- Set `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`
- Set `Pragma: no-cache`
- Set `Expires: 0`
- **Remove ETag:** Ensure your server does NOT send an ETag. If you send an ETag, clients will respond with `If-None-Match`, resulting in a `304 Not Modified` status, which often fails to trigger your tracking logic.

#### 3. The "Fire and Forget" Response:

- Immediately return a transparent 1x1 pixel buffer to the client.
- Do not await the database or DNS logic before sending the response. Latency here causes broken images in the user's email client.

### Phase C: The Analysis Engine (Service Layer)

Once the response is sent, trigger an asynchronous background job (using a Message Queue or a non-awaited Promise) to analyze the captured data.

#### Step 1: Infrastructure Fingerprinting (DNS lookup)

- Perform a **Reverse DNS Lookup (PTR Record)** on the extracted Client IP.
  - In Node.js, use the native `dns` module (specifically the `reverse` method).
- **Pattern Match:** Check if the resolved hostname contains specific strings known to belong to Apple's proxy infrastructure (e.g., `icloud-content`, `apple-relay`).
- **Optimization:** Cache these IP-to-Hostname results in Redis or an in-memory Map (LRU) to avoid performing a DNS lookup for every single request.

#### Step 2: Temporal Filtering (The "Hacker" Trick)

Calculate `Time_Delta = Current_Server_Time - Sent_Timestamp`.

**Scenario A (The Machine):**
- If the IP identifies as Apple **AND** `Time_Delta` is very short (e.g., < 120 seconds).
- **Verdict:** This is the Apple Proxy automatically downloading images immediately after email delivery.
- **Action:** Log as "Bot/Prefetch". Do not increment "User Open" count.

**Scenario B (The Human):**
- If the IP identifies as Apple **AND** `Time_Delta` is significant (e.g., > 120 seconds).
- **Verdict:** A user is reopening the email, or opening it for the first time after the prefetch window.
- **Action:** Log as "Genuine Open". Increment "User Open" count.

**Scenario C (The Direct User):**
- If the IP does NOT identify as Apple (e.g., residential ISP, corporate network).
- **Verdict:** This is a direct request from the user's device/network.
- **Action:** Log as "Genuine Open". Increment "User Open" count.

**Scenario D (The Edge Case):**
- If the IP identifies as Apple **AND** `Time_Delta` is between 60-120 seconds (gray zone).
- **Verdict:** Ambiguous - could be prefetch or early user open.
- **Action:** Log as "Ambiguous". Optionally flag for manual review or apply conservative heuristic (don't count as open).

## 3. Database Schema

### Email Tracking Table

```sql
CREATE TABLE email_tracking_events (
  id TEXT PRIMARY KEY,
  email_id TEXT NOT NULL,
  sent_timestamp INTEGER NOT NULL,
  opened_timestamp INTEGER NOT NULL,
  client_ip TEXT NOT NULL,
  resolved_hostname TEXT,
  user_agent TEXT,
  time_delta_seconds INTEGER NOT NULL,
  classification TEXT NOT NULL, -- 'BOT_PREFETCH' | 'GENUINE_OPEN' | 'AMBIGUOUS'
  is_apple_proxy BOOLEAN NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_email_tracking_email_id ON email_tracking_events(email_id);
CREATE INDEX idx_email_tracking_classification ON email_tracking_events(classification);
CREATE INDEX idx_email_tracking_opened_timestamp ON email_tracking_events(opened_timestamp);
```

### Email Metadata Table (for tracking pixel generation)

```sql
CREATE TABLE sent_emails (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  lead_id TEXT,
  workflow_execution_id TEXT,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  sent_timestamp INTEGER NOT NULL,
  tracking_enabled BOOLEAN NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_sent_emails_workspace_id ON sent_emails(workspace_id);
CREATE INDEX idx_sent_emails_lead_id ON sent_emails(lead_id);
```

## 4. Implementation Details

### 4.1 Tracking Pixel Generation

When constructing the email HTML, inject the tracking pixel:

```typescript
const trackingUrl = `${baseUrl}/api/v1/email/track?e=${emailId}&t=${sentTimestamp}`;
const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />`;
const htmlWithTracking = `${htmlBody}${trackingPixel}`;
```

### 4.2 Controller Implementation

```typescript
@Controller('email')
export class EmailTrackingController {
  @Get('track')
  async trackEmailOpen(
    @Query('e') emailId: string,
    @Query('t') sentTimestamp: string,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    // Extract real client IP (handle proxies)
    const clientIp = this.extractClientIp(request);
    const openedTimestamp = Math.floor(Date.now() / 1000);
    const sentTs = parseInt(sentTimestamp, 10);
    const timeDelta = openedTimestamp - sentTs;

    // Set cache-busting headers
    response.setHeader('Content-Type', 'image/gif');
    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');

    // Fire and forget: Send 1x1 transparent pixel immediately
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    response.send(pixel);

    // Asynchronous analysis (don't await)
    this.emailTrackingService.analyzeTrackingEvent({
      emailId,
      sentTimestamp: sentTs,
      openedTimestamp,
      clientIp,
      timeDelta,
      userAgent: request.headers['user-agent'] || '',
    }).catch((error) => {
      this.logger.error('Failed to process tracking event', error);
    });
  }

  private extractClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      return forwarded.split(',')[0].trim();
    }
    return request.ip || request.socket.remoteAddress || 'unknown';
  }
}
```

### 4.3 Service Implementation

```typescript
@Injectable()
export class EmailTrackingService {
  private readonly dnsCache = new Map<string, { hostname: string; timestamp: number }>();
  private readonly DNS_CACHE_TTL = 3600 * 1000; // 1 hour

  async analyzeTrackingEvent(data: TrackingEventData): Promise<void> {
    // Step 1: DNS Resolution (with caching)
    const hostname = await this.resolveHostname(data.clientIp);
    const isAppleProxy = this.isAppleInfrastructure(hostname);

    // Step 2: Classification
    const classification = this.classifyEvent({
      isAppleProxy,
      timeDelta: data.timeDelta,
    });

    // Step 3: Database logging
    await this.prisma.emailTrackingEvent.create({
      data: {
        id: generateId(),
        emailId: data.emailId,
        sentTimestamp: data.sentTimestamp,
        openedTimestamp: data.openedTimestamp,
        clientIp: data.clientIp,
        resolvedHostname: hostname,
        userAgent: data.userAgent,
        timeDeltaSeconds: data.timeDelta,
        classification,
        isAppleProxy,
        createdAt: Math.floor(Date.now() / 1000),
      },
    });

    // Step 4: Update email open status if genuine
    if (classification === 'GENUINE_OPEN') {
      await this.updateEmailOpenStatus(data.emailId);
    }
  }

  private async resolveHostname(ip: string): Promise<string> {
    // Check cache first
    const cached = this.dnsCache.get(ip);
    if (cached && Date.now() - cached.timestamp < this.DNS_CACHE_TTL) {
      return cached.hostname;
    }

    try {
      const hostnames = await dns.reverse(ip);
      const hostname = hostnames[0] || 'unknown';
      
      // Update cache
      this.dnsCache.set(ip, { hostname, timestamp: Date.now() });
      
      return hostname;
    } catch (error) {
      return 'unknown';
    }
  }

  private isAppleInfrastructure(hostname: string): boolean {
    const applePatterns = [
      'icloud-content',
      'apple-relay',
      'apple.com',
      'icloud.com',
      'me.com',
    ];
    
    return applePatterns.some(pattern => 
      hostname.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private classifyEvent(data: { isAppleProxy: boolean; timeDelta: number }): 'BOT_PREFETCH' | 'GENUINE_OPEN' | 'AMBIGUOUS' {
    // Direct user (not Apple proxy)
    if (!data.isAppleProxy) {
      return 'GENUINE_OPEN';
    }

    // Apple proxy with short time delta (prefetch)
    if (data.timeDelta < 60) {
      return 'BOT_PREFETCH';
    }

    // Apple proxy with long time delta (genuine open)
    if (data.timeDelta > 120) {
      return 'GENUINE_OPEN';
    }

    // Gray zone (60-120 seconds)
    return 'AMBIGUOUS';
  }

  private async updateEmailOpenStatus(emailId: string): Promise<void> {
    // Update lead status or email metadata
    // This depends on your business logic
  }
}
```

## 5. Configuration Parameters

### Tunable Thresholds

- **Prefetch Window:** 60 seconds (adjustable based on observed behavior)
- **Genuine Open Window:** 120 seconds (minimum time delta for Apple proxy to be considered genuine)
- **DNS Cache TTL:** 3600 seconds (1 hour)
- **Ambiguous Zone:** 60-120 seconds (gray area for manual review)

### Apple Infrastructure Patterns

Maintain a list of known Apple proxy hostname patterns:

```typescript
const APPLE_PROXY_PATTERNS = [
  'icloud-content',
  'apple-relay',
  'apple.com',
  'icloud.com',
  'me.com',
  'mac.com',
];
```

## 6. Monitoring & Analytics

### Key Metrics to Track

1. **Total Tracking Events:** All pixel requests
2. **Genuine Opens:** User-initiated opens
3. **Bot Prefetches:** Apple MPP automated requests
4. **Ambiguous Events:** Events in gray zone
5. **DNS Resolution Rate:** Success rate of reverse DNS lookups
6. **Average Time Delta:** Distribution of time deltas for analysis

### Alerting

- Alert if bot prefetch rate exceeds 80% (may indicate misconfiguration)
- Alert if DNS resolution failures exceed 10% (may indicate network issues)
- Alert if ambiguous event rate exceeds 20% (may need threshold adjustment)

## 7. Testing Strategy

### Unit Tests

- Test IP extraction with various proxy configurations
- Test DNS resolution and caching logic
- Test classification logic with different time deltas
- Test Apple infrastructure detection

### Integration Tests

- Test full tracking flow with mock DNS responses
- Test cache behavior and TTL expiration
- Test database logging and status updates

### Manual Testing

1. Send test email to Apple Mail (iCloud account)
2. Verify prefetch is detected within 60 seconds
3. Wait 5 minutes and open email manually
4. Verify genuine open is detected
5. Check database for correct classification

## 8. Limitations & Future Enhancements

### Known Limitations

1. **Other Privacy Proxies:** This system specifically targets Apple MPP. Other email clients (e.g., Gmail, Outlook) may implement similar features in the future.
2. **VPN Users:** Users behind VPNs may appear as different IPs, but this doesn't affect classification.
3. **Corporate Proxies:** Corporate networks may use proxies that interfere with IP detection.

### Future Enhancements

1. **Machine Learning Model:** Train a model on historical data to improve classification accuracy.
2. **Multi-Proxy Detection:** Extend detection to other privacy proxy services.
3. **Geographic Analysis:** Use IP geolocation to enhance classification.
4. **User Agent Analysis:** Analyze user agent strings for additional signals.
5. **Click Tracking:** Combine with click tracking for more accurate engagement metrics.

## 9. Security Considerations

1. **Rate Limiting:** Implement rate limiting on the tracking endpoint to prevent abuse.
2. **Input Validation:** Validate and sanitize all query parameters.
3. **IP Whitelisting:** Optionally whitelist known proxy IPs to reduce DNS lookups.
4. **Privacy Compliance:** Ensure tracking complies with GDPR, CCPA, and other privacy regulations.
5. **Data Retention:** Implement data retention policies for tracking events.

## 10. Deployment Checklist

- [ ] Create database tables and indexes
- [ ] Implement tracking controller with cache-busting headers
- [ ] Implement DNS resolution service with caching
- [ ] Integrate tracking pixel generation into email sending flow
- [ ] Configure reverse proxy headers (X-Forwarded-For)
- [ ] Set up monitoring and alerting
- [ ] Test with Apple Mail accounts
- [ ] Document API endpoints
- [ ] Set up rate limiting
- [ ] Configure data retention policies

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Author:** FlowTrack Engineering Team

