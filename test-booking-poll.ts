import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PollingService } from './src/modules/booking/services/polling.service';
import { PrismaService } from './src/prisma/prisma.service';

/**
 * Manual test script to trigger Calendly booking polling
 * Run with: npx ts-node test-booking-poll.ts
 */
async function testBookingPoll() {
  console.log('🚀 Starting manual booking poll test...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const pollingService = app.get(PollingService);
  const prisma = app.get(PrismaService);

  try {
    // Check for Calendly credentials
    const credentials = await prisma.oAuthCredential.findMany({
      where: {
        providerType: 'CALENDLY',
        isActive: true,
      },
      select: {
        id: true,
        providerEmail: true,
        pollingEnabled: true,
        providerPlan: true,
        workspaceId: true,
        pollingLastRunAt: true,
      },
    });

    console.log(`📋 Found ${credentials.length} Calendly credential(s):\n`);
    credentials.forEach((cred, idx) => {
      console.log(`${idx + 1}. ${cred.providerEmail}`);
      console.log(`   - ID: ${cred.id}`);
      console.log(`   - Workspace: ${cred.workspaceId}`);
      console.log(`   - Plan: ${cred.providerPlan || 'Not set'}`);
      console.log(`   - Polling Enabled: ${cred.pollingEnabled}`);
      console.log(`   - Last Run: ${cred.pollingLastRunAt || 'Never'}`);
      console.log('');
    });

    if (credentials.length === 0) {
      console.log('❌ No Calendly credentials found. Please connect Calendly first.');
      await app.close();
      return;
    }

    // Check for recent polling jobs
    console.log('📊 Recent polling jobs:\n');
    const recentJobs = await prisma.bookingPollingJob.findMany({
      orderBy: { startedAt: 'desc' },
      take: 5,
      include: {
        oauthCredential: {
          select: {
            providerEmail: true,
          },
        },
      },
    });

    if (recentJobs.length > 0) {
      recentJobs.forEach((job, idx) => {
        console.log(
          `${idx + 1}. ${job.oauthCredential.providerEmail} - ${job.status}`,
        );
        console.log(`   Started: ${job.startedAt.toISOString()}`);
        if (job.completedAt) {
          console.log(`   Completed: ${job.completedAt.toISOString()}`);
        }
        if (job.eventsFetched !== null) {
          console.log(`   Fetched: ${job.eventsFetched} events`);
          console.log(`   Created: ${job.eventsCreated} | Updated: ${job.eventsUpdated}`);
        }
        if (job.errorMessage) {
          console.log(`   Error: ${job.errorMessage}`);
        }
        console.log('');
      });
    } else {
      console.log('No polling jobs found yet.\n');
    }

    // Trigger polling for FREE accounts
    console.log('🔄 Triggering polling for Calendly FREE accounts...\n');
    await pollingService.pollAllCalendlyFreeAccounts();

    // Check results
    console.log('\n✅ Polling completed! Checking results...\n');

    const latestJobs = await prisma.bookingPollingJob.findMany({
      orderBy: { startedAt: 'desc' },
      take: 3,
      include: {
        oauthCredential: {
          select: {
            providerEmail: true,
          },
        },
      },
    });

    console.log('📈 Latest polling results:\n');
    latestJobs.forEach((job, idx) => {
      console.log(
        `${idx + 1}. ${job.oauthCredential.providerEmail} - ${job.status}`,
      );
      console.log(`   Started: ${job.startedAt.toISOString()}`);
      if (job.completedAt) {
        console.log(`   Duration: ${job.durationMs}ms`);
      }
      if (job.eventsFetched !== null) {
        console.log(`   📥 Fetched: ${job.eventsFetched} events`);
        console.log(`   ✨ Created: ${job.eventsCreated} new bookings`);
        console.log(`   🔄 Updated: ${job.eventsUpdated} existing bookings`);
      }
      if (job.errorMessage) {
        console.log(`   ❌ Error: ${job.errorMessage}`);
      }
      console.log('');
    });

    // Show recent bookings
    const recentBookings = await prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        lead: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (recentBookings.length > 0) {
      console.log('📅 Recent bookings in database:\n');
      recentBookings.forEach((booking: any, idx: number) => {
        console.log(`${idx + 1}. ${booking.lead.name} (${booking.lead.email})`);
        console.log(`   Provider: ${booking.providerType}`);
        console.log(`   Event: ${booking.eventName}`);
        console.log(`   Start: ${booking.eventStartTime?.toISOString()}`);
        console.log(`   Status: ${booking.bookingStatus}`);
        console.log(`   Created: ${booking.createdAt.toISOString()}`);
        console.log('');
      });
    } else {
      console.log('📅 No bookings found in database yet.\n');
    }
  } catch (error) {
    console.error('❌ Error during polling test:', error);
  } finally {
    await app.close();
    console.log('👋 Test completed!');
  }
}

testBookingPoll();
