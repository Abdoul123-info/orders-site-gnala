# 🚀 Déploiement Final sur Render

Ton code est maintenant sur GitHub : https://github.com/Abdoul123-info/orders-site-gnala.git

## Étapes pour déployer sur Render

### 1. Créer le Web Service sur Render

1. **Va sur https://dashboard.render.com**
2. Clique sur **"New +"** (en haut à droite)
3. Sélectionne **"Web Service"**

### 2. Connecter GitHub

1. Clique sur **"Connect account"** ou **"Connect GitHub"**
2. Autorise Render à accéder à tes dépôts GitHub
3. Sélectionne le dépôt : **`Abdoul123-info/orders-site-gnala`**

### 3. Configuration

Remplis les champs suivants :

- **Name** : `orders-site-gnala`
- **Environment** : `Node`
- **Region** : Choisis le plus proche (ex: `Frankfurt (EU)` ou `Oregon (US)`)
- **Branch** : `main`
- **Root Directory** : Laisse vide (le code est à la racine)
- **Build Command** : `npm install`
- **Start Command** : `npm start`
- **Plan** : Sélectionne **Free**

### 4. Variables d'environnement

Aucune variable nécessaire ! Render définit automatiquement `PORT`.

### 5. Créer et déployer

1. Clique sur **"Create Web Service"**
2. Render va automatiquement :
   - Cloner le code depuis GitHub
   - Installer les dépendances
   - Démarrer le serveur
   - Générer une URL publique

### 6. Obtenir l'URL

Une fois le déploiement terminé (2-3 minutes), tu verras :
- **URL publique** : `https://orders-site-gnala.onrender.com` (exemple)
- **Copie cette URL !**

## Prochaine étape

Une fois que tu as l'URL, dis-moi et je mettrai à jour l'application Flutter pour utiliser cette URL permanente !


