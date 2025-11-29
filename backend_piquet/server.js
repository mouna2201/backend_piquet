require('dotenv').config();
const mqtt = require('mqtt');
const mongoose = require('mongoose');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const Capteur = require('./models/Capteur');
const User = require('./models/User');
const usersRouter = require('./routes/users');

// Secret JWT (à mettre dans .env)
const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_super_securise_changez_moi';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Connexion MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connecté à MongoDB Atlas - Base: soil data');
  } catch (error) {
    console.error('❌ Erreur connexion MongoDB:', error.message);
    console.log('🔧 SOLUTION: Allez sur MongoDB Atlas → Network Access → Add your current IP address');
    process.exit(1);
  }
};
connectDB();

// Initialisation Express
const app = express();

// CORS
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(express.json());

// Routes utilisateurs (listing, filtrage par rôle, etc.)
app.use('/api', usersRouter);

// ==================== MIDDLEWARE D'AUTHENTIFICATION ====================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ message: 'Token manquant. Accès refusé.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        message: 'Token invalide ou expiré',
        error: err.message,
      });
    }

    req.user = decoded;
    next();
  });
};

// ==================== ROUTES D'AUTHENTIFICATION ====================

// 1. INSCRIPTION
app.post('/api/users/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et password sont requis' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
    });

    await newUser.save();

    const token = jwt.sign(
      {
        userId: newUser._id,
        email: newUser.email,
        role: newUser.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    console.log(`✅ Nouvel utilisateur inscrit: ${newUser.name}`);

    return res.status(201).json({
      message: 'Inscription réussie',
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('❌ Erreur inscription:', error.message);
    return res.status(500).json({
      message: 'Erreur du serveur',
      error: error.message,
    });
  }
});

// 2. CONNEXION
app.post('/api/users/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    // il faut au moins password + (email OU username)
    if ((!email && !username) || !password) {
      return res
        .status(400)
        .json({ message: 'Email ou nom utilisateur et password sont requis' });
    }

    // On cherche par email si fourni, sinon par "name" (nom d'utilisateur)
    let query;
    if (email) {
      query = { email };
    } else {
      // si ton schéma a un champ "username", remplace par { username }
      query = { name: username };
    }

    const user = await User.findOne(query);
    if (!user) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    console.log(`✅ Connexion réussie: ${user.email || user.name}`);

    return res.status(200).json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('❌ Erreur login:', error.message);
    return res.status(500).json({
      message: 'Erreur du serveur',
      error: error.message,
    });
  }
});

// 3. VÉRIFIER LE TOKEN
app.get('/api/users/verify', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    return res.json({
      message: 'Token valide',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Erreur du serveur',
      error: error.message,
    });
  }
});

// 4. REFRESH TOKEN
app.post('/api/users/refresh-token', authenticateToken, (req, res) => {
  try {
    const newToken = jwt.sign(
      {
        userId: req.user.userId,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    return res.json({
      message: 'Token rafraîchi',
      token: newToken,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Erreur lors du rafraîchissement',
      error: error.message,
    });
  }
});

// ==================== PROFIL AGRICULTEUR ====================

// GET - Profil agriculteur connecté (superviseur)
app.get('/api/farmer/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      'parcelLocation soilType crops areaM2 hasCompletedFarmerForm',
    );

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    return res.json({
      parcelLocation: user.parcelLocation || '',
      soilType: user.soilType || '',
      crops: user.crops || [],
      areaM2: user.areaM2 || 0,
      hasCompletedFarmerForm: user.hasCompletedFarmerForm === true,
    });
  } catch (error) {
    console.error('❌ Erreur GET /api/farmer/profile:', error.message);
    return res.status(500).json({
      message: 'Erreur du serveur',
      error: error.message,
    });
  }
});

// *NOUVELLE ROUTE* - Profil agriculteur par ID (pour admin)
app.get('/api/farmer/profile/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select(
      'parcelLocation soilType crops areaM2 hasCompletedFarmerForm',
    );

    if (!user) {
      return res.status(404).json({ message: 'Fermier non trouvé' });
    }

    return res.json({
      parcelLocation: user.parcelLocation || '',
      soilType: user.soilType || '',
      crops: user.crops || [],
      areaM2: user.areaM2 || 0,
      hasCompletedFarmerForm: user.hasCompletedFarmerForm === true,
    });
  } catch (error) {
    console.error('❌ Erreur GET /api/farmer/profile/:id:', error.message);
    return res.status(500).json({
      message: 'Erreur du serveur',
      error: error.message,
    });
  }
});

