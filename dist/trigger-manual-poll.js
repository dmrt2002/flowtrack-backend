"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./src/app.module");
const polling_service_1 = require("./src/modules/booking/services/polling.service");
async function triggerPoll() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    try {
        const pollingService = app.get(polling_service_1.PollingService);
        console.log('\n🔍 Manually triggering Calendly polling...\n');
        const result = await pollingService.pollAllCalendlyFreeAccounts();
        console.log('\n✅ Polling completed!');
        console.log('Check the database for polling job results.');
        console.log('');
    }
    catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    }
    finally {
        await app.close();
    }
}
triggerPoll();
//# sourceMappingURL=trigger-manual-poll.js.map