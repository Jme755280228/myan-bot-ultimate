const admin = require('firebase-admin');

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/^"|"$/g, '').replace(/\\n/g, '\n')
    : undefined,
};

if (!admin.apps.length) {
  try {
    if (serviceAccount.projectId && serviceAccount.privateKey && process.env.FIREBASE_DATABASE_URL) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
      console.log("✅ Firebase connected successfully.");
    }
  } catch (error) {
    console.error("❌ Firebase initialization error:", error.message);
  }
}

module.exports = admin;