// PUT - Mise à jour du profil agriculteur connecté
app.put('/api/farmer/profile', authenticateToken, async (req, res) => {
  try {
    const { parcelLocation, soilType, crops, areaM2 } = req.body;

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    user.parcelLocation = parcelLocation ?? user.parcelLocation;
    user.soilType = soilType ?? user.soilType;
    user.crops = Array.isArray(crops) ? crops : user.crops;
    user.areaM2 = typeof areaM2 === 'number' ? areaM2 : user.areaM2;
    user.hasCompletedFarmerForm = true;

    await user.save();

    return res.json({
      message: 'Profil fermier mis à jour',
      parcelLocation: user.parcelLocation,
      soilType: user.soilType,
      crops: user.crops,
      areaM2: user.areaM2,
      hasCompletedFarmerForm: user.hasCompletedFarmerForm,
    });
  } catch (error) {
    console.error('❌ Erreur PUT /api/farmer/profile:', error.message);
    return res.status(500).json({
      message: 'Erreur du serveur',
      error: error.message,
    });
  }
});

// ==================== ROUTES CAPTEURS ====================

app.get('/api/capteurs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const deviceId = req.query.device_id;

    const query = {};
    if (deviceId) {
      query.device_id = deviceId;
    }

    const capteurs = await Capteur.find(query)
      .sort({ timestamp_mesure: -1 })
      .limit(limit);

    return res.json({
      message: 'Données récupérées',
      count: capteurs.length,
      data: capteurs,
    });
  } catch (error) {
    console.error('❌ Erreur récupération capteurs:', error.message);
    return res.status(500).json({
      message: 'Erreur du serveur',
      error: error.message,
    });
  }
});

app.get('/api/capteurs/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;

    const capteurs = await Capteur.find({ device_id: deviceId })
      .sort({ timestamp_mesure: -1 })
      .limit(limit);

    if (capteurs.length === 0) {
      return res.status(404).json({
        message: `Aucune donnée trouvée pour le capteur ${deviceId}`,
      });
    }

    return res.json({
      message: 'Données récupérées',
      device_id: deviceId,
      count: capteurs.length,
      data: capteurs,
    });
  } catch (error) {
    console.error('❌ Erreur récupération capteur:', error.message);
    return res.status(500).json({
      message: 'Erreur du serveur',
      error: error.message,
    });
  }
});

app.delete('/api/capteurs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCapteur = await Capteur.findByIdAndDelete(id);

    if (!deletedCapteur) {
      return res.status(404).json({ message: 'Données non trouvées' });
    }

    console.log(`🗑  Données supprimées par ${req.user.email || req.user.userId}: ${id}`);

    return res.json({
      message: 'Données supprimées avec succès',
      deleted: deletedCapteur,
    });
  } catch (error) {
    console.error('❌ Erreur suppression:', error.message);
    return res.status(500).json({
      message: 'Erreur du serveur',
      error: error.message,
    });
  }
});

// ==================== MQTT ====================
const client = mqtt.connect({
  host: process.env.HIVE_MQ_HOST,
  port: process.env.HIVE_MQ_PORT,
  username: process.env.HIVE_MQ_USERNAME,
  password: process.env.HIVE_MQ_PASSWORD,
  protocol: 'mqtts',
  rejectUnauthorized: false,
  clientId: 'server-' + Math.random().toString(16).substr(2, 8),
});

client.on('connect', () => {
  console.log('✅ Connecté à HiveMQ Cloud');

  const topics = ['farm/soil1'];

  topics.forEach((topic) => {
    client.subscribe(topic, { qos: 1 }, (err) => {
      if (!err) {
        console.log(`📡 Souscrit à: ${topic}`);
      }
    });
  });
});

client.on('message', async (topic, message) => {
  const messageStr = message.toString();
  console.log(`\n📨 Message reçu [${topic}]: ${messageStr}`);

  try {
    let data;

    if (isNodeRedTest(topic, messageStr)) {
      await handleNodeRedTest(topic, messageStr);
      return;
    }

    try {
      data = JSON.parse(messageStr);
    } catch (jsonError) {
      data = parseSimpleMessage(messageStr, topic);
    }

    await processAndSaveData(topic, data);
  } catch (error) {
    console.error('❌ Erreur traitement:', error.message);
  }
});

