// Script de test pour vérifier que le serveur peut démarrer
console.log('🧪 Test de démarrage du serveur...');

// Simuler les variables d'environnement Render
process.env.PORT = process.env.PORT || 3000;
process.env.NODE_ENV = 'production';
process.env.RENDER = 'true';

// Tester les imports
try {
  console.log('✅ Test imports...');
  require('express');
  require('cors');
  require('body-parser');
  require('mongoose');
  require('firebase-admin');
  require('express-validator');
  require('express-rate-limit');
  require('helmet');
  console.log('✅ Tous les imports réussis');
} catch (error) {
  console.error('❌ Erreur import:', error.message);
  process.exit(1);
}

// Tester le chargement du serveur
try {
  console.log('✅ Test chargement server.js...');
  require('./server.js');
  console.log('✅ server.js chargé avec succès');
  // Attendre 2 secondes pour voir si le serveur démarre
  setTimeout(() => {
    console.log('✅ Test terminé - le serveur devrait être démarré');
    process.exit(0);
  }, 2000);
} catch (error) {
  console.error('❌ Erreur chargement server.js:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
}

