require('dotenv').config();
const mongoose = require('mongoose');
const CropHistoryRecord = require('./models/CropHistoryRecord');

async function clearTestData() {
  try {
    console.log('🗑️ Suppression des données de test...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connecté à MongoDB');

    // Delete all crop history records
    const result = await CropHistoryRecord.deleteMany({});
    console.log(`🗑️ ${result.deletedCount} enregistrements d'historique supprimés`);

  } catch (error) {
    console.error('❌ Erreur suppression:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔚 Suppression terminée');
  }
}

clearTestData();