function isNodeRedTest(topic, message) {
  if (topic.includes('node-red') || topic.includes('test') || topic.includes('simulation')) {
    return true;
  }

  const messageStr = message.toString().toLowerCase();
  if (
    messageStr.includes('test') ||
    messageStr.includes('simulation') ||
    messageStr.includes('mock') ||
    messageStr.includes('fake') ||
    /^\d+$/.test(messageStr.trim())
  ) {
    return true;
  }

  return false;
}

async function handleNodeRedTest(topic, message) {
  console.log('🔴 DÉTECTION TEST NODE-RED');

  const messageStr = message.toString();
  const deviceId = extractDeviceId(topic);

  const testData = {
    device_id: deviceId || 'node-red-test',
    source: 'node-red',
    is_simulation: true,
    timestamp: new Date(),
    raw_message: messageStr,
    valeur_test: null,
  };

  const numberMatch = messageStr.match(/(\d+(?:\.\d+)?)/);
  if (numberMatch) {
    const numericValue = parseFloat(numberMatch[1]);
    testData.valeur_test = numericValue;

    if (numericValue >= -50 && numericValue <= 100) {
      testData.temperature = numericValue;
      console.log(`🌡  Température simulée: ${numericValue}°C`);
    } else if (numericValue >= 0 && numericValue <= 100) {
      testData.humidite = numericValue;
      console.log(`💧 Humidité simulée: ${numericValue}%`);
    } else {
      console.log(`🔢 Valeur numérique de test: ${numericValue}`);
    }
  }

  try {
    const documentTest = new Capteur({
      device_id: testData.device_id,
      temperature: testData.temperature,
      humidite: testData.humidite,
      is_simulation: true,
      source_type: 'node-red',
      timestamp_mesure: new Date(),
      raw_data: testData,
      notes: 'Données de test depuis Node-RED',
    });

    const savedData = await documentTest.save();
    console.log(`💾 Données de test sauvegardées - Device: ${testData.device_id}`);
    console.log(`   🆔 ID: ${savedData._id}`);
    console.log('   📍 Source: Node-RED (Simulation)');

    publishTestConfirmation(testData.device_id, savedData._id, testData.valeur_test);
  } catch (error) {
    console.error('❌ Erreur sauvegarde test:', error.message);
  }
}

function publishTestConfirmation(deviceId, mongoId, value) {
  const testValue = value !== null && value !== undefined ? value : 'unknown';

  const confirmTopic = `piquet/agricole/test/${deviceId}/confirm`;
  const confirmMessage = JSON.stringify({
    status: 'test_received',
    device_id: deviceId,
    mongo_id: mongoId,
    value: testValue,
    type: 'simulation',
    timestamp: new Date(),
    message: 'Test Node-RED reçu et stocké avec succès',
  });

  client.publish(confirmTopic, confirmMessage, { qos: 1 }, (err) => {
    if (!err) {
      console.log(`   ✅ Confirmation envoyée sur: ${confirmTopic}`);
    }
  });
}

function parseSimpleMessage(message, topic) {
  console.log(`🔧 Parsing message simple: "${message}"`);

  const result = {
    device_id: extractDeviceId(topic),
    timestamp: new Date(),
    is_simulation: false,
  };

  const tempMatch = message.match(/(\d+(?:\.\d+)?)\s*°?\s*[cC]/);
  if (tempMatch) {
    result.temperature = parseFloat(tempMatch[1]);
    console.log(`🌡  Température détectée: ${result.temperature}°C`);
  }

  const humidityMatch = message.match(/(\d+(?:\.\d+)?)\s*%?/);
  if (humidityMatch && !tempMatch) {
    result.humidite = parseFloat(humidityMatch[1]);
    console.log(`💧 Humidité détectée: ${result.humidite}%`);
  }

  const soilMoistureMatch = message
    .toLowerCase()
    .match(/(\d+(?:\.\d+)?)\s*%.soil|soil.(\d+(?:\.\d+)?)\s*%/);
  if (soilMoistureMatch) {
    result.humidite_sol = parseFloat(soilMoistureMatch[1] || soilMoistureMatch[2]);
    console.log(`🌱 Humidité sol détectée: ${result.humidite_sol}%`);
  }

  if (!result.temperature && !result.humidite && !result.humidite_sol) {
    result.raw_value = message;
    console.log(`📝 Valeur brute stockée: ${message}`);
  }

  return result;
}

