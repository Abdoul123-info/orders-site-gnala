# Analyse de Sécurité - Serveur Orders Site

**Date:** 2025-01-11  
**Version:** 1.0.0  
**Fichier analysé:** `server.js`

---

## 📊 Résumé Exécutif

Le serveur `orders_site` présente une **architecture de sécurité solide** avec plusieurs mesures de protection en place. Cependant, **plusieurs vulnérabilités critiques** nécessitent une attention immédiate, notamment l'absence d'authentification sur certaines routes sensibles.

**Score de sécurité global:** 6.5/10

---

## ✅ Points Forts (Bonnes Pratiques)

### 1. **Authentification Firebase Admin SDK**
- ✅ Vérification des tokens Firebase ID
- ✅ Extraction et validation des informations utilisateur (uid, email)
- ✅ Gestion gracieuse en cas d'échec d'initialisation

### 2. **Validation des Entrées (express-validator)**
- ✅ Validation complète des champs de commande
- ✅ Vérification des types de données
- ✅ Limitation de longueur des chaînes
- ✅ Validation des emails
- ✅ Vérification des valeurs numériques (quantités, prix)

### 3. **Rate Limiting**
- ✅ Limitation spécifique pour les commandes (10/15min)
- ✅ Limitation générale pour l'API (100/15min)
- ✅ Exclusion des routes de healthcheck

### 4. **Vérification des Prix**
- ✅ Recalcul des prix depuis Firestore
- ✅ Détection des tentatives de manipulation de prix
- ✅ Logging des anomalies de prix

### 5. **CORS Restrictif**
- ✅ Liste blanche d'origines autorisées
- ✅ Méthodes HTTP limitées
- ✅ Headers autorisés restreints

### 6. **Logging de Sécurité**
- ✅ Fonction `logSecurityEvent` pour tracer les événements
- ✅ Logging des tentatives d'authentification échouées
- ✅ Logging des tentatives de manipulation de prix

### 7. **Protection contre les Attaques**
- ✅ Limite de taille du body (2MB)
- ✅ Validation stricte des données
- ✅ Vérification de cohérence (totalItems)

---

## 🔴 Vulnérabilités Critiques

### 1. **Routes Non Protégées (CRITIQUE)**

**Problème:** Les routes suivantes sont accessibles sans authentification :
- `GET /api/orders` - Liste toutes les commandes
- `GET /api/orders/:id` - Récupère une commande spécifique
- `PATCH /api/orders/:id/status` - Modifie le statut d'une commande
- `DELETE /api/orders/:id` - Supprime une commande
- `GET /api/orders-export.json` - Export de toutes les commandes

**Impact:** 
- Accès non autorisé à toutes les données de commandes
- Modification/suppression de commandes par n'importe qui
- Fuite de données personnelles (noms, adresses, téléphones, emails)

**Recommandation:**
```javascript
// Ajouter verifyFirebaseToken sur toutes les routes sensibles
app.get('/api/orders', verifyFirebaseToken, async (req, res) => {
  // Vérifier que l'utilisateur est admin ou propriétaire de la commande
});

app.get('/api/orders/:id', verifyFirebaseToken, async (req, res) => {
  // Vérifier que l'utilisateur est admin ou propriétaire de la commande
});

app.patch('/api/orders/:id/status', verifyFirebaseToken, async (req, res) => {
  // Vérifier que l'utilisateur est admin
});

app.delete('/api/orders/:id', verifyFirebaseToken, async (req, res) => {
  // Vérifier que l'utilisateur est admin
});
```

### 2. **Absence de Contrôle d'Accès Basé sur les Rôles (CRITIQUE)**

**Problème:** Aucune distinction entre utilisateurs normaux et administrateurs.

**Impact:**
- N'importe quel utilisateur authentifié pourrait modifier/supprimer des commandes
- Pas de séparation des privilèges

**Recommandation:**
```javascript
// Middleware pour vérifier le rôle admin
const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  
  // Vérifier dans Firestore si l'utilisateur est admin
  const userDoc = await admin.firestore()
    .collection('users')
    .doc(req.user.uid)
    .get();
  
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé - Admin requis' });
  }
  
  next();
};
```

### 3. **Mode Développement Dangereux (HAUTE)**

**Problème:** Si Firebase Admin n'est pas initialisé, l'authentification est complètement désactivée (lignes 179-183).

**Impact:**
- En production, si la configuration Firebase échoue, le serveur devient vulnérable
- Pas de fail-safe pour forcer l'authentification

**Recommandation:**
```javascript
const verifyFirebaseToken = async (req, res, next) => {
  if (!admin.apps.length) {
    // En production, refuser plutôt que d'autoriser
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        error: 'Service temporairement indisponible',
        message: 'Authentification non configurée'
      });
    }
    // En développement seulement
    console.warn('⚠️  Firebase Admin non initialisé - authentification désactivée (DEV ONLY)');
    return next();
  }
  // ... reste du code
};
```

---

## 🟡 Vulnérabilités Moyennes

### 4. **CORS Permet les Requêtes Sans Origine (MOYENNE)**

**Problème:** Ligne 92-94, les requêtes sans origine sont autorisées.

**Impact:**
- Les applications mobiles natives peuvent contourner CORS
- Risque d'abus si l'API est exposée publiquement

**Recommandation:**
```javascript
origin: function (origin, callback) {
  // En production, refuser les requêtes sans origine
  if (!origin && process.env.NODE_ENV === 'production') {
    return callback(new Error('Origine requise en production'));
  }
  // ... reste du code
}
```

