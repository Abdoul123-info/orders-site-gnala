const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Charger .env en local (sur Render, process.env est déjà fourni)
try { require('dotenv').config(); } catch (_) {}

// Initialiser Firebase Admin SDK
// Option 1: Utiliser les credentials JSON (recommandé pour production)
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin SDK initialisé avec service account');
  } catch (error) {
    console.error('❌ Erreur initialisation Firebase Admin avec service account:', error.message);
  }
} 
// Option 2: Utiliser les variables d'environnement individuelles
else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      })
    });
    console.log('✅ Firebase Admin SDK initialisé avec variables d\'environnement');
  } catch (error) {
    console.error('❌ Erreur initialisation Firebase Admin:', error.message);
  }
} 
// Option 3: Utiliser Application Default Credentials (pour Google Cloud)
else {
  try {
    admin.initializeApp();
    console.log('✅ Firebase Admin SDK initialisé avec Application Default Credentials');
  } catch (error) {
    console.warn('⚠️  Firebase Admin SDK non initialisé. L\'authentification sera désactivée.');
    console.warn('   Pour activer l\'authentification, configurez FIREBASE_SERVICE_ACCOUNT_KEY ou les variables individuelles.');
  }
}

// Gestion des erreurs non catchées pour éviter les crashes (doit être défini tôt)
process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non catchée:', error);
  // Ne pas faire crasher le serveur, juste logger
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejetée non gérée:', reason);
  // Ne pas faire crasher le serveur, juste logger
});

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy pour obtenir la vraie IP (nécessaire sur Render/Railway)
app.set('trust proxy', 1);

// Rate limiting pour les commandes (protection contre le spam)
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Maximum 10 commandes par IP dans la fenêtre de temps
  message: {
    success: false,
    error: 'Trop de requêtes',
    message: 'Trop de commandes envoyées. Veuillez réessayer dans 15 minutes.'
  },
  standardHeaders: true, // Retourne les infos de rate limit dans les headers `RateLimit-*`
  legacyHeaders: false, // Désactive les headers `X-RateLimit-*`
  skip: (req) => {
    // Ne pas limiter les requêtes de healthcheck
    return req.path === '/healthz' || req.path === '/api/stats';
  }
});

// Rate limiting général pour toutes les routes API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Maximum 100 requêtes par IP
  message: {
    success: false,
    error: 'Trop de requêtes',
    message: 'Trop de requêtes envoyées. Veuillez réessayer plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path === '/healthz';
  }
});

// Configuration CORS restrictive
const corsOptions = {
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origine (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Liste des origines autorisées
    const allowedOrigins = [
      'http://localhost:312', // Développement local Flutter web
      'http://localhost:3000', // Développement local serveur
      'https://orders-site-gnala.onrender.com', // Production Render
      // Ajouter d'autres domaines de production si nécessaire
      // 'https://votre-domaine.com',
    ];

    // Vérifier si l'origine est autorisée
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn('⚠️  Tentative d\'accès depuis une origine non autorisée:', origin);
      callback(new Error('Non autorisé par CORS'));
    }
  },
  credentials: true, // Autoriser les cookies/credentials
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['RateLimit-*'], // Exposer les headers de rate limiting
};

// Middleware de sécurité
app.use(helmet()); // Headers de sécurité HTTP
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '2mb' })); // Limite de taille pour éviter les attaques
app.use(express.static('public'));

// Appliquer le rate limiting général sur toutes les routes API
app.use('/api', apiLimiter);

// Connexion MongoDB (persistance des commandes)
const MONGODB_URI = process.env.MONGODB_URI || '';

let mongoReady = false;

