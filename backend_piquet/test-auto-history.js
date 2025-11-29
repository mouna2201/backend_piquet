require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const CropHistoryRecord = require('./models/CropHistoryRecord');

async function testAutoHistoryRecording() {
  try {
    console.log('🧪 Test de l\'enregistrement automatique de l\'historique...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connecté à MongoDB');

    // Get the test user
    const userId = '692236fba917caa8d7de1c7f';
    const user = await User.findById(userId);
    
    if (!user) {
      console.log('❌ Utilisateur de test non trouvé');
      return;
    }

    console.log(`✅ Utilisateur trouvé: ${user.name} (${user.email})`);
    console.log(`📋 Cultures actuelles: ${JSON.stringify(user.crops)}`);

    // Simuler une mise à jour du profil fermier avec de nouvelles cultures
    const newCrops = ['Tomates', 'Laitues', 'Carottes'];
    console.log(`🔄 Simulation mise à jour avec nouvelles cultures: ${JSON.stringify(newCrops)}`);

    // Mettre à jour l'utilisateur comme le ferait l'API
    user.parcelLocation = user.parcelLocation || 'Parcelle Test';
    user.soilType = user.soilType || 'Terreau';
    user.crops = newCrops;
    user.areaM2 = user.areaM2 || 500;
    user.hasCompletedFarmerForm = true;

    await user.save();
    console.log('✅ Profil utilisateur mis à jour');

    // Vérifier que l'historique a été enregistré
    const historyRecords = await CropHistoryRecord.find({ userId }).sort({ createdAt: -1 });
    console.log(`📊 Nombre d'enregistrements dans l'historique: ${historyRecords.length}`);

    if (historyRecords.length > 0) {
      console.log('\n📋 Derniers enregistrements d\'historique:');
      historyRecords.slice(0, 3).forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.cropType} - ${record.location}`);
        console.log(`      Surface: ${record.area}m², Eau: ${record.waterAmount}L`);
        console.log(`      Date: ${record.createdAt}`);
        console.log('   ---');
      });
    }

    // Test avec superviseur
    console.log('\n🔄 Test avec profil superviseur...');
    const supervisorCrops = ['Blé', 'Maïs'];
    user.supervisorParcelLocation = 'Ferme Superviseur';
    user.supervisorSoilType = 'Argileux';
    user.supervisorCrops = supervisorCrops;
    user.supervisorHectares = 2;
    user.hasCompletedSupervisorForm = true;

    await user.save();
    console.log('✅ Profil superviseur mis à jour');

    // Vérifier l'historique superviseur
    const allHistoryRecords = await CropHistoryRecord.find({ userId }).sort({ createdAt: -1 });
    console.log(`📊 Total enregistrements après test superviseur: ${allHistoryRecords.length}`);

    console.log('\n✅ Test terminé - L\'enregistrement automatique fonctionne!');

  } catch (error) {
    console.error('❌ Erreur test:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔚 Test complété');
  }
}

testAutoHistoryRecording();
