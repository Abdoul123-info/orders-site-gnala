# 🔧 Guide pour corriger l'erreur de déploiement Render

## Étape 1 : Voir les logs d'erreur

1. **Va sur https://dashboard.render.com**
2. **Clique sur le service `orders-site-gnala`** (celui avec "Failed deploy")
3. **Ouvre l'onglet "Logs"** (en haut, à côté de "Events")
4. **Fais défiler vers le bas** pour voir les dernières lignes
5. **Cherche les lignes en rouge** - c'est là que se trouve l'erreur

## Étape 2 : Erreurs courantes et solutions

### ❌ Erreur : "Cannot find module 'xxx'"
**Cause** : Une dépendance manquante dans `package.json`

**Solution** :
```bash
cd orders_site
npm install
git add package.json package-lock.json
git commit -m "Mise à jour dépendances"
git push
```

### ❌ Erreur : "Port 3000 is already in use"
**Cause** : Conflit de port (déjà corrigé dans render.yaml)

**Solution** : Le code utilise déjà `process.env.PORT`, donc pas de problème.

### ❌ Erreur : "SyntaxError" ou erreur JavaScript
**Cause** : Erreur de syntaxe dans le code

**Solution** : Vérifie avec :
```bash
node -c server.js
```

### ❌ Erreur : "Build failed" ou "npm install failed"
**Cause** : Problème lors de l'installation des dépendances

**Solution** : Vérifie que `package.json` est correct et que toutes les dépendances sont valides.

### ❌ Erreur : "Service failed to start"
**Cause** : Le serveur ne démarre pas correctement

**Solution** : Vérifie que `npm start` fonctionne en local.

## Étape 3 : Redéploiement

Une fois l'erreur identifiée et corrigée :

1. **Commit les changements** :
   ```bash
   git add .
   git commit -m "Correction erreur déploiement"
   git push
   ```

2. **Sur Render** :
   - Va dans le service `orders-site-gnala`
   - Clique sur **"Manual Deploy"** (en haut à droite)
   - Sélectionne **"Deploy latest commit"**
   - Attends 2-3 minutes

## Étape 4 : Vérification

Une fois le déploiement terminé :

1. **Vérifie le statut** : Il doit être "Live" (vert)
2. **Teste l'URL** : Va sur `https://orders-site-gnala.onrender.com`
3. **Vérifie les logs** : Plus d'erreurs en rouge

## ⚠️ Important

- **Les logs sont la clé** : Copie-moi les dernières lignes d'erreur pour que je puisse t'aider plus précisément
- **Le premier déploiement peut prendre 2-3 minutes**
- **Sur le plan gratuit, le serveur peut mettre 30 secondes à démarrer après inactivité**

## 📋 Checklist avant déploiement

- [ ] `package.json` contient toutes les dépendances
- [ ] `server.js` n'a pas d'erreur de syntaxe (`node -c server.js`)
- [ ] Le serveur démarre en local (`npm start`)
- [ ] Les variables d'environnement sont définies sur Render (MONGODB_URI, FIREBASE_SERVICE_ACCOUNT_KEY)
- [ ] Le code est poussé sur GitHub

