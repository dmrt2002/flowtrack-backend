import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { RelayEmailService } from './src/modules/email-relay/services/relay-email.service';

async function bootstrap() {
  console.log('📧 Sending Test Email via Gmail Relay...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const relayEmailService = app.get(RelayEmailService);

    // Test data from the lead we just fetched
    const workspaceId = '8592d2ed-1d31-46d7-9c65-99aecd0de8d4';
    const leadId = '79e4dd64-7157-4fd7-ad56-1badca42a095';
    const leadEmail = 'namith@gmail.com';
    const leadName = 'Namith';

    console.log('Sending email with the following details:');
    console.log('  Workspace ID:', workspaceId);
    console.log('  Lead ID:', leadId);
    console.log('  To:', `${leadName} <${leadEmail}>`);
    console.log('  Subject: Test Gmail Relay - Please Reply to This Email');
    console.log('  Reply-To: flowtrackrelay+' + leadId + '@gmail.com\n');

    const result = await relayEmailService.sendEmailToLead(
      workspaceId,
      leadId,
      leadEmail,
      leadName,
      'Test Gmail Relay - Please Reply to This Email',
      `Hi ${leadName},

This is a test email sent through the FlowTrack Gmail Relay system.

**IMPORTANT: Please reply to this email!**

When you reply, your response will be automatically detected by the IMAP polling system and saved to the FlowTrack database. The system will:

1. Detect your reply within 5 minutes (or immediately if polling is triggered manually)
2. Extract the Lead ID from the Reply-To address
3. Save your reply as an INBOUND message
4. Update your lead status to RESPONDED

This demonstrates the complete two-way email sync flow!

Best regards,
FlowTrack Team`,
      undefined, // No HTML body
      'FlowTrack Team',
    );

    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', result.messageId);
    console.log('\n📋 Next Steps:');
    console.log('   1. Check your inbox at', leadEmail);
    console.log('   2. Reply to the email');
    console.log('   3. Wait up to 5 minutes for IMAP polling (or run: npx ts-node test-relay-now.ts)');
    console.log('   4. Check the database for the inbound message');
    console.log('   5. Verify lead status changed to RESPONDED\n');

  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  } finally {
    await app.close();
  }
}

bootstrap();
