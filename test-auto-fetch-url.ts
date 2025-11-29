import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { OAuthService } from './src/modules/oauth/oauth.service';

async function testAutoFetchUrl() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const oauthService = app.get(OAuthService);

    console.log('\n🔍 Testing Automatic Calendly URL Fetching with Token Refresh\n');
    console.log('Workspace: dmrtushars-workspace');
    console.log('This will:');
    console.log('1. Check if scheduling URL is cached');
    console.log('2. If not, refresh expired token automatically');
    console.log('3. Fetch scheduling URL from Calendly API');
    console.log('4. Cache it in metadata\n');

    const workspaceId = '8592d2ed-1d31-46d7-9c65-99aecd0de8d4';

    const schedulingUrl = await oauthService.getCalendlyLink(workspaceId);

    if (schedulingUrl) {
      console.log('\n✅ SUCCESS!');
      console.log(`Scheduling URL: ${schedulingUrl}\n`);
    } else {
      console.log('\n❌ FAILED to get scheduling URL\n');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await app.close();
  }
}

testAutoFetchUrl();
