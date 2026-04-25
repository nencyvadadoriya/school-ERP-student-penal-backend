const mongoose = require('mongoose');
require('dotenv').config();

let uri = process.env.MONGODB_URI;

// Fallback: allow providing creds separately to avoid issues with special characters
if (!uri && process.env.MONGO_USER && process.env.MONGO_PASS && (process.env.MONGO_HOST || process.env.MONGODB_HOST)) {
  const user = encodeURIComponent(process.env.MONGO_USER);
  const pass = encodeURIComponent(process.env.MONGO_PASS);
  const host = process.env.MONGO_HOST || process.env.MONGODB_HOST;
  const dbName = process.env.MONGO_DB || process.env.MONGODB_DB || 'admin';
  uri = `mongodb+srv://${user}:${pass}@${host}/${dbName}?retryWrites=true&w=majority`;
}

const connectDB = async () => {
  if (!uri) {
    console.error('❌ MongoDB connection string is not defined.');
    return; // Don't exit in serverless
  }

  try {
    if (mongoose.connection.readyState >= 1) return;
    
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    // Don't exit process in Vercel functions
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  Mongoose disconnected from MongoDB');
});

module.exports = connectDB;
