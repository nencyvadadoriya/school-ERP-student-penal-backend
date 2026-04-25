try {
  console.log('Loading backend server...');
  const app = require('../backend/server');
  console.log('Backend server loaded successfully.');
  module.exports = app;
} catch (error) {
  console.error('CRITICAL ERROR during function initialization:', error);
  // Re-throw to ensure Vercel sees the failure but with logs
  throw error;
}