if (!MONGODB_URI) {
  console.warn('⚠️  MONGODB_URI non défini. Les commandes ne seront pas persistées.');
  console.warn('   Le serveur continuera de fonctionner sans base de données.');
} else {
  // Connexion MongoDB avec gestion d'erreur robuste
  mongoose
    .connect(MONGODB_URI, { 
      dbName: process.env.MONGO_DBNAME || undefined,
      serverSelectionTimeoutMS: 5000, // Timeout de 5 secondes
      socketTimeoutMS: 45000,
    })
    .then(() => {
      mongoReady = true;
      console.log('✅ Connecté à MongoDB');
    })
    .catch((err) => {
      console.error('❌ Erreur de connexion MongoDB:', err.message);
      console.warn('⚠️  Le serveur continuera de fonctionner sans base de données.');
      console.warn('   Les commandes ne seront pas persistées jusqu\'à ce que MongoDB soit disponible.');
      mongoReady = false;
    });
  
  // Gestion des événements de connexion MongoDB
  mongoose.connection.on('error', (err) => {
    console.error('❌ Erreur MongoDB:', err.message);
    mongoReady = false;
  });
  
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB déconnecté');
    mongoReady = false;
  });
  
  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnecté');
    mongoReady = true;
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

// Fonction de logging de sécurité (sanitize les données sensibles)
const logSecurityEvent = (eventType, details) => {
  const timestamp = new Date().toISOString();
  
  // Sanitizer les données sensibles avant logging
  const sanitized = { ...details };
  if (sanitized.token) delete sanitized.token;
  if (sanitized.password) delete sanitized.password;
  if (sanitized.privateKey) delete sanitized.privateKey;
  if (sanitized.authorization) delete sanitized.authorization;
  // Masquer les données personnelles sensibles dans les logs
  if (sanitized.email) sanitized.email = sanitized.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
  if (sanitized.userPhone) sanitized.userPhone = sanitized.userPhone.replace(/(.{2})(.*)/, '$1***');
  
  const logEntry = {
    timestamp,
    eventType,
    ...sanitized
  };
  
  // Log dans la console avec un préfixe pour faciliter le filtrage
  console.log(`[SECURITY] ${timestamp} - ${eventType}:`, JSON.stringify(logEntry, null, 2));
  
  // Ici, on pourrait aussi envoyer les logs vers un service externe (Sentry, Loggly, etc.)
  // ou les stocker dans MongoDB pour analyse ultérieure
};

// Middleware d'authentification Firebase
const verifyFirebaseToken = async (req, res, next) => {
  // Si Firebase Admin n'est pas initialisé
  if (!admin.apps.length) {
    // En production, refuser plutôt que d'autoriser
    if (process.env.NODE_ENV === 'production' || process.env.RENDER || process.env.RAILWAY_ENVIRONMENT) {
      return res.status(503).json({
        success: false,
        error: 'Service temporairement indisponible',
        message: 'Authentification non configurée'
      });
    }
    // En développement seulement
    console.warn('⚠️  Firebase Admin non initialisé - authentification désactivée (DEV ONLY)');
    return next();
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Token d\'authentification manquant',
      message: 'Veuillez fournir un token Firebase dans le header Authorization: Bearer <token>'
    });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    // Ajouter les informations utilisateur à la requête
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified
    };
    next();
  } catch (error) {
    logSecurityEvent('AUTH_FAILED', {
      clientIp: req.ip || req.connection.remoteAddress,
      error: error.message,
      userAgent: req.get('user-agent') || 'Unknown',
      severity: 'MEDIUM'
    });
    console.error('❌ Erreur vérification token Firebase:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Token invalide ou expiré',
      message: error.message
    });
  }
};

// Middleware pour vérifier le rôle admin
const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Non authentifié',
      message: 'Authentification requise'
    });
  }
  
  // Vérifier dans Firestore si l'utilisateur est admin
  if (!admin.apps.length) {
    // En production, refuser
    if (process.env.NODE_ENV === 'production' || process.env.RENDER || process.env.RAILWAY_ENVIRONMENT) {
      return res.status(503).json({
        success: false,
        error: 'Service temporairement indisponible',
        message: 'Vérification des rôles non disponible'
      });
    }
    // En dev, autoriser
    return next();
  }
  
  try {
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(req.user.uid)
      .get();
    
    const userData = userDoc.exists ? userDoc.data() : null;
    const isAdmin = userData?.role === 'admin' || userData?.isAdmin === true;
    
    if (!isAdmin) {
      logSecurityEvent('UNAUTHORIZED_ADMIN_ACCESS', {
        clientIp: req.ip || req.connection.remoteAddress,
        userId: req.user.uid,
        email: req.user.email,
        userAgent: req.get('user-agent') || 'Unknown',
        severity: 'HIGH'
      });
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
        message: 'Privilèges administrateur requis'
      });
    }
    
    next();
  } catch (error) {
    console.error('❌ Erreur vérification rôle admin:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Erreur vérification des privilèges',
      message: error.message
    });
  }
};

