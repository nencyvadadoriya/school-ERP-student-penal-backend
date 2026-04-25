const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const setupFirebase = () => {
  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '../config/serviceAccountKey.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath))
      });
      console.log('Firebase Admin SDK initialized');
    } else {
      console.warn('Firebase service account key not found at:', serviceAccountPath, '. Push notifications will not work via Firebase.');
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error.message);
  }
};

const sendFirebaseNotification = async (tokens, payload) => {
  if (!tokens || tokens.length === 0) return;
  
  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data || {},
    tokens: Array.isArray(tokens) ? tokens : [tokens],
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    console.log(`${response.successCount} messages were sent successfully`);
    
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });
      console.log('List of tokens that caused failures: ' + failedTokens);
    }
    return response;
  } catch (error) {
    console.error('Error sending Firebase notification:', error);
    throw error;
  }
};

module.exports = {
  setupFirebase,
  sendFirebaseNotification
};
