/*
 * Script de vérification du nombre de commandes dans MongoDB
 * Usage : node scripts/check_orders_count.js
 */

try {
  require('dotenv').config();
} catch (_) {
  console.warn('⚠️  dotenv non chargé');
}

const mongoose = require('mongoose');

const checkOrders = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI non défini');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      dbName: process.env.MONGO_DBNAME || undefined,
    });
    console.log('✅ Connecté à MongoDB');

    const count = await mongoose.connection.collection('orders').countDocuments({});
    console.log(`\n📊 Nombre de commandes dans MongoDB: ${count}`);

    if (count === 0) {
      console.log('✅ La base de données est vide (purge réussie)');
    } else {
      console.log(`⚠️  Il reste ${count} commande(s) dans la base de données`);
    }

    await mongoose.disconnect();
    console.log('🔌 Déconnexion MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
};

checkOrders();


