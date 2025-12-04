const { Test } = require('@nestjs/testing');
const { SalesPitchModule } = require('./dist/src/modules/sales-pitch/sales-pitch.module');

async function testModule() {
  try {
    console.log('Creating test module...');
    const moduleRef = await Test.createTestingModule({
      imports: [SalesPitchModule],
    }).compile();

    console.log('✅ Module compiled successfully!');
    console.log('✅ All dependencies resolved correctly');

    await moduleRef.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Module test failed:', error.message);
    process.exit(1);
  }
}

testModule();
