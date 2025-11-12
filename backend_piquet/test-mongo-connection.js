require('dotenv').config();
const mongoose = require('mongoose');

console.log('🧪 Testing MongoDB connection...');
console.log('Connecting to:', process.env.MONGODB_URI?.replace(/mongodb\+srv:\/\/([^:]+):([^@]+)@/, 'mongodb+srv://USERNAME:PASSWORD@')); // Hide password in logs

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully!');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
    console.log('🎯 Next: Now run your main server with: node server.js');
    process.exit(0);
  })
  .catch(err => {
    console.log('❌ MongoDB Connection Failed:');
    console.log('Error:', err.message);
    console.log('\n🔧 SOLUTION:');
    console.log('1. Go to MongoDB Atlas → Network Access');
    console.log('2. Click "Add IP Address"');
    console.log('3. Add: 0.0.0.0/0 (for testing)');
    console.log('4. Wait 2 minutes, then try again');
    process.exit(1);
  });