// Middleware pour vérifier que l'utilisateur accède à ses propres données
const requireOwnershipOrAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Non authentifié',
      message: 'Authentification requise'
    });
  }
  
  // Si c'est une requête admin, passer
  if (req.user.isAdmin) {
    return next();
  }
  
  // Sinon, vérifier que l'utilisateur accède à ses propres données
  const requestedUserId = req.params.userId || req.body.userId || req.query.userId;
  
  if (requestedUserId && requestedUserId !== req.user.uid) {
    logSecurityEvent('UNAUTHORIZED_DATA_ACCESS', {
      clientIp: req.ip || req.connection.remoteAddress,
      userId: req.user.uid,
      requestedUserId: requestedUserId,
      userAgent: req.get('user-agent') || 'Unknown',
      severity: 'HIGH'
    });
    return res.status(403).json({
      success: false,
      error: 'Accès refusé',
      message: 'Vous ne pouvez accéder qu\'à vos propres données'
    });
  }
  
  next();
};

// Validation des données de commande
const validateOrder = [
  body('userId')
    .notEmpty()
    .withMessage('userId est requis')
    .isString()
    .withMessage('userId doit être une chaîne de caractères'),
  
  body('userName')
    .notEmpty()
    .withMessage('userName est requis')
    .isString()
    .withMessage('userName doit être une chaîne de caractères')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('userName doit contenir entre 1 et 200 caractères'),
  
  body('userPhone')
    .notEmpty()
    .withMessage('userPhone est requis')
    .isString()
    .withMessage('userPhone doit être une chaîne de caractères')
    .trim(),
  
  body('userEmail')
    .optional()
    .isEmail()
    .withMessage('userEmail doit être une adresse email valide')
    .normalizeEmail(),
  
  body('address')
    .notEmpty()
    .withMessage('address est requis')
    .isString()
    .withMessage('address doit être une chaîne de caractères')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('address doit contenir entre 1 et 500 caractères'),
  
  body('zone')
    .notEmpty()
    .withMessage('zone est requise')
    .isString()
    .withMessage('zone doit être une chaîne de caractères')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('zone doit contenir entre 1 et 200 caractères'),
  
  body('deliveryType')
    .notEmpty()
    .withMessage('deliveryType est requis')
    .isIn(['simple', 'express'])
    .withMessage('deliveryType doit être "simple" ou "express"'),
  
  body('items')
    .isArray({ min: 1, max: 50 })
    .withMessage('items doit être un tableau avec entre 1 et 50 éléments'),
  
  body('items.*.productId')
    .notEmpty()
    .withMessage('productId est requis pour chaque item')
    .isString()
    .withMessage('productId doit être une chaîne de caractères'),
  
  body('items.*.productName')
    .notEmpty()
    .withMessage('productName est requis pour chaque item')
    .isString()
    .withMessage('productName doit être une chaîne de caractères')
    .trim(),
  
  body('items.*.quantity')
    .isInt({ min: 1, max: 1000 })
    .withMessage('quantity doit être un entier entre 1 et 1000'),
  
  body('items.*.price')
    .isFloat({ min: 0 })
    .withMessage('price doit être un nombre positif'),
  
  body('items.*.totalPrice')
    .isFloat({ min: 0 })
    .withMessage('totalPrice doit être un nombre positif'),
  
  body('totalItems')
    .isInt({ min: 1 })
    .withMessage('totalItems doit être un entier positif'),
  
  body('totalPrice')
    .isFloat({ min: 0 })
    .withMessage('totalPrice doit être un nombre positif'),
  
  body('status')
    .optional()
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('status doit être une valeur valide'),
];

