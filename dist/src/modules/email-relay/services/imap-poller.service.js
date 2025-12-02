"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ImapPollerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImapPollerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const Imap = require("node-imap");
const mailparser_1 = require("mailparser");
const message_service_1 = require("./message.service");
let ImapPollerService = ImapPollerService_1 = class ImapPollerService {
    configService;
    messageService;
    logger = new common_1.Logger(ImapPollerService_1.name);
    LEAD_ID_REGEX = /flowtrackrelay\+([a-f0-9-]+)@gmail\.com/i;
    constructor(configService, messageService) {
        this.configService = configService;
        this.messageService = messageService;
    }
    async pollInbox() {
        const config = this.getImapConfig();
        const imap = new Imap(config);
        return new Promise((resolve, reject) => {
            imap.once('ready', () => {
                this.logger.log('IMAP connection established');
                imap.openBox('INBOX', false, (err, box) => {
                    if (err) {
                        this.logger.error('Failed to open INBOX', err);
                        imap.end();
                        return reject(err);
                    }
                    this.logger.log(`INBOX opened: ${box.messages.total} total messages`);
                    imap.search(['UNSEEN'], async (searchErr, results) => {
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
                        }
                        catch (error) {
                            this.logger.error('Error processing messages', error);
                            imap.end();
                            reject(error);
                        }
                    });
                });
            });
            imap.once('error', (err) => {
                this.logger.error('IMAP connection error', err);
                reject(err);
            });
            imap.once('end', () => {
                this.logger.log('IMAP connection ended');
            });
            imap.connect();
        });
    }
    async processMessages(imap, messageIds) {
        const batchSize = this.configService.get('EMAIL_POLL_BATCH_SIZE', 50);
        const batch = messageIds.slice(0, batchSize);
        const fetch = imap.fetch(batch, {
            bodies: '',
            markSeen: false,
        });
        const promises = [];
        fetch.on('message', (msg, seqno) => {
            const promise = new Promise((resolve, reject) => {
                msg.on('body', async (stream) => {
                    try {
                        const parsed = await (0, mailparser_1.simpleParser)(stream);
                        await this.handleInboundEmail(parsed, imap, seqno);
                        resolve();
                    }
                    catch (error) {
                        this.logger.error(`Failed to process message ${seqno}`, error);
                        reject(error);
                    }
                });
                msg.once('error', (err) => {
                    this.logger.error(`Message fetch error for ${seqno}`, err);
                    reject(err);
                });
            });
            promises.push(promise);
        });
        fetch.once('error', (err) => {
            this.logger.error('Fetch error', err);
            throw err;
        });
        fetch.once('end', () => {
            this.logger.log('Fetch completed');
        });
        await Promise.allSettled(promises);
    }
    async handleInboundEmail(parsed, imap, seqno) {
        try {
            const toField = Array.isArray(parsed.to)
                ? parsed.to.map(addr => (typeof addr === 'string' ? addr : addr.text || addr.value?.[0]?.address || '')).join(', ')
                : (parsed.to?.text || (parsed.to?.value?.[0]?.address) || '');
            const leadIdMatch = toField.match(this.LEAD_ID_REGEX);
            if (!leadIdMatch || !leadIdMatch[1]) {
                this.logger.warn(`Could not extract Lead ID from: ${toField}`);
                this.markMessageAsSeen(imap, seqno);
                return;
            }
            const leadId = leadIdMatch[1];
            this.logger.log(`Processing inbound email for Lead ID: ${leadId}`);
            if (parsed.messageId) {
                const exists = await this.messageService.messageExists(parsed.messageId);
                if (exists) {
                    this.logger.log(`Message already exists: ${parsed.messageId}`);
                    this.markMessageAsSeen(imap, seqno);
                    return;
                }
            }
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
            const fromAddress = parsed.from?.value[0];
            const fromEmail = fromAddress?.address || 'unknown@example.com';
            const fromName = fromAddress?.name;
            const subject = parsed.subject || '(No Subject)';
            const textBody = parsed.text || parsed.textAsHtml || '';
            const htmlBody = parsed.html || undefined;
            await this.messageService.createInboundMessage(lead.workspaceId, leadId, fromEmail, fromName, subject, textBody, htmlBody, parsed.messageId, parsed.inReplyTo, parsed.references?.[0], parsed.headers, parsed.date || new Date());
            this.logger.log(`Inbound message saved for Lead ${leadId} from ${fromEmail}`);
            this.markMessageAsSeen(imap, seqno);
        }
        catch (error) {
            this.logger.error('Error handling inbound email', error);
            throw error;
        }
    }
    markMessageAsSeen(imap, seqno) {
        imap.addFlags(seqno, ['\\Seen'], (err) => {
            if (err) {
                this.logger.error(`Failed to mark message ${seqno} as seen`, err);
            }
            else {
                this.logger.log(`Message ${seqno} marked as seen`);
            }
        });
    }
    getImapConfig() {
        return {
            user: this.configService.get('GMAIL_RELAY_EMAIL', ''),
            password: this.configService.get('GMAIL_RELAY_PASSWORD', ''),
            host: this.configService.get('GMAIL_IMAP_HOST', 'imap.gmail.com'),
            port: this.configService.get('GMAIL_IMAP_PORT', 993),
            tls: true,
            tlsOptions: {
                rejectUnauthorized: false,
            },
        };
    }
};
exports.ImapPollerService = ImapPollerService;
exports.ImapPollerService = ImapPollerService = ImapPollerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        message_service_1.MessageService])
], ImapPollerService);
//# sourceMappingURL=imap-poller.service.js.map