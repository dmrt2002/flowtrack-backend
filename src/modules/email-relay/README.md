# Gmail Relay - Two-Way Email Sync Module

## Overview

The Gmail Relay module implements a two-way email sync system using Gmail's "plus addressing" feature (`email+tag@gmail.com`) to track email replies without requiring individual user OAuth permissions.

## Architecture

### Plus Addressing Pattern

When sending an email to a lead, the system uses:
- **From**: `"SenderName via FlowTrack" <flowtrackrelay@gmail.com>`
- **Reply-To**: `flowtrackrelay+{leadId}@gmail.com`

When the lead replies, Gmail delivers the email to `flowtrackrelay@gmail.com`, and the system extracts the Lead ID from the `To` field using regex.

### Components

```
email-relay/
├── controllers/
│   └── message.controller.ts      # API endpoints for message management
├── dto/
│   ├── send-relay-email.dto.ts   # Validation for sending emails
│   └── get-messages.dto.ts       # Query parameters for fetching messages
├── services/
│   ├── message.service.ts        # Database operations for messages
│   ├── relay-email.service.ts    # SMTP sending via nodemailer
│   ├── imap-poller.service.ts    # IMAP polling for inbound emails
│   └── email-poll-queue.service.ts # BullMQ cron job scheduler
├── processors/
│   └── email-poll.processor.ts   # BullMQ job handler
├── types.ts                       # TypeScript interfaces
└── email-relay.module.ts          # Module definition
```

## Database Schema

### Message Model

```prisma
model Message {
  id          String           @id
  workspaceId String
  leadId      String
  direction   MessageDirection  // INBOUND | OUTBOUND

  // Email headers
  fromEmail   String
  fromName    String?
  toEmail     String
  toName      String?
  subject     String

  // Email body
  htmlBody    String?
  textBody    String

  // Metadata
  headers     Json?
  messageId   String?  @unique
  threadId    String?
  inReplyTo   String?

  // Timestamps
  sentAt      DateTime?
  receivedAt  DateTime?
  createdAt   DateTime
  updatedAt   DateTime

  // Relations
  workspace   Workspace
  lead        Lead
}
```

## API Endpoints

### 1. Get All Messages for Workspace
```http
GET /api/v1/workspaces/:workspaceId/messages?direction=INBOUND&limit=50&offset=0
```

### 2. Get Messages for Specific Lead
```http
GET /api/v1/workspaces/:workspaceId/leads/:leadId/messages
```

### 3. Send Email to Lead
```http
POST /api/v1/workspaces/:workspaceId/leads/:leadId/messages/send

{
  "subject": "Follow up on your inquiry",
  "textBody": "Hi {{name}}, following up...",
  "htmlBody": "<p>Hi {{name}}, following up...</p>",
  "senderName": "John Doe"
}
```

## Environment Variables

Add to `.env`:

```bash
# Gmail Relay Account
GMAIL_RELAY_EMAIL=flowtrackrelay@gmail.com
GMAIL_RELAY_PASSWORD=your-app-password

# SMTP Configuration
GMAIL_SMTP_HOST=smtp.gmail.com
GMAIL_SMTP_PORT=587

# IMAP Configuration
GMAIL_IMAP_HOST=imap.gmail.com
GMAIL_IMAP_PORT=993

# Polling Configuration
EMAIL_POLL_INTERVAL_MINUTES=5
EMAIL_POLL_BATCH_SIZE=50
```

## Setup Instructions

### 1. Create Gmail Relay Account

1. Create a new Gmail account: `flowtrackrelay@gmail.com`
2. Enable 2-Factor Authentication
3. Generate App Password:
   - Go to Google Account → Security → 2-Step Verification
   - Scroll to "App passwords"
   - Create new app password for "Mail"
   - Copy the 16-character password

### 2. Configure Environment

Update `.env` with the Gmail credentials:

```bash
GMAIL_RELAY_EMAIL=flowtrack.relay@gmail.com
GMAIL_RELAY_PASSWORD=abcd-efgh-ijkl-mnop
```

### 3. Start Services

The module will automatically:
- Initialize the SMTP transporter
- Set up IMAP polling every 5 minutes (configurable)
- Process inbound emails and update lead statuses

## How It Works

### Outbound Flow (Sending)

1. API receives request to send email to lead
2. `RelayEmailService` constructs email with:
   - From: `"SenderName via FlowTrack" <flowtrack.relay@gmail.com>`
   - Reply-To: `flowtrack.relay+{leadId}@gmail.com`
3. Email sent via nodemailer SMTP
4. `MessageService` saves outbound message to database

