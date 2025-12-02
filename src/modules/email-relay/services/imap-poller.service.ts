import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Imap = require('node-imap');
import { simpleParser, ParsedMail } from 'mailparser';
import { MessageService } from './message.service';
import { ImapConfig, ParsedInboundEmail } from '../types';

@Injectable()
export class ImapPollerService {
  private readonly logger = new Logger(ImapPollerService.name);
  private readonly LEAD_ID_REGEX = /flowtrackrelay\+([a-f0-9-]+)@gmail\.com/i;

  constructor(
    private configService: ConfigService,
    private messageService: MessageService,
  ) {}

  /**
   * Poll Gmail inbox for new (UNSEEN) messages
   */
  async pollInbox(): Promise<void> {
    const config = this.getImapConfig();
    const imap = new Imap(config);

    return new Promise((resolve, reject) => {
      imap.once('ready', () => {
        this.logger.log('IMAP connection established');

        imap.openBox('INBOX', false, (err: Error | null, box: Imap.Box) => {
          if (err) {
            this.logger.error('Failed to open INBOX', err);
            imap.end();
            return reject(err);
          }

          this.logger.log(`INBOX opened: ${box.messages.total} total messages`);

          // Search for unseen messages
          imap.search(['UNSEEN'], async (searchErr: Error | null, results: number[]) => {
            if (searchErr) {
              this.logger.error('IMAP search failed', searchErr);
              imap.end();
              return reject(searchErr);
            }

            if (!results || results.length === 0) {
              this.logger.log('No new messages found');
              imap.end();
              return resolve();
            }

            this.logger.log(`Found ${results.length} unread messages`);

            try {
              await this.processMessages(imap, results);
              imap.end();
              resolve();
            } catch (error) {
              this.logger.error('Error processing messages', error);
              imap.end();
              reject(error);
            }
          });
        });
      });

      imap.once('error', (err: Error) => {
        this.logger.error('IMAP connection error', err);
        reject(err);
      });

      imap.once('end', () => {
        this.logger.log('IMAP connection ended');
      });

      imap.connect();
    });
  }

  /**
   * Process fetched messages
   */
  private async processMessages(
    imap: Imap,
    messageIds: number[],
  ): Promise<void> {
    const batchSize = this.configService.get<number>(
      'EMAIL_POLL_BATCH_SIZE',
      50,
    );
    const batch = messageIds.slice(0, batchSize);

    const fetch = imap.fetch(batch, {
      bodies: '',
      markSeen: false, // Don't mark as seen until we successfully process
    });

    const promises: Promise<void>[] = [];

    fetch.on('message', (msg: Imap.ImapMessage, seqno: number) => {
      const promise = new Promise<void>((resolve, reject) => {
        msg.on('body', async (stream) => {
          try {
            const parsed = await simpleParser(stream as any);
            await this.handleInboundEmail(parsed, imap, seqno);
            resolve();
          } catch (error) {
            this.logger.error(`Failed to process message ${seqno}`, error);
            reject(error);
          }
        });

        msg.once('error', (err: Error) => {
          this.logger.error(`Message fetch error for ${seqno}`, err);
          reject(err);
        });
      });

      promises.push(promise);
    });

    fetch.once('error', (err: Error) => {
      this.logger.error('Fetch error', err);
      throw err;
    });

    fetch.once('end', () => {
      this.logger.log('Fetch completed');
    });

    await Promise.allSettled(promises);
  }

  /**
   * Handle individual inbound email
   */
  private async handleInboundEmail(
    parsed: ParsedMail,
    imap: Imap,
    seqno: number,
  ): Promise<void> {
    try {
      // Extract Lead ID from To field using plus addressing
      const toField = Array.isArray(parsed.to)
        ? parsed.to.map(addr => (typeof addr === 'string' ? addr : addr.text || addr.value?.[0]?.address || '')).join(', ')
        : (parsed.to?.text || (parsed.to?.value?.[0]?.address) || '');
      const leadIdMatch = toField.match(this.LEAD_ID_REGEX);

      if (!leadIdMatch || !leadIdMatch[1]) {
        this.logger.warn(`Could not extract Lead ID from: ${toField}`);
        // Mark as seen anyway to prevent reprocessing
        this.markMessageAsSeen(imap, seqno);
        return;
      }

      const leadId = leadIdMatch[1];
      this.logger.log(`Processing inbound email for Lead ID: ${leadId}`);

      // Check if message already exists (by Message-ID)
      if (parsed.messageId) {
        const exists = await this.messageService.messageExists(
          parsed.messageId,
        );
        if (exists) {
          this.logger.log(`Message already exists: ${parsed.messageId}`);
          this.markMessageAsSeen(imap, seqno);
          return;
        }
      }

      // Extract workspace ID from lead
      // Note: We need to query the lead to get workspace ID
      const prismaService = this.messageService['prisma'];
      const lead = await prismaService.lead.findUnique({
        where: { id: leadId },
        select: { workspaceId: true },
      });

      if (!lead) {
        this.logger.warn(`Lead not found: ${leadId}`);
        this.markMessageAsSeen(imap, seqno);
        return;
      }

      // Extract email details
      const fromAddress = parsed.from?.value[0];
      const fromEmail = fromAddress?.address || 'unknown@example.com';
      const fromName = fromAddress?.name;

      const subject = parsed.subject || '(No Subject)';
      const textBody = parsed.text || parsed.textAsHtml || '';
      const htmlBody = parsed.html || undefined;

      // Save inbound message
      await this.messageService.createInboundMessage(
        lead.workspaceId,
        leadId,
        fromEmail,
        fromName,
        subject,
        textBody,
        htmlBody,
        parsed.messageId,
        parsed.inReplyTo,
        parsed.references?.[0], // Use first reference as thread ID
        parsed.headers as any,
        parsed.date || new Date(),
      );

      this.logger.log(
        `Inbound message saved for Lead ${leadId} from ${fromEmail}`,
      );

      // Mark message as seen
      this.markMessageAsSeen(imap, seqno);
    } catch (error) {
      this.logger.error('Error handling inbound email', error);
      throw error;
    }
  }

  /**
   * Mark message as seen in IMAP
   */
  private markMessageAsSeen(imap: Imap, seqno: number): void {
    imap.addFlags(seqno, ['\\Seen'], (err: Error | null) => {
      if (err) {
        this.logger.error(`Failed to mark message ${seqno} as seen`, err);
      } else {
        this.logger.log(`Message ${seqno} marked as seen`);
      }
    });
  }

  /**
   * Get IMAP configuration from environment
   */
  private getImapConfig(): ImapConfig {
    return {
      user: this.configService.get<string>('GMAIL_RELAY_EMAIL', ''),
      password: this.configService.get<string>('GMAIL_RELAY_PASSWORD', ''),
      host: this.configService.get<string>('GMAIL_IMAP_HOST', 'imap.gmail.com'),
      port: this.configService.get<number>('GMAIL_IMAP_PORT', 993),
      tls: true,
      tlsOptions: {
        rejectUnauthorized: false,
      },
    };
  }
}
