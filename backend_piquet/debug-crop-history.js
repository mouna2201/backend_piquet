require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const CropHistoryRecord = require('./models/CropHistoryRecord');

async function debugCropHistory() {
  try {
    console.log('🔍 Debugging crop-history issue...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check if user exists
    const userId = '692236fba917caa8d7de1c7f';
    console.log(`\n🔍 Checking user with ID: ${userId}`);
    
    let user;
    try {
      user = await User.findById(userId);
      if (user) {
        console.log('✅ User found:');
        console.log(`   ID: ${user._id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Role: ${user.role}`);
      } else {
        console.log('❌ User not found with this ID');
        
        // Try to find user by other means
        const allUsers = await User.find({});
        console.log(`\n📊 Found ${allUsers.length} users in database:`);
        allUsers.forEach(u => {
          console.log(`   ID: ${u._id}, Email: ${u.email}, Name: ${u.name}`);
        });
      }
    } catch (error) {
      console.log('❌ Error finding user:', error.message);
    }

    // Check all crop history records
    console.log('\n🔍 Checking all crop history records...');
    const allRecords = await CropHistoryRecord.find({});
    console.log(`📊 Total crop history records: ${allRecords.length}`);
    
    if (allRecords.length > 0) {
      console.log('\n📋 All records:');
      allRecords.forEach(record => {
        console.log(`   ID: ${record._id}`);
        console.log(`   User ID: ${record.userId}`);
        console.log(`   Location: ${record.location}`);
        console.log(`   Crop Type: ${record.cropType}`);
        console.log(`   Created: ${record.createdAt}`);
        console.log('   ---');
      });
    }

    // Check records for specific user
    if (user) {
      console.log(`\n🔍 Checking crop history for user ${userId}...`);
      const userRecords = await CropHistoryRecord.find({ userId });
      console.log(`📊 Records for user ${userId}: ${userRecords.length}`);
      
      // Also try with ObjectId
      const ObjectId = mongoose.Types.ObjectId;
      const userRecordsObjId = await CropHistoryRecord.find({ userId: new ObjectId(userId) });
      console.log(`📊 Records for user ${userId} (ObjectId): ${userRecordsObjId.length}`);
    }

    // Check database indexes
    console.log('\n🔍 Checking CropHistoryRecord indexes...');
    const indexes = await CropHistoryRecord.collection.getIndexes();
    console.log('Indexes:', Object.keys(indexes));

  } catch (error) {
    console.error('❌ Debug error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔚 Debug session completed');
  }
}

debugCropHistory();