// Route pour recevoir les commandes (avec rate limiting spécifique)
app.post('/api/orders', orderLimiter, verifyFirebaseToken, validateOrder, async (req, res) => {
  const requestId = Date.now().toString();
  const clientIp = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('user-agent') || 'Unknown';
  
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logSecurityEvent('VALIDATION_ERROR', {
        requestId,
        clientIp,
        userId: req.body?.userId || 'unknown',
        errors: errors.array(),
        userAgent
      });
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        errors: errors.array()
      });
    }

    // Vérifier que l'utilisateur authentifié correspond au userId dans la commande
    if (req.user && req.body.userId && req.user.uid !== req.body.userId) {
      logSecurityEvent('UNAUTHORIZED_USER_ID_MISMATCH', {
        requestId,
        clientIp,
        tokenUserId: req.user.uid,
        bodyUserId: req.body.userId,
        userAgent,
        severity: 'HIGH'
      });
      return res.status(403).json({
        success: false,
        error: 'Non autorisé',
        message: 'Le userId de la commande ne correspond pas à l\'utilisateur authentifié'
      });
    }

    // Si pas d'authentification (mode dev), utiliser le userId du body
    const userId = req.user ? req.user.uid : (req.body.userId || 'anonymous');

    // Vérifier la cohérence des données
    const calculatedTotalItems = req.body.items.reduce((sum, item) => sum + item.quantity, 0);
    if (calculatedTotalItems !== req.body.totalItems) {
      console.warn('⚠️  Incohérence totalItems:', {
        calculated: calculatedTotalItems,
        received: req.body.totalItems
      });
      return res.status(400).json({
        success: false,
        error: 'Données incohérentes',
        message: 'Le totalItems ne correspond pas à la somme des quantités'
      });
    }

    // Vérifier les prix des produits depuis Firestore
    if (admin.apps.length) {
      try {
        const db = admin.firestore();
        let calculatedTotalPrice = 0;
        const priceMismatches = [];

        for (const item of req.body.items) {
          const productDoc = await db.collection('products').doc(item.productId).get();
          
          if (!productDoc.exists) {
            logSecurityEvent('INVALID_PRODUCT', {
              requestId,
              clientIp,
              userId: userId,
              productId: item.productId,
              productName: item.productName,
              userAgent
            });
            return res.status(400).json({
              success: false,
              error: 'Produit invalide',
              message: `Le produit ${item.productName} (ID: ${item.productId}) n'existe pas`
            });
          }

          const productData = productDoc.data();
          const realPrice = productData.price || 0;
          const itemTotalPrice = realPrice * item.quantity;
          calculatedTotalPrice += itemTotalPrice;

          // Vérifier si le prix envoyé correspond au prix réel
          if (Math.abs(item.price - realPrice) > 0.01) {
            priceMismatches.push({
              productId: item.productId,
              productName: item.productName,
              sentPrice: item.price,
              realPrice: realPrice
            });
          }

          // Vérifier si le totalPrice de l'item correspond
          const calculatedItemTotal = realPrice * item.quantity;
          if (Math.abs(item.totalPrice - calculatedItemTotal) > 0.01) {
            priceMismatches.push({
              productId: item.productId,
              productName: item.productName,
              sentTotalPrice: item.totalPrice,
              calculatedTotalPrice: calculatedItemTotal
            });
          }
        }

        // Vérifier le prix total
        if (Math.abs(req.body.totalPrice - calculatedTotalPrice) > 0.01) {
          logSecurityEvent('PRICE_MANIPULATION_ATTEMPT', {
            requestId,
            clientIp,
            userId: userId,
            sentTotalPrice: req.body.totalPrice,
            calculatedTotalPrice: calculatedTotalPrice,
            difference: Math.abs(req.body.totalPrice - calculatedTotalPrice),
            priceMismatches: priceMismatches,
            userAgent,
            severity: 'HIGH'
          });
          return res.status(400).json({
            success: false,
            error: 'Prix total incorrect',
            message: `Le prix total envoyé (${req.body.totalPrice}) ne correspond pas au prix calculé (${calculatedTotalPrice.toFixed(2)})`,
            details: {
              sentTotalPrice: req.body.totalPrice,
              calculatedTotalPrice: calculatedTotalPrice,
              priceMismatches: priceMismatches
            }
          });
        }

        if (priceMismatches.length > 0) {
          logSecurityEvent('PRICE_MISMATCH_WARNING', {
            requestId,
            clientIp,
            userId: userId,
            priceMismatches: priceMismatches,
            userAgent,
            severity: 'MEDIUM'
          });
          // On accepte quand même mais on log l'anomalie
        }

        console.log('✅ Vérification des prix réussie:', {
          totalPrice: calculatedTotalPrice,
          itemsCount: req.body.items.length
        });
      } catch (firestoreError) {
        console.error('❌ Erreur lors de la vérification des prix Firestore:', firestoreError.message);
        // En cas d'erreur Firestore, on accepte la commande mais on log l'erreur
        // (pour ne pas bloquer les commandes si Firestore est temporairement indisponible)
        console.warn('⚠️  Commande acceptée sans vérification des prix (erreur Firestore)');
      }
    } else {
      console.warn('⚠️  Firebase Admin non initialisé - vérification des prix désactivée');
    }

    const generatedId = Date.now().toString();

    if (!mongoReady) {
      // Fallback temporaire si DB indisponible
      console.error('DB indisponible: commande non persistée');
    }

    let created;
    if (mongoReady) {
      // S'assurer que le userId dans le payload correspond à l'utilisateur authentifié
      const orderPayload = { ...req.body, userId: userId };
      created = await Order.create({ orderId: generatedId, payload: orderPayload });
    }

    // Log de succès
    logSecurityEvent('ORDER_SUCCESS', {
      requestId,
      orderId: generatedId,
      clientIp,
      userId: userId,
      authenticated: !!req.user,
      totalItems: req.body.totalItems,
      totalPrice: req.body.totalPrice,
      itemsCount: req.body.items.length,
      userAgent
    });

    res.status(201).json({
      success: true,
      message: 'Commande enregistrée avec succès',
      orderId: generatedId,
      persisted: Boolean(created),
    });
  } catch (error) {
    logSecurityEvent('ORDER_ERROR', {
      requestId,
      clientIp,
      userId: req.body?.userId || 'unknown',
      error: error.message,
      stack: error.stack,
      userAgent,
      severity: 'HIGH'
    });
    console.error("Erreur lors de l'enregistrement de la commande:", error);
    
    // En production, ne pas exposer les détails de l'erreur
    const errorMessage = (process.env.NODE_ENV === 'production' || process.env.RENDER || process.env.RAILWAY_ENVIRONMENT)
      ? "Erreur lors de l'enregistrement de la commande"
      : error.message;
    
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'enregistrement de la commande",
      error: errorMessage
    });
  }
});

