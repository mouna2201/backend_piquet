require('dotenv').config();

console.log('🔍 Verifying MongoDB connection string...');
console.log('Current MONGODB_URI:');
console.log(process.env.MONGODB_URI);

// Test the connection
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ SUCCESS! MongoDB Connected!');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
    process.exit(0);
  })
  .catch(err => {
    console.log('❌ STILL FAILED:', err.message);
    console.log('\n🔧 Please check:');
    console.log('1. Your .env file has the EXACT connection string');
    console.log('2. No < > symbols in username/password');
    console.log('3. Database name is included (/piquetDB)');
    process.exit(1);
  });