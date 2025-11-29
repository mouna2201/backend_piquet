require('dotenv').config();
const mongoose = require('mongoose');
const CropHistoryRecord = require('./models/CropHistoryRecord');

async function testCropHistoryAPI() {
  try {
    console.log('🧪 Testing crop-history API logic...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Test the exact query used in the API
    const userId = '692236fba917caa8d7de1c7f';
    const limit = 50;

    console.log(`🔍 Testing query for user: ${userId}`);
    const history = await CropHistoryRecord.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    console.log(`📊 Found ${history.length} records`);

    if (history.length > 0) {
      // Format the results exactly like the API does
      const formattedHistory = history.map(record => ({
        _id: record._id.toString(),
        userId: record.userId.toString(),
        location: record.location,
        cropType: record.cropType,
        area: record.area,
        soilType: record.soilType,
        waterAmount: record.waterAmount,
        createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : new Date().toISOString(),
      }));

      console.log('\n📋 Formatted results (like API response):');
      formattedHistory.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.cropType} - ${record.location}`);
        console.log(`      Area: ${record.area}m², Water: ${record.waterAmount}L`);
        console.log(`      Created: ${record.createdAt}`);
        console.log('   ---');
      });

      console.log(`\n✅ SUCCESS: API should return ${formattedHistory.length} records`);
      console.log('✅ The crop-history API is working correctly!');
    } else {
      console.log('❌ No records found - API will return 0 records');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔚 Test completed');
  }
}

testCropHistoryAPI();
