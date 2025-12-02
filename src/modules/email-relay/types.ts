export interface EmailMessage {
  from: {
    email: string;
    name?: string;
  };
  to: {
    email: string;
    name?: string;
  };
  subject: string;
  htmlBody?: string;
  textBody: string;
  messageId?: string;
  inReplyTo?: string;
  threadId?: string;
  headers?: Record<string, any>;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface ImapConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
  tlsOptions?: {
    rejectUnauthorized: boolean;
  };
}

export interface ParsedInboundEmail {
  leadId: string;
  fromEmail: string;
  fromName?: string;
  subject: string;
  htmlBody?: string;
  textBody: string;
  messageId?: string;
  inReplyTo?: string;
  threadId?: string;
  headers?: Record<string, any>;
  receivedAt: Date;
}
