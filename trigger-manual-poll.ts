import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PollingService } from './src/modules/booking/services/polling.service';

async function triggerPoll() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const pollingService = app.get(PollingService);

    console.log('\n🔍 Manually triggering Calendly polling...\n');

    const result = await pollingService.pollAllCalendlyFreeAccounts();

    console.log('\n✅ Polling completed!');
    console.log('Check the database for polling job results.');
    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await app.close();
  }
}

triggerPoll();
