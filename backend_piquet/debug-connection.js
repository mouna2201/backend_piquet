require('dotenv').config();

console.log('🔍 Debugging MongoDB connection...');
console.log('Full connection string:');
console.log(process.env.MONGODB_URI);

// Extract parts to verify
const uri = process.env.MONGODB_URI;
if (uri) {
    const match = uri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
    if (match) {
        console.log('\n✅ Correct format detected:');
        console.log('Username:', match[1]);
        console.log('Password: [HIDDEN]');
        console.log('Host:', match[3]);
        console.log('Database:', match[4]);
    } else {
        console.log('\n❌ INCORRECT FORMAT - Missing database name?');
        console.log('Should be: mongodb+srv://username:password@host/DATABASE_NAME?options');
    }
}