const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const setupFirebase = () => {
  try {
    if (admin.apps.length) return; // Already initialized

    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '../config/serviceAccountKey.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath))
      });
      console.log('Firebase Admin SDK initialized');
    } else if (process.env.FIREBASE_PROJECT_ID) {
      // Initialize from env variables if file doesn't exist
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        })
      });
      console.log('Firebase Admin SDK initialized via Environment Variables');
    } else {
      console.warn('Firebase credentials not found. Push notifications will not work.');
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