function extractDeviceId(topic) {
  const parts = topic.split('/');

  if (topic.startsWith('farm/')) {
    return parts[1];
  }

  if (topic.startsWith('soil/')) {
    return `soil_${parts[1] || 'sensor'}`;
  }

  if (topic.includes('capteurs/')) {
    const capteurIndex = parts.indexOf('capteurs');
    return parts[capteurIndex + 1];
  }

  if (topic.includes('node-red/')) {
    return parts[1] || 'node-red-inject';
  }

  return parts[parts.length - 1];
}

async function processAndSaveData(topic, data) {
  try {
    const deviceId = data.device_id || extractDeviceId(topic);

    if (!deviceId) {
      throw new Error('Device ID non trouvé');
    }

    const documentCapteur = new Capteur({
      device_id: deviceId,
      humidite: data.humidite || data.humidity,
      humidite_sol: data.humidite_sol || data.soil_moisture || data.moisture,
      temperature: data.temperature || data.temp,
      temperature_sol: data.temperature_sol || data.soil_temp,
      pression: data.pression || data.pressure,
      latitude: data.latitude,
      longitude: data.longitude,
      batterie: data.batterie || data.battery,
      is_simulation: data.is_simulation || false,
      source_type: data.source || 'capteur_reel',
      timestamp_mesure: data.timestamp ? new Date(data.timestamp) : new Date(),
      raw_data: data,
    });

    if (
      documentCapteur.temperature === undefined &&
      documentCapteur.humidite === undefined &&
      documentCapteur.humidite_sol === undefined
    ) {
      console.log('⚠  Aucune donnée de capteur valide, sauvegarde raw_data seulement');
    }

    const savedData = await documentCapteur.save();

    const sourceType = documentCapteur.is_simulation ? 'SIMULATION' : 'CAPTEUR RÉEL';
    console.log(`💾 Données sauvegardées dans "soil data" - Device: ${deviceId} (${sourceType})`);
    if (savedData.temperature) console.log(`   🌡  Température air: ${savedData.temperature}°C`);
    if (savedData.temperature_sol)
      console.log(`   🌡  Température sol: ${savedData.temperature_sol}°C`);
    if (savedData.humidite) console.log(`   💧 Humidité air: ${savedData.humidite}%`);
    if (savedData.humidite_sol) console.log(`   🌱 Humidité sol: ${savedData.humidite_sol}%`);
    console.log(`   🆔 ID: ${savedData._id}`);
  } catch (error) {
    console.error('❌ Erreur sauvegarde MongoDB:', error.message);
    throw error;
  }
}

client.on('error', (err) => {
  console.error('❌ Erreur MQTT:', err);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Erreur MongoDB:', err);
});

mongoose.connection.on('connected', () => {
  console.log('🗄  Base de données: soil data');
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Arrêt du service...');
  client.end();
  await mongoose.connection.close();
  process.exit(0);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 API HTTP démarrée sur le port ${PORT}`);
  console.log('🔒 Authentification JWT activée (utilisateurs, suppression, etc.)');
  console.log('🌐 Routes capteurs GET rendues publiques pour le front Flutter');
  console.log('🔴 Mode test Node-RED activé');
  console.log('🗄  Service MQTT → MongoDB actif');
  console.log('🗄  Base de données: soil data');

  console.log('\n📋 Routes disponibles:');
  console.log('   POST   /api/users/register         - Inscription');
  console.log('   POST   /api/users/login            - Connexion');
  console.log('   GET    /api/users/verify           - Vérifier token');
  console.log('   POST   /api/users/refresh-token    - Rafraîchir token');
  console.log('   GET    /api/farmer/profile         - Profil fermier connecté');
  console.log('   GET    /api/farmer/profile/:id     - Profil fermier par ID (admin)');
  console.log('   PUT    /api/farmer/profile         - MAJ profil fermier connecté');
  console.log('   GET    /api/capteurs               - Liste capteurs (PUBLIC)');
  console.log('   GET    /api/capteurs/:deviceId     - Capteur spécifique (PUBLIC)');
  console.log('   DELETE /api/capteurs/:id           - Supprimer données (PROTÉGÉ)');
});
