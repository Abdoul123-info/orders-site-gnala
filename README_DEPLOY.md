# 🚀 Guide de déploiement Render - Dépannage

## ✅ Vérifications avant déploiement

1. **Le serveur démarre en local** :
   ```bash
   npm install
   npm start
   ```

2. **Toutes les dépendances sont dans package.json** :
   - express
   - cors
   - body-parser
   - mongoose
   - firebase-admin
   - express-validator
   - express-rate-limit
   - helmet

## 🔍 Si le déploiement échoue sur Render

### Étape 1 : Voir les logs détaillés

1. Va sur https://dashboard.render.com
2. Clique sur le service `orders-site-gnala`
3. Va dans l'onglet **"Logs"** (en haut)
4. Fais défiler vers le bas
5. **Copie les 30-50 dernières lignes** et envoie-les

### Étape 2 : Vérifier les variables d'environnement

Sur Render, dans les paramètres du service, vérifie que ces variables sont définies (optionnel) :

- `MONGODB_URI` - Optionnel, le serveur fonctionne sans
- `FIREBASE_SERVICE_ACCOUNT_KEY` - Optionnel, l'authentification sera désactivée sans
- `NODE_ENV` - Défini automatiquement par render.yaml

### Étape 3 : Vérifier la configuration Render

Dans les paramètres du service sur Render :

- **Build Command** : `npm install`
- **Start Command** : `npm start`
- **Environment** : `Node`
- **Plan** : Free (ou ton plan)

### Erreurs courantes

#### ❌ "Cannot find module 'xxx'"
**Solution** : Vérifie que toutes les dépendances sont dans `package.json` et que `npm install` s'exécute correctement.

#### ❌ "Port already in use"
**Solution** : Le code utilise `process.env.PORT` qui est défini automatiquement par Render.

#### ❌ "Exited with status 1"
**Solution** : Voir les logs détaillés pour identifier l'erreur exacte. Peut être :
- Erreur de syntaxe (mais testé en local, donc peu probable)
- Problème avec les variables d'environnement
- Problème avec les dépendances lors du build

## 📋 Checklist de déploiement

- [ ] Le serveur démarre en local (`npm start`)
- [ ] Toutes les dépendances sont dans `package.json`
- [ ] Le code est poussé sur GitHub
- [ ] Render est connecté au dépôt GitHub
- [ ] Les variables d'environnement sont définies (optionnel)
- [ ] Le build command est `npm install`
- [ ] Le start command est `npm start`

## 🔧 Test local avant déploiement

```bash
# Installer les dépendances
npm install

# Tester le démarrage
node server.js

# Ou utiliser le script de test
node test-start.js
```

Si tout fonctionne en local mais pas sur Render, le problème vient probablement de :
- La configuration Render
- Les variables d'environnement
- Le processus de build sur Render

