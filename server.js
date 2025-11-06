const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');

// Charger .env en local (sur Render, process.env est déjà fourni)
try { require('dotenv').config(); } catch (_) {}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Connexion MongoDB (persistance des commandes)
const MONGODB_URI = process.env.MONGODB_URI || '';

let mongoReady = false;

if (!MONGODB_URI) {
  console.warn('⚠️  MONGODB_URI non défini. Les commandes ne seront pas persistées.');
} else {
  mongoose
    .connect(MONGODB_URI, { dbName: process.env.MONGO_DBNAME || undefined })
    .then(() => {
      mongoReady = true;
      console.log('✅ Connecté à MongoDB');
    })
    .catch((err) => {
      console.error('❌ Erreur de connexion MongoDB:', err.message);
    });
}

// Modèle Order (structure flexible pour accepter tout payload actuel)
const orderSchema = new mongoose.Schema(
  {
    // Identifiant lisible (en plus de _id)
    orderId: { type: String, index: true },
    // Données brutes de la commande venant du client
    payload: { type: Object, required: true },
    status: { type: String, default: 'pending', index: true },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

// Route pour recevoir les commandes
app.post('/api/orders', async (req, res) => {
  try {
    const generatedId = Date.now().toString();

    if (!mongoReady) {
      // Fallback temporaire si DB indisponible
      console.error('DB indisponible: commande non persistée');
    }

    let created;
    if (mongoReady) {
      created = await Order.create({ orderId: generatedId, payload: req.body });
    }

    console.log('Nouvelle commande reçue:', {
      orderId: generatedId,
      payloadKeys: Object.keys(req.body || {}),
    });

    res.status(201).json({
      success: true,
      message: 'Commande enregistrée avec succès',
      orderId: generatedId,
      persisted: Boolean(created),
    });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la commande:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'enregistrement de la commande",
    });
  }
});

// Route pour récupérer toutes les commandes
app.get('/api/orders', async (req, res) => {
  try {
    if (!mongoReady) return res.json([]);
    const docs = await Order.find().sort({ createdAt: -1 }).lean();
    res.json(
      docs.map((d) => ({
        id: d.orderId || d._id.toString(),
        status: d.status,
        receivedAt: d.receivedAt,
        ...d.payload,
      }))
    );
  } catch (e) {
    console.error('Erreur list orders:', e);
    res.status(500).json({ message: 'Erreur récupération des commandes' });
  }
});

// Route pour récupérer une commande par ID
app.get('/api/orders/:id', async (req, res) => {
  try {
    if (!mongoReady) return res.status(404).json({ message: 'Commande non trouvée' });
    const doc = await Order.findOne({ orderId: req.params.id }).lean();
    if (!doc) return res.status(404).json({ message: 'Commande non trouvée' });
    return res.json({ id: doc.orderId || doc._id.toString(), status: doc.status, receivedAt: doc.receivedAt, ...doc.payload });
  } catch (e) {
    console.error('Erreur get order:', e);
    res.status(500).json({ message: 'Erreur récupération de la commande' });
  }
});

// Route pour mettre à jour le statut d'une commande
app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    if (!mongoReady) return res.status(503).json({ message: 'DB indisponible' });
    const status = req.body?.status;
    if (!status) return res.status(400).json({ message: 'status requis' });
    const updated = await Order.findOneAndUpdate(
      { orderId: req.params.id },
      { status },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ message: 'Commande non trouvée' });
    res.json({ success: true, order: { id: updated.orderId || updated._id.toString(), status: updated.status, receivedAt: updated.receivedAt, ...updated.payload } });
  } catch (e) {
    console.error('Erreur maj statut:', e);
    res.status(500).json({ message: 'Erreur mise à jour du statut' });
  }
});

// Route pour supprimer une commande
app.delete('/api/orders/:id', async (req, res) => {
  try {
    if (!mongoReady) return res.status(503).json({ message: 'DB indisponible' });
    const deleted = await Order.findOneAndDelete({ orderId: req.params.id }).lean();
    if (!deleted) return res.status(404).json({ message: 'Commande non trouvée' });
    res.json({ success: true, message: 'Commande supprimée' });
  } catch (e) {
    console.error('Erreur suppression:', e);
    res.status(500).json({ message: 'Erreur suppression de la commande' });
  }
});

// Export JSON simple pour sauvegarde manuelle
app.get('/api/orders-export.json', async (req, res) => {
  try {
    if (!mongoReady) return res.json([]);
    const docs = await Order.find().sort({ createdAt: -1 }).lean();
    const data = docs.map((d) => ({ id: d.orderId || d._id.toString(), status: d.status, receivedAt: d.receivedAt, ...d.payload }));
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="orders-export.json"');
    res.send(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Erreur export:', e);
    res.status(500).json({ message: 'Erreur export' });
  }
});

// Healthcheck pour supervision
app.get('/healthz', (req, res) => {
  res.json({ ok: true, mongo: mongoReady });
});

// Statistiques simples: nombre de commandes et taille estimée de la base
app.get('/api/stats', async (req, res) => {
  try {
    if (!mongoReady) return res.json({ mongo: false });

    const ordersCount = await Order.estimatedDocumentCount();
    // Stats DB (peut nécessiter des droits suffisants)
    let dbStats = {};
    try {
      const admin = mongoose.connection.db; // current db
      const stats = await admin.stats(1024 * 1024); // valeurs en Mo
      dbStats = {
        dataSizeMB: stats?.dataSize || 0,
        storageSizeMB: stats?.storageSize || 0,
        collections: stats?.collections || 0,
        indexes: stats?.indexes || 0,
      };
    } catch (e) {
      dbStats = { note: 'stats non disponibles avec ce rôle', error: e?.message };
    }

    res.json({ mongo: true, ordersCount, db: dbStats });
  } catch (e) {
    console.error('Erreur /api/stats:', e);
    res.status(500).json({ message: 'Erreur stats' });
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




