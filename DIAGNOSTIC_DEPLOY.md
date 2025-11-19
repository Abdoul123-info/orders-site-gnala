# 🔍 Diagnostic des erreurs de déploiement Render

## Étapes pour voir l'erreur

1. **Va sur https://dashboard.render.com**
2. **Clique sur le service `orders-site-gnala`**
3. **Ouvre l'onglet "Logs"** (en haut de la page)
4. **Regarde les dernières lignes** - l'erreur sera en rouge

## Erreurs courantes et solutions

### ❌ "Cannot find module 'xxx'"
**Solution** : Vérifie que toutes les dépendances sont dans `package.json`

### ❌ "Port already in use" ou "EADDRINUSE"
**Solution** : Le serveur doit utiliser `process.env.PORT` (Render le définit automatiquement)

### ❌ "MongoDB connection failed"
**Solution** : Vérifie que la variable `MONGODB_URI` est bien définie dans Render

### ❌ "Firebase Admin SDK initialization failed"
**Solution** : Vérifie que `FIREBASE_SERVICE_ACCOUNT_KEY` est bien défini dans Render

### ❌ "SyntaxError" ou erreur de syntaxe
**Solution** : Vérifie le code avec `node -c server.js` en local

## Redéploiement manuel

1. Dans le dashboard Render, clique sur **"Manual Deploy"**
2. Sélectionne **"Deploy latest commit"**
3. Attends 2-3 minutes

## Vérification rapide

Pour tester en local avant de déployer :
```bash
npm install
node server.js
```

Si ça fonctionne en local, le problème vient probablement des variables d'environnement sur Render.

