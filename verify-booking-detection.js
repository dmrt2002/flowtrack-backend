const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyBookingDetection() {
  try {
    console.log('\n📊 Booking Detection & Workflow Status Verification\n');

    const workspace = await prisma.workspace.findUnique({
      where: { slug: 'dmrtushars-workspace' },
    });

    if (!workspace) {
      console.log('❌ Workspace not found');
      return;
    }

    // Check Calendly credentials and polling setup
    const calendlyCredential = await prisma.oAuthCredential.findFirst({
      where: {
        workspaceId: workspace.id,
        providerType: 'CALENDLY',
        isActive: true,
      },
    });

    if (!calendlyCredential) {
      console.log('❌ No Calendly credential found');
      return;
    }

    console.log('='.repeat(80));
    console.log('📅 CALENDLY SETUP');
    console.log('='.repeat(80));
    console.log(`Provider Plan: ${calendlyCredential.providerPlan}`);
    console.log(`Webhook Enabled: ${calendlyCredential.webhookEnabled}`);
    console.log(`Polling Enabled: ${calendlyCredential.pollingEnabled}`);
    console.log(`Last Polling Run: ${calendlyCredential.pollingLastRunAt || 'Never'}`);
    console.log(`Scheduling URL: ${calendlyCredential.metadata?.schedulingUrl || 'Not cached'}`);
    console.log('');

    // Check recent bookings
    const recentBookings = await prisma.booking.findMany({
      where: {
        workspaceId: workspace.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
      include: {
        lead: true,
      },
    });

    console.log('='.repeat(80));
    console.log(`📅 RECENT BOOKINGS (${recentBookings.length} found)`);
    console.log('='.repeat(80));

    if (recentBookings.length === 0) {
      console.log('ℹ️  No bookings found yet');
      console.log('');
      console.log('💡 This could mean:');
      console.log('   1. Booking not completed yet');
      console.log('   2. Polling has not run yet (runs every 15 minutes for FREE, real-time for PRO)');
      console.log('   3. Attribution matching failed (check UTM parameter)');
      console.log('');
    } else {
      recentBookings.forEach((booking, index) => {
        console.log(`\n${index + 1}. Booking ID: ${booking.id}`);
        console.log(`   Lead: ${booking.lead?.email || 'Unknown'} (${booking.lead?.name || 'N/A'})`);
        console.log(`   Event: ${booking.eventName}`);
        console.log(`   Start Time: ${booking.eventStartTime}`);
        console.log(`   Status: ${booking.bookingStatus}`);
        console.log(`   Attribution Method: ${booking.attributionMethod || 'Unknown'}`);
        console.log(`   UTM Content: ${booking.utmContent || 'None'}`);
        console.log(`   Received Via: ${booking.receivedVia}`);
        console.log(`   Created: ${booking.createdAt}`);
      });
      console.log('');
    }

    // Check active workflow executions
    const activeExecutions = await prisma.workflowExecution.findMany({
      where: {
        workspaceId: workspace.id,
        status: {
          in: ['queued', 'running', 'paused'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        lead: true,
        executionSteps: {
          orderBy: { stepNumber: 'asc' },
          include: {
            workflowNode: true,
          },
        },
      },
    });

    console.log('='.repeat(80));
    console.log(`🔄 ACTIVE WORKFLOW EXECUTIONS (${activeExecutions.length} found)`);
    console.log('='.repeat(80));

    if (activeExecutions.length === 0) {
      console.log('✅ No active executions - all workflows completed or stopped');
      console.log('');
    } else {
      activeExecutions.forEach((exec, index) => {
        console.log(`\n${index + 1}. Execution ID: ${exec.id}`);
        console.log(`   Lead: ${exec.lead?.email || 'Unknown'}`);
        console.log(`   Status: ${exec.status}`);
        console.log(`   Started: ${exec.startedAt || 'Not started'}`);
        console.log(`   Created: ${exec.createdAt}`);
        console.log(`   Steps Completed: ${exec.executionSteps.filter(s => s.status === 'completed').length}/${exec.executionSteps.length}`);

        // Show last completed step
        const lastStep = exec.executionSteps
          .filter(s => s.status === 'completed')
          .sort((a, b) => b.stepNumber - a.stepNumber)[0];

        if (lastStep) {
          console.log(`   Last Step: ${lastStep.workflowNode.nodeType} (step ${lastStep.stepNumber})`);
        }

        // Check if lead has booking
        const leadHasBooking = recentBookings.some(b => b.leadId === exec.leadId);
        console.log(`   Lead Has Booking: ${leadHasBooking ? '✅ YES' : '❌ NO'}`);
      });
      console.log('');
    }

    // Check recently completed executions
    const completedExecutions = await prisma.workflowExecution.findMany({
      where: {
        workspaceId: workspace.id,
        status: 'completed',
      },
      orderBy: {
        completedAt: 'desc',
      },
      take: 5,
      include: {
        lead: true,
      },
    });

    console.log('='.repeat(80));
    console.log(`✅ RECENTLY COMPLETED EXECUTIONS (${completedExecutions.length} shown)`);
    console.log('='.repeat(80));

    if (completedExecutions.length === 0) {
      console.log('ℹ️  No completed executions yet');
      console.log('');
    } else {
      completedExecutions.forEach((exec, index) => {
        console.log(`${index + 1}. ${exec.lead?.email || 'Unknown'} - Completed: ${exec.completedAt}`);
      });
      console.log('');
    }

    // Check polling jobs
    const pollingJobs = await prisma.bookingPollingJob.findMany({
      where: {
        oauthCredentialId: calendlyCredential.id,
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: 5,
    });

    console.log('='.repeat(80));
    console.log(`🔍 RECENT POLLING JOBS (${pollingJobs.length} shown)`);
    console.log('='.repeat(80));

    if (pollingJobs.length === 0) {
      console.log('ℹ️  No polling jobs run yet');
      console.log('');
      console.log('💡 Polling schedule:');
      console.log('   - FREE plan: Every 15 minutes (via BullMQ cron)');
      console.log('   - PRO plan: Real-time via webhooks');
      console.log('');
    } else {
      pollingJobs.forEach((job, index) => {
        console.log(`${index + 1}. Started: ${job.startedAt}`);
        console.log(`   Completed: ${job.completedAt || 'In progress'}`);
        console.log(`   Status: ${job.status}`);
        console.log(`   Events Fetched: ${job.eventsFetched || 0}`);
        console.log(`   Events Created: ${job.eventsCreated || 0}`);
        if (job.errorMessage) {
          console.log(`   Error: ${job.errorMessage}`);
        }
        console.log('');
      });
    }

    // Recommendations
    console.log('='.repeat(80));
    console.log('💡 NEXT STEPS');
    console.log('='.repeat(80));

    if (recentBookings.length === 0) {
      console.log('\n📅 Waiting for booking to be detected:');
      console.log('');
      if (calendlyCredential.providerPlan === 'PRO' && calendlyCredential.webhookEnabled) {
        console.log('   ✅ You have PRO plan with webhooks enabled');
        console.log('   → Bookings should appear in real-time (within seconds)');
        console.log('');
        console.log('   If booking is not detected:');
        console.log('   1. Check webhook is registered in Calendly dashboard');
        console.log('   2. Check backend logs for webhook events');
        console.log('   3. Verify UTM parameter was included in booking URL');
      } else {
        console.log('   ⏰ Polling-based detection (FREE plan)');
        console.log('   → Polling runs every 15 minutes');
        console.log(`   → Last run: ${calendlyCredential.pollingLastRunAt || 'Never'}`);
        console.log('');
        console.log('   Wait for next polling cycle or check:');
        console.log('   - Backend logs for "[PollingService] Polling Calendly..."');
        console.log('   - Database: SELECT * FROM booking_polling_jobs ORDER BY started_at DESC LIMIT 5;');
      }
    } else {
      console.log('\n✅ Bookings detected! Checking if workflow stopped:');
      console.log('');

      // Check if any active executions should have stopped
      const executionsWithBookings = activeExecutions.filter(exec =>
        recentBookings.some(b => b.leadId === exec.leadId)
      );

      if (executionsWithBookings.length > 0) {
        console.log('   ⚠️  Found active executions for leads with bookings:');
        executionsWithBookings.forEach(exec => {
          console.log(`   - ${exec.lead?.email}: Status = ${exec.status}`);
        });
        console.log('');
        console.log('   This means:');
        console.log('   1. Workflow is paused (waiting for delay)');
        console.log('   2. Next condition check will detect booking');
        console.log('   3. Workflow will stop (no more follow-ups)');
        console.log('');
        console.log('   Wait for the delayed job to run, then re-run this script');
      } else {
        console.log('   ✅ All leads with bookings have completed/stopped workflows');
        console.log('   → Automation working correctly!');
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyBookingDetection();