### Inbound Flow (Receiving)

1. BullMQ cron job triggers every 5 minutes
2. `EmailPollProcessor` calls `ImapPollerService.pollInbox()`
3. Connect to Gmail via IMAP
4. Search for `UNSEEN` messages
5. For each message:
   - Parse email headers and body
   - Extract Lead ID from To field using regex: `/flowtrackrelay\+([a-f0-9-]+)@gmail\.com/i`
   - Check if message already exists (by `messageId`)
   - Save inbound message to database
   - Update lead status to `RESPONDED`
   - Mark email as `SEEN`

## Lead Status Updates

When an inbound email is received, the system automatically updates the lead status:

- If lead status is `EMAIL_SENT` → update to `RESPONDED`
- If lead status is `FOLLOW_UP_SENT` → update to `RESPONDED`

## Error Handling

### Invalid Lead ID
- If Lead ID cannot be extracted from To field:
  - Log warning with full email headers
  - Mark message as seen (to prevent reprocessing)
  - Do not save to database

### Duplicate Messages
- Check `messageId` header before saving
- Skip if message already exists
- Mark as seen

### IMAP Connection Failures
- Retry with exponential backoff (3 attempts)
- Delays: 5s, 10s, 30s
- Log errors for monitoring

## Testing

### Manual Testing

#### 1. Send Email via API
```bash
curl -X POST http://localhost:3000/api/v1/workspaces/{workspaceId}/leads/{leadId}/messages/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test Email",
    "textBody": "This is a test email"
  }'
```

#### 2. Reply as Lead
Reply to the email from your personal email

#### 3. Trigger Manual Polling
```typescript
// In NestJS service or controller
await this.emailPollQueueService.triggerManualPolling();
```

#### 4. Check Message Saved
```bash
curl http://localhost:3000/api/v1/workspaces/{workspaceId}/leads/{leadId}/messages
```

### Queue Statistics

```bash
GET /api/v1/admin/email-relay/queue-stats
```

Returns:
```json
{
  "waiting": 0,
  "active": 0,
  "completed": 150,
  "failed": 2,
  "delayed": 0
}
```

## Rate Limits

### Gmail Free Tier
- **Sending**: 500 emails/day
- **IMAP**: No official limit, but avoid excessive connections

### Best Practices
- Poll every 5-15 minutes (not more frequent)
- Batch process messages (max 50 per poll)
- Use exponential backoff on errors

## Monitoring

### Logs to Monitor

```
[EmailPollQueueService] Scheduled email polling (every 5 minutes)
[ImapPollerService] IMAP connection established
[ImapPollerService] Found 3 unread messages
[ImapPollerService] Processing inbound email for Lead ID: abc-123
[ImapPollerService] Inbound message saved for Lead abc-123 from john@example.com
[ImapPollerService] Message 1 marked as seen
```

### Error Alerts

Set up alerts for:
- IMAP connection failures
- SMTP send failures
- Queue processing failures
- Invalid Lead ID extractions

## Troubleshooting

### SMTP Connection Failed
- Verify Gmail app password is correct
- Check if 2FA is enabled on Gmail account
- Ensure SMTP port 587 is not blocked

### IMAP Connection Failed
- Verify IMAP is enabled in Gmail settings
- Check app password permissions
- Ensure IMAP port 993 is not blocked

### Emails Not Being Detected
- Check inbox for unread messages
- Verify polling interval in logs
- Check BullMQ queue is running
- Verify Redis connection

### Lead ID Not Extracted
- Check email headers in database
- Verify regex pattern matches Gmail plus addressing
- Ensure Reply-To header was set correctly

## Future Enhancements

- [ ] Add support for attachments
- [ ] Implement email threading UI
- [ ] Add rich text editor for email composition
- [ ] Support for email templates
- [ ] Add email analytics (open rate, reply rate)
- [ ] Implement smart reply suggestions
- [ ] Add email scheduling
- [ ] Support for multiple relay accounts (per workspace)

## Security Considerations

- App Password stored in environment variables (never in code)
- TLS/SSL for SMTP and IMAP connections
- Workspace isolation (always verify workspace access)
- Message ID uniqueness prevents duplicates
- IMAP connection properly closed after polling

## Dependencies

- `nodemailer` - SMTP email sending
- `node-imap` - IMAP connection for Gmail
- `mailparser` - Email parsing (headers, body)
- `@nestjs/bullmq` - Job queue for cron scheduling
- `@prisma/client` - Database ORM

## License

Internal FlowTrack module - Not for redistribution
