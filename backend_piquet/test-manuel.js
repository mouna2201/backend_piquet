require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const CropHistoryRecord = require('./models/CropHistoryRecord');

async function testWithRealServer() {
  try {
    console.log('🧪 Test avec le vrai serveur...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connecté à MongoDB');

    // Vérifier l'état initial
    const userId = '692236fba917caa8d7de1c7f';
    const user = await User.findById(userId);
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return;
    }

    console.log(`✅ Utilisateur: ${user.name}`);
    console.log(`📋 Cultures actuelles: ${JSON.stringify(user.crops)}`);

    // Vérifier l'historique actuel
    const currentHistory = await CropHistoryRecord.find({ userId });
    console.log(`📊 Historique actuel: ${currentHistory.length} enregistrements`);

    console.log('\n📝 Instructions pour tester manuellement:');
    console.log('1. Démarrez le serveur: npm start');
    console.log('2. Connectez-vous avec l\'utilisateur hoho@farmer.local');
    console.log('3. Mettez à jour le profil fermier avec de nouvelles cultures');
    console.log('4. Vérifiez que l\'historique s\'enregistre automatiquement');
    
    console.log('\n🔧 Exemple de requête curl:');
    console.log(`curl -X PUT http://localhost:3000/api/farmer/profile \\`);
    console.log(`  -H "Authorization: Bearer VOTRE_TOKEN" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{`);
    console.log(`    "parcelLocation": "Nouvelle Parcelle",`);
    console.log(`    "soilType": "Argileux",`);
    console.log(`    "crops": ["Blé", "Maïs", "Tournesol"],`);
    console.log(`    "areaM2": 1000`);
    console.log(`  }'`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔚 Test préparé');
  }
}

testWithRealServer();