// Route pour récupérer toutes les commandes (admin seulement)
app.get('/api/orders', verifyFirebaseToken, requireAdmin, async (req, res) => {
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
    const errorMessage = (process.env.NODE_ENV === 'production' || process.env.RENDER || process.env.RAILWAY_ENVIRONMENT)
      ? 'Erreur récupération des commandes'
      : e.message;
    res.status(500).json({ success: false, message: errorMessage });
  }
});

// Route pour récupérer une commande par ID (utilisateur propriétaire ou admin)
app.get('/api/orders/:id', verifyFirebaseToken, async (req, res) => {
  try {
    if (!mongoReady) return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    const doc = await Order.findOne({ orderId: req.params.id }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    
    // Vérifier que l'utilisateur est admin ou propriétaire de la commande
    const orderUserId = doc.payload?.userId;
    const isAdmin = req.user.isAdmin || false; // Sera défini par requireAdmin si nécessaire
    
    // Vérifier si admin
    if (!isAdmin && admin.apps.length) {
      try {
        const userDoc = await admin.firestore()
          .collection('users')
          .doc(req.user.uid)
          .get();
        const userData = userDoc.exists ? userDoc.data() : null;
        const userIsAdmin = userData?.role === 'admin' || userData?.isAdmin === true;
        
        if (!userIsAdmin && orderUserId !== req.user.uid) {
          return res.status(403).json({
            success: false,
            error: 'Accès refusé',
            message: 'Vous ne pouvez accéder qu\'à vos propres commandes'
          });
        }
      } catch (checkError) {
        // Si erreur de vérification, refuser par sécurité
        return res.status(403).json({
          success: false,
          error: 'Accès refusé',
          message: 'Impossible de vérifier les permissions'
        });
      }
    }
    
    return res.json({ id: doc.orderId || doc._id.toString(), status: doc.status, receivedAt: doc.receivedAt, ...doc.payload });
  } catch (e) {
    console.error('Erreur get order:', e);
    const errorMessage = (process.env.NODE_ENV === 'production' || process.env.RENDER || process.env.RAILWAY_ENVIRONMENT)
      ? 'Erreur récupération de la commande'
      : e.message;
    res.status(500).json({ success: false, message: errorMessage });
  }
});

// Route pour récupérer l'historique des commandes de l'utilisateur connecté
app.get('/api/my-orders', verifyFirebaseToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    if (!mongoReady) {
      return res.json([]);
    }

    const userId = req.user.uid;
    const orders = await Order.find({ 'payload.userId': userId })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const formatted = orders.map((order) => ({
      id: order.orderId || order._id.toString(),
      status: order.status,
      receivedAt: order.receivedAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      ...order.payload,
    }));

    res.json(formatted);
  } catch (e) {
    console.error('Erreur historique commandes:', e);
    const errorMessage =
      process.env.NODE_ENV === 'production' || process.env.RENDER || process.env.RAILWAY_ENVIRONMENT
        ? 'Erreur récupération historique'
        : e.message;
    res.status(500).json({ success: false, message: errorMessage });
  }
});

