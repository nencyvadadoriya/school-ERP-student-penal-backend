// Vercel serverless entry point
const connectDB = require('../backend/config/database');

let app;
let isConnected = false;

try {
  console.log('Loading backend server...');
  app = require('../backend/server');
  console.log('Backend server loaded successfully.');
} catch (error) {
  console.error('CRITICAL ERROR during function initialization:', error);
  module.exports = (req, res) => {
    res.status(500).json({
      success: false,
      message: 'Server initialization failed',
      error: error.message,
    });
  };
  return;
}

module.exports = async (req, res) => {
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
    } catch (err) {
      console.error('Database connection failed:', err);
      return res.status(500).json({
        success: false,
        message: 'Database connection failed',
        error: err.message,
      });
    }
  }
  return app(req, res);
};
