import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PollingService } from './src/modules/booking/services/polling.service';

async function pollNow() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const pollingService = app.get(PollingService);

    console.log('\n🔍 Manually triggering Calendly polling...\n');
    console.log('This will fetch all recent Calendly bookings and match them to leads.\n');

    await pollingService.pollAllCalendlyFreeAccounts();

    console.log('\n✅ Polling completed! Check the logs above for details.\n');
    console.log('💡 Run "node verify-booking-detection.js" to see if bookings were detected\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await app.close();
  }
}

pollNow();
