// config/firebase.js
const admin = require('firebase-admin');

// Load the Firebase service account key
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // No need for databaseURL for Firestore
});

const db = admin.firestore(); // Firestore database
module.exports = { admin, db };
 