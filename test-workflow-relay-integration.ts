import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Testing Workflow Email Relay Integration\n');

  try {
    // Find a recent lead with workflow execution
    const recentExecution = await prisma.workflowExecution.findFirst({
      where: {
        status: 'completed',
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        lead: true,
        workflow: true,
      },
      take: 1,
    });

    if (!recentExecution) {
      console.log('❌ No workflow executions found in database');
      console.log('   Please submit a form to trigger a workflow first\n');
      return;
    }

    if (!recentExecution.lead) {
      console.log('❌ Execution has no associated lead');
      return;
    }

    console.log('✅ Found recent workflow execution:');
    console.log('   Execution ID:', recentExecution.id);
    console.log('   Workflow:', recentExecution.workflow.name);
    console.log('   Lead:', recentExecution.lead.name, `(${recentExecution.lead.email})`);
    console.log('   Lead ID:', recentExecution.lead.id);
    console.log('   Status:', recentExecution.status);
    console.log('   Completed At:', recentExecution.completedAt);
    console.log('');

    // Check for messages sent via relay system
    console.log('📧 Checking for relay messages...\n');

    const relayMessages = await prisma.message.findMany({
      where: {
        leadId: recentExecution.lead.id,
      },
      orderBy: {
        sentAt: 'desc',
      },
    });

    if (relayMessages.length === 0) {
      console.log('⚠️  No relay messages found for this lead');
      console.log('   This might be an old execution from before the integration');
      console.log('   Try submitting a new form to test the integration\n');
    } else {
      console.log(`✅ Found ${relayMessages.length} relay message(s):\n`);

      relayMessages.forEach((msg, idx) => {
        console.log(`Message ${idx + 1}:`);
        console.log('  Direction:', msg.direction);
        console.log('  From:', msg.fromEmail);
        console.log('  To:', msg.toEmail);
        console.log('  Subject:', msg.subject);
        console.log('  Sent At:', msg.sentAt);
        console.log('  Message ID:', msg.messageId);
        console.log('');
      });
    }

    // Provide test instructions
    console.log('📋 How to Test Complete Integration:\n');
    console.log('1. Submit a new form at your FlowTrack form URL');
    console.log('2. Wait for workflow to execute (should be immediate)');
    console.log('3. Check the lead\'s email inbox for the workflow email');
    console.log('4. Verify the email has Reply-To: flowtrackrelay+{leadId}@gmail.com');
    console.log('5. Reply to the email');
    console.log('6. Wait up to 5 minutes for IMAP polling');
    console.log('7. Run: npx ts-node verify-relay-message.ts');
    console.log('8. Verify inbound message was saved and lead status updated\n');

    console.log('🔧 Quick Test Commands:\n');
    console.log('  Check for new workflow executions:');
    console.log('    npx ts-node test-workflow-relay-integration.ts');
    console.log('');
    console.log('  Trigger IMAP polling manually:');
    console.log('    npx ts-node test-relay-now.ts');
    console.log('');
    console.log('  Check messages for a specific lead:');
    console.log('    npx ts-node verify-relay-message.ts\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
