const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Stockage en mémoire des commandes (en production, utilisez une base de données)
let orders = [];

// Route pour recevoir les commandes
app.post('/api/orders', (req, res) => {
  try {
    const order = {
      id: Date.now().toString(),
      ...req.body,
      receivedAt: new Date().toISOString()
    };
    
    orders.push(order);
    console.log('Nouvelle commande reçue:', order);
    
    res.status(201).json({ 
      success: true, 
      message: 'Commande enregistrée avec succès',
      orderId: order.id
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la commande:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'enregistrement de la commande' 
    });
  }
});

// Route pour récupérer toutes les commandes
app.get('/api/orders', (req, res) => {
  res.json(orders);
});

// Route pour récupérer une commande par ID
app.get('/api/orders/:id', (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (order) {
    res.json(order);
  } else {
    res.status(404).json({ message: 'Commande non trouvée' });
  }
});

// Route pour mettre à jour le statut d'une commande
app.patch('/api/orders/:id/status', (req, res) => {
  const orderIndex = orders.findIndex(o => o.id === req.params.id);
  if (orderIndex !== -1) {
    orders[orderIndex].status = req.body.status;
    res.json({ success: true, order: orders[orderIndex] });
  } else {
    res.status(404).json({ message: 'Commande non trouvée' });
  }
});

// Route pour supprimer une commande
app.delete('/api/orders/:id', (req, res) => {
  const orderIndex = orders.findIndex(o => o.id === req.params.id);
  if (orderIndex !== -1) {
    orders.splice(orderIndex, 1);
    res.json({ success: true, message: 'Commande supprimée' });
  } else {
    res.status(404).json({ message: 'Commande non trouvée' });
  }
});

// Route pour la page d'accueil
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Configuration pour écouter sur toutes les interfaces (0.0.0.0)
// Cela permet l'accès depuis le réseau local ET depuis Internet si déployé
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Serveur orders_site démarré sur le port ${PORT}`);
  console.log(`Accédez à http://localhost:${PORT} pour voir les commandes`);
  
  if (process.env.RAILWAY_ENVIRONMENT || process.env.RENDER) {
    // Déployé sur Railway ou Render
    const publicUrl = process.env.PUBLIC_URL || process.env.RAILWAY_PUBLIC_DOMAIN || 'Déployé sur cloud';
    console.log(`🌐 Serveur accessible publiquement sur: ${publicUrl}`);
  } else {
    console.log(`Le serveur écoute sur toutes les interfaces réseau (0.0.0.0)`);
    console.log(`Les appareils Android peuvent se connecter via l'IP locale de cette machine`);
    console.log(`💡 Pour un accès public, utilisez ngrok ou déployez sur Railway/Render`);
  }
});




