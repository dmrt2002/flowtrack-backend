"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./src/app.module");
const polling_service_1 = require("./src/modules/booking/services/polling.service");
async function pollNow() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    try {
        const pollingService = app.get(polling_service_1.PollingService);
        console.log('\n🔍 Manually triggering Calendly polling...\n');
        console.log('This will fetch all recent Calendly bookings and match them to leads.\n');
        await pollingService.pollAllCalendlyFreeAccounts();
        console.log('\n✅ Polling completed! Check the logs above for details.\n');
        console.log('💡 Run "node verify-booking-detection.js" to see if bookings were detected\n');
    }
    catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    }
    finally {
        await app.close();
    }
}
pollNow();
//# sourceMappingURL=poll-now.js.map