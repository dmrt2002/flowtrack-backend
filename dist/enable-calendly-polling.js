"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function enableCalendlyPolling() {
    console.log('🔄 Enabling polling for all Calendly accounts...\n');
    try {
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
            },
        });
        console.log(`Found ${credentials.length} Calendly credential(s):\n`);
        credentials.forEach((cred, idx) => {
            console.log(`${idx + 1}. ${cred.providerEmail}`);
            console.log(`   - Plan: ${cred.providerPlan || 'Not set'}`);
            console.log(`   - Polling Currently: ${cred.pollingEnabled ? 'ENABLED ✅' : 'DISABLED ❌'}`);
            console.log('');
        });
        const result = await prisma.oAuthCredential.updateMany({
            where: {
                providerType: 'CALENDLY',
                isActive: true,
            },
            data: {
                pollingEnabled: true,
            },
        });
        console.log(`✅ Successfully enabled polling for ${result.count} Calendly account(s)\n`);
        const updated = await prisma.oAuthCredential.findMany({
            where: {
                providerType: 'CALENDLY',
                isActive: true,
            },
            select: {
                id: true,
                providerEmail: true,
                pollingEnabled: true,
                providerPlan: true,
            },
        });
        console.log('📊 Updated status:\n');
        updated.forEach((cred, idx) => {
            console.log(`${idx + 1}. ${cred.providerEmail}`);
            console.log(`   - Plan: ${cred.providerPlan || 'Not set'}`);
            console.log(`   - Polling: ${cred.pollingEnabled ? 'ENABLED ✅' : 'DISABLED ❌'}`);
            console.log('');
        });
    }
    catch (error) {
        console.error('❌ Error enabling polling:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
enableCalendlyPolling();
//# sourceMappingURL=enable-calendly-polling.js.map