// Route pour mettre à jour le statut d'une commande (admin seulement)
app.patch('/api/orders/:id/status', verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    if (!mongoReady) return res.status(503).json({ success: false, message: 'DB indisponible' });
    const status = req.body?.status;
    if (!status) return res.status(400).json({ success: false, message: 'status requis' });
    
    // Valider le statut
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide. Valeurs autorisées: ${validStatuses.join(', ')}`
      });
    }
    
    // Récupérer l'ancien statut avant la mise à jour
    const existing = await Order.findOne({ orderId: req.params.id }).lean();
    if (!existing) return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    const oldStatus = existing.status;
    
    const updated = await Order.findOneAndUpdate(
      { orderId: req.params.id },
      { status },
      { new: true }
    ).lean();
    
    logSecurityEvent('ORDER_STATUS_UPDATED', {
      clientIp: req.ip || req.connection.remoteAddress,
      userId: req.user.uid,
      orderId: req.params.id,
      oldStatus: oldStatus,
      newStatus: status,
      userAgent: req.get('user-agent') || 'Unknown'
    });
    
    res.json({ success: true, order: { id: updated.orderId || updated._id.toString(), status: updated.status, receivedAt: updated.receivedAt, ...updated.payload } });
  } catch (e) {
    console.error('Erreur maj statut:', e);
    const errorMessage = (process.env.NODE_ENV === 'production' || process.env.RENDER || process.env.RAILWAY_ENVIRONMENT)
      ? 'Erreur mise à jour du statut'
      : e.message;
    res.status(500).json({ success: false, message: errorMessage });
  }
});

// Route pour supprimer une commande (admin seulement)
app.delete('/api/orders/:id', verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    if (!mongoReady) return res.status(503).json({ success: false, message: 'DB indisponible' });
    const deleted = await Order.findOneAndDelete({ orderId: req.params.id }).lean();
    if (!deleted) return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    
    logSecurityEvent('ORDER_DELETED', {
      clientIp: req.ip || req.connection.remoteAddress,
      userId: req.user.uid,
      orderId: req.params.id,
      userAgent: req.get('user-agent') || 'Unknown',
      severity: 'HIGH'
    });
    
    res.json({ success: true, message: 'Commande supprimée' });
  } catch (e) {
    console.error('Erreur suppression:', e);
    const errorMessage = (process.env.NODE_ENV === 'production' || process.env.RENDER || process.env.RAILWAY_ENVIRONMENT)
      ? 'Erreur suppression de la commande'
      : e.message;
    res.status(500).json({ success: false, message: errorMessage });
  }
});

// Export JSON simple pour sauvegarde manuelle (admin seulement)
app.get('/api/orders-export.json', verifyFirebaseToken, requireAdmin, async (req, res) => {
  try {
    if (!mongoReady) return res.json([]);
    const docs = await Order.find().sort({ createdAt: -1 }).lean();
    const data = docs.map((d) => ({ id: d.orderId || d._id.toString(), status: d.status, receivedAt: d.receivedAt, ...d.payload }));
    
    logSecurityEvent('ORDERS_EXPORTED', {
      clientIp: req.ip || req.connection.remoteAddress,
      userId: req.user.uid,
      ordersCount: data.length,
      userAgent: req.get('user-agent') || 'Unknown',
      severity: 'MEDIUM'
    });
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="orders-export.json"');
    res.send(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Erreur export:', e);
    const errorMessage = (process.env.NODE_ENV === 'production' || process.env.RENDER || process.env.RAILWAY_ENVIRONMENT)
      ? 'Erreur export'
      : e.message;
    res.status(500).json({ success: false, message: errorMessage });
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
    let ordersCollStats = {};
    try {
      const admin = mongoose.connection.db; // current db
      const stats = await admin.stats(1024 * 1024); // valeurs en Mo
      dbStats = {
        dataSizeMB: stats?.dataSize || 0,
        storageSizeMB: stats?.storageSize || 0,
        collections: stats?.collections || 0,
        indexes: stats?.indexes || 0,
      };
      // Stats précises de la collection orders
      try {
        const coll = await admin.command({ collStats: 'orders', scale: 1024 * 1024 });
        ordersCollStats = {
          ns: coll?.ns,
          count: coll?.count,
          sizeMB: coll?.size || 0,
          storageSizeMB: coll?.storageSize || 0,
          totalIndexSizeMB: coll?.totalIndexSize || 0,
        };
      } catch (e) {
        ordersCollStats = { note: 'collStats indisponible', error: e?.message };
      }
    } catch (e) {
      dbStats = { note: 'stats non disponibles avec ce rôle', error: e?.message };
    }

    res.json({ mongo: true, ordersCount, db: dbStats, ordersCollection: ordersCollStats });
  } catch (e) {
    console.error('Erreur /api/stats:', e);
    const errorMessage = (process.env.NODE_ENV === 'production' || process.env.RENDER || process.env.RAILWAY_ENVIRONMENT)
      ? 'Erreur stats'
      : e.message;
    res.status(500).json({ success: false, message: errorMessage });
  }
});

// Route pour la page d'accueil
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Configuration pour écouter sur toutes les interfaces (0.0.0.0)
// Cela permet l'accès depuis le réseau local ET depuis Internet si déployé
const HOST = process.env.HOST || '0.0.0.0';

// Démarrer le serveur avec gestion d'erreur
try {
  app.listen(PORT, HOST, () => {
    console.log(`✅ Serveur orders_site démarré sur le port ${PORT}`);
    console.log(`📡 Accédez à http://localhost:${PORT} pour voir les commandes`);
    
    if (process.env.RAILWAY_ENVIRONMENT || process.env.RENDER) {
      // Déployé sur Railway ou Render
      const publicUrl = process.env.PUBLIC_URL || process.env.RAILWAY_PUBLIC_DOMAIN || 'Déployé sur cloud';
      console.log(`🌐 Serveur accessible publiquement sur: ${publicUrl}`);
    } else {
      console.log(`🌐 Le serveur écoute sur toutes les interfaces réseau (0.0.0.0)`);
      console.log(`📱 Les appareils Android peuvent se connecter via l'IP locale de cette machine`);
      console.log(`💡 Pour un accès public, utilisez ngrok ou déployez sur Railway/Render`);
    }
    
    console.log(`✅ Serveur prêt à recevoir des requêtes`);
  }).on('error', (error) => {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  });
} catch (error) {
  console.error('❌ Erreur fatale au démarrage:', error);
  process.exit(1);
}




