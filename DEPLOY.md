# Guide de déploiement - Orders Site

Ce guide explique comment déployer le serveur orders_site pour qu'il soit accessible publiquement sur Internet.

## Options de déploiement

### Option 1: ngrok (Rapide - Pour tests)

**Avantages:** Rapide à configurer, gratuit pour les tests
**Inconvénients:** URL change à chaque redémarrage (gratuit), nécessite que votre ordinateur soit allumé

1. Téléchargez ngrok: https://ngrok.com/download
2. Installez ngrok
3. Démarrez le serveur: `node server.js`
4. Dans un nouveau terminal: `ngrok http 3000`
5. Copiez l'URL HTTPS (ex: `https://abc123.ngrok.io`)
6. Mettez à jour l'URL dans `gnala_cosmetic/lib/config/server_config.dart`

**Script automatique:** `.\start-ngrok.ps1`

### Option 2: Railway (Recommandé - Gratuit)

**Avantages:** Gratuit, URL permanente, facile à configurer

1. Créez un compte sur https://railway.app
2. Installez Railway CLI: `npm i -g @railway/cli`
3. Connectez-vous: `railway login`
4. Dans le dossier orders_site: `railway init`
5. Déployez: `railway up`
6. Railway vous donnera une URL permanente (ex: `https://orders-site-production.up.railway.app`)
7. Mettez à jour l'URL dans l'app Flutter

### Option 3: Render (Gratuit)

**Avantages:** Gratuit, URL permanente, interface web simple

1. Créez un compte sur https://render.com
2. Créez un nouveau "Web Service"
3. Connectez votre dépôt GitHub ou uploadez les fichiers
4. Configuration:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Déployez et obtenez votre URL (ex: `https://orders-site.onrender.com`)
6. Mettez à jour l'URL dans l'app Flutter

### Option 4: Vercel

**Avantages:** Très rapide, gratuit, excellent pour les apps Node.js

1. Créez un compte sur https://vercel.com
2. Installez Vercel CLI: `npm i -g vercel`
3. Dans le dossier orders_site: `vercel`
4. Suivez les instructions
5. Obtenez votre URL (ex: `https://orders-site.vercel.app`)

### Option 5: Heroku (Gratuit avec limitations)

1. Créez un compte sur https://heroku.com
2. Installez Heroku CLI
3. Créez une app: `heroku create orders-site-gnala`
4. Déployez: `git push heroku main`
5. Obtenez votre URL (ex: `https://orders-site-gnala.herokuapp.com`)

## Mise à jour de l'application Flutter

Après avoir déployé le serveur, mettez à jour l'URL dans:

`gnala_cosmetic/lib/config/server_config.dart`

Remplacez:
```dart
static const String localServerIP = '192.168.1.137';
```

Par votre URL publique (sans http://):
```dart
static const String serverUrl = 'https://votre-url.com';
```

Et modifiez `baseUrl` pour utiliser cette URL directement.

## Important

- Les commandes sont stockées en mémoire (perdues au redémarrage)
- Pour la production, considérez ajouter une base de données (MongoDB, PostgreSQL)
- Assurez-vous que CORS est configuré pour accepter les requêtes de votre app Flutter


