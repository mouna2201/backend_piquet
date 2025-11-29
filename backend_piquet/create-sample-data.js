require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const CropHistoryRecord = require('./models/CropHistoryRecord');

async function createSampleData() {
  try {
    console.log('🌱 Creating sample crop history data...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Get the user
    const userId = '692236fba917caa8d7de1c7f';
    const user = await User.findById(userId);
    
    if (!user) {
      console.log('❌ User not found. Cannot create sample data.');
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);

    // Sample crop history records
    const sampleRecords = [
      {
        userId: userId,
        location: 'Nord Parcelle A',
        cropType: 'Blé',
        area: 2500,
        soilType: 'Argileux',
        waterAmount: 15000,
        createdAt: new Date('2024-01-15')
      },
      {
        userId: userId,
        location: 'Sud Parcelle B',
        cropType: 'Maïs',
        area: 3200,
        soilType: 'Sableux',
        waterAmount: 22000,
        createdAt: new Date('2024-02-20')
      },
      {
        userId: userId,
        location: 'Est Parcelle C',
        cropType: 'Tournesol',
        area: 1800,
        soilType: 'Limoneux',
        waterAmount: 12000,
        createdAt: new Date('2024-03-10')
      },
      {
        userId: userId,
        location: 'Ouest Parcelle D',
        cropType: 'Orge',
        area: 2100,
        soilType: 'Argileux',
        waterAmount: 18000,
        createdAt: new Date('2024-04-05')
      },
      {
        userId: userId,
        location: 'Centre Parcelle E',
        cropType: 'Pommes de terre',
        area: 1500,
        soilType: 'Sableux',
        waterAmount: 25000,
        createdAt: new Date('2024-05-12')
      }
    ];

    // Insert the records
    const insertedRecords = await CropHistoryRecord.insertMany(sampleRecords);
    
    console.log(`\n✅ Successfully created ${insertedRecords.length} crop history records:`);
    insertedRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.cropType} - ${record.location} (${record.area}m²)`);
    });

    // Verify the records were created
    const userRecords = await CropHistoryRecord.find({ userId }).sort({ createdAt: -1 });
    console.log(`\n📊 Verification: User now has ${userRecords.length} crop history records`);

  } catch (error) {
    console.error('❌ Error creating sample data:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔚 Sample data creation completed');
  }
}

createSampleData();
