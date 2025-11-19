/*
 * Script de réinitialisation complète des données
 * - Supprime les collections Firestore (users, password_reset_tokens)
 * - Supprime toutes les commandes dans MongoDB
 *
 * Usage :
 *   node scripts/reset_data.js
 *
 * Prérequis :
 *   - Variables d'environnement identiques à server.js (Firebase Admin, MONGODB_URI, MONGO_DBNAME)
 *   - Droits Firebase Admin suffisants pour supprimer des documents Firestore
 */

/* eslint-disable no-console */

try {
  require('dotenv').config();
} catch (_) {
  console.warn('⚠️  dotenv non chargé (fichier .env absent ?)');
}

const admin = require('firebase-admin');
const mongoose = require('mongoose');

// --- Initialisation Firebase Admin (même logique que server.js) ---
const initializeFirebaseAdmin = () => {
  if (admin.apps.length) {
    return;
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin initialisé via FIREBASE_SERVICE_ACCOUNT_KEY');
      return;
    } catch (error) {
      console.error('❌ Erreur parsing FIREBASE_SERVICE_ACCOUNT_KEY:', error.message);
    }
  }

  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL
  ) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });
      console.log('✅ Firebase Admin initialisé avec variables individuelles');
      return;
    } catch (error) {
      console.error('❌ Erreur initialisation Firebase Admin (vars individuelles):', error.message);
    }
  }

  try {
    admin.initializeApp();
    console.log('✅ Firebase Admin initialisé avec Application Default Credentials');
  } catch (error) {
    console.error('❌ Impossible d\'initialiser Firebase Admin:', error.message);
    throw error;
  }
};

// --- Connexion Mongo ---
const connectMongo = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('⚠️  MONGODB_URI non défini. La purge Mongo sera ignorée.');
    return null;
  }

  try {
    const connection = await mongoose.connect(uri, {
      dbName: process.env.MONGO_DBNAME || undefined,
    });
    console.log('✅ Connecté à MongoDB');
    return connection;
  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB:', error.message);
    throw error;
  }
};

// --- Purge Firestore (batch <= 500 docs) ---
const purgeCollection = async (collectionName) => {
  const db = admin.firestore();
  const collectionRef = db.collection(collectionName);
  let totalDeleted = 0;

  const deleteBatch = async () => {
    const snapshot = await collectionRef.limit(500).get();
    if (snapshot.empty) {
      return false;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    totalDeleted += snapshot.size;
    return true;
  };

  let hasMore = true;
  while (hasMore) {
    // eslint-disable-next-line no-await-in-loop
    hasMore = await deleteBatch();
  }

  console.log(`🧹 Collection Firestore '${collectionName}' purgée (${totalDeleted} documents supprimés)`);
};

// --- Purge Mongo orders ---
const purgeMongoOrders = async () => {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    console.warn('⚠️  Connexion MongoDB indisponible, purge ignorée');
    return;
  }

  try {
    const { deletedCount } = await mongoose.connection.collection('orders').deleteMany({});
    console.log(`🧹 Collection Mongo 'orders' purgée (${deletedCount} documents supprimés)`);
  } catch (error) {
    console.error('❌ Erreur lors de la suppression des commandes Mongo:', error.message);
    throw error;
  }
};

const main = async () => {
  try {
    initializeFirebaseAdmin();

    const mongoConnection = await connectMongo();

    // Purge des collections Firestore
    await purgeCollection('users').catch((error) => {
      console.error('❌ Erreur purge Firestore users:', error.message);
    });

    await purgeCollection('password_reset_tokens').catch((error) => {
      if (error.code === 5 /* not found */) {
        console.log('ℹ️  Collection password_reset_tokens absente, rien à supprimer');
        return;
      }
      console.error('❌ Erreur purge Firestore password_reset_tokens:', error.message);
    });

    // Purge Mongo
    await purgeMongoOrders().catch((error) => {
      console.error('❌ Erreur purge Mongo orders:', error.message);
    });

    if (mongoConnection) {
      await mongoose.disconnect();
      console.log('🔌 Déconnexion MongoDB');
    }

    console.log('✅ Réinitialisation terminée.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Script interrompu:', error.message);
    process.exit(1);
  }
};

main();