### 5. **Logging des Données Sensibles (MOYENNE)**

**Problème:** Les logs peuvent contenir des informations sensibles (tokens, données utilisateur).

**Impact:**
- Fuite d'informations dans les logs
- Non-conformité RGPD

**Recommandation:**
```javascript
const logSecurityEvent = (eventType, details) => {
  // Sanitizer les données sensibles
  const sanitized = { ...details };
  if (sanitized.token) delete sanitized.token;
  if (sanitized.password) delete sanitized.password;
  // ... log sanitized
};
```

### 6. **Gestion d'Erreurs Trop Verbale (MOYENNE)**

**Problème:** Les messages d'erreur peuvent révéler des informations sur l'infrastructure.

**Impact:**
- Information disclosure
- Aide les attaquants à comprendre l'architecture

**Recommandation:**
```javascript
// En production, messages d'erreur génériques
const errorMessage = process.env.NODE_ENV === 'production' 
  ? 'Une erreur est survenue'
  : error.message;
```

### 7. **Pas de Protection CSRF (MOYENNE)**

**Problème:** Aucune protection contre les attaques Cross-Site Request Forgery.

**Impact:**
- Un site malveillant pourrait forcer un utilisateur authentifié à créer des commandes

**Recommandation:**
```javascript
const csrf = require('csurf');
app.use(csrf({ cookie: true }));
```

### 8. **Export JSON Non Protégé (MOYENNE)**

**Problème:** Route `/api/orders-export.json` accessible sans authentification.

**Impact:**
- Export de toutes les données sans contrôle

**Recommandation:**
```javascript
app.get('/api/orders-export.json', verifyFirebaseToken, requireAdmin, async (req, res) => {
  // ... code existant
});
```

---

## 🟢 Améliorations Recommandées

### 9. **Headers de Sécurité HTTP**

**Recommandation:**
```javascript
const helmet = require('helmet');
app.use(helmet());
```

### 10. **Validation de l'IP Réelle (Derrière Proxy)**

**Problème:** `req.ip` peut ne pas être fiable si le serveur est derrière un proxy.

**Recommandation:**
```javascript
app.set('trust proxy', 1); // Si déployé sur Render/Railway
```

### 11. **Limitation de Taille des Items**

**Problème:** Pas de limite sur le nombre d'items dans une commande.

**Recommandation:**
```javascript
body('items')
  .isArray({ min: 1, max: 50 }) // Limiter à 50 items max
```

### 12. **Sanitization HTML/XSS**

**Problème:** Pas de sanitization des entrées utilisateur.

**Recommandation:**
```javascript
const sanitize = require('mongo-sanitize');
// Avant de sauvegarder dans MongoDB
const sanitizedData = sanitize(req.body);
```

### 13. **Timeout des Requêtes**

**Recommandation:**
```javascript
const timeout = require('connect-timeout');
app.use(timeout('30s'));
```

### 14. **Monitoring et Alertes**

**Recommandation:**
- Intégrer Sentry pour le monitoring d'erreurs
- Alertes automatiques sur les tentatives de manipulation de prix
- Alertes sur les échecs d'authentification répétés

---

## 📋 Checklist de Sécurité

### Authentification & Autorisation
- [ ] Toutes les routes sensibles protégées par `verifyFirebaseToken`
- [ ] Contrôle d'accès basé sur les rôles (admin/user)
- [ ] Vérification que l'utilisateur ne peut accéder qu'à ses propres commandes
- [ ] Mode développement sécurisé (ne pas désactiver l'auth en prod)

### Validation & Sanitization
- [x] Validation complète des entrées (express-validator)
- [ ] Sanitization HTML/XSS
- [ ] Validation du nombre d'items
- [ ] Limite de taille des chaînes

### Protection des Données
- [ ] Chiffrement des données sensibles en transit (HTTPS)
- [ ] Chiffrement des données sensibles au repos
- [ ] Masquage des données dans les logs
- [ ] Conformité RGPD

### Infrastructure
- [ ] Headers de sécurité HTTP (Helmet)
- [ ] Protection CSRF
- [ ] Rate limiting approprié
- [ ] Timeout des requêtes
- [ ] Monitoring et alertes

### Routes Sensibles
- [ ] `GET /api/orders` - Protégée + contrôle d'accès
- [ ] `GET /api/orders/:id` - Protégée + contrôle d'accès
- [ ] `PATCH /api/orders/:id/status` - Protégée + admin seulement
- [ ] `DELETE /api/orders/:id` - Protégée + admin seulement
- [ ] `GET /api/orders-export.json` - Protégée + admin seulement

---

## 🎯 Priorités d'Action

### Priorité 1 (Immédiat)
1. **Protéger toutes les routes GET/PATCH/DELETE avec authentification**
2. **Implémenter le contrôle d'accès basé sur les rôles**
3. **Désactiver le mode développement en production**

### Priorité 2 (Court terme)
4. **Ajouter Helmet pour les headers de sécurité**
5. **Sanitizer les données dans les logs**
6. **Protéger l'export JSON**

### Priorité 3 (Moyen terme)
7. **Protection CSRF**
8. **Monitoring et alertes**
9. **Amélioration de la gestion d'erreurs**

---

## 📚 Références

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)

---

**Note:** Cette analyse est basée sur le code actuel. Des tests de pénétration et une revue de code complète sont recommandés avant la mise en production.

