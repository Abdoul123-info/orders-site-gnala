# 🚀 Déploiement Render - Étapes Détaillées

## Étape 1 : Créer le Web Service sur Render

1. **Va sur https://dashboard.render.com**
2. **Clique sur "New +"** (en haut à droite)
3. **Sélectionne "Web Service"**

## Étape 2 : Choisir la méthode de déploiement

Tu as **3 options** :

### Option A : Si tu as un dépôt GitHub (RECOMMANDÉ)
1. Clique sur "Connect account" pour connecter GitHub
2. Sélectionne le dépôt qui contient le code `orders_site`
3. Render va automatiquement détecter le projet

### Option B : Si tu n'as pas de dépôt GitHub
1. Clique sur "Public Git repository"
2. Entre l'URL de ton dépôt Git public (GitLab, Bitbucket, etc.)

### Option C : Déploiement manuel (si pas de Git)
1. Clique sur "Manual Deploy"
2. Tu devras uploader les fichiers manuellement

## Étape 3 : Configuration du service

Remplis les champs suivants :

- **Name** : `orders-site-gnala` (ou un nom de ton choix)
- **Environment** : Sélectionne `Node`
- **Region** : Choisis le plus proche (ex: `Frankfurt (EU)` ou `Oregon (US)`)
- **Branch** : `main` ou `master` (si Git)
- **Root Directory** : `orders_site` (si ton repo contient plusieurs dossiers)
- **Build Command** : `npm install`
- **Start Command** : `npm start`
- **Plan** : Sélectionne **Free**

## Étape 4 : Variables d'environnement (optionnel)

Render définit automatiquement `PORT`, tu n'as pas besoin d'ajouter de variables.

## Étape 5 : Créer et déployer

1. Clique sur **"Create Web Service"**
2. Render va :
   - Cloner ton code
   - Installer les dépendances (`npm install`)
   - Démarrer le serveur (`npm start`)
   - Générer une URL publique

## Étape 6 : Obtenir l'URL

Une fois le déploiement terminé, tu verras :
- **URL publique** : `https://orders-site-gnala.onrender.com` (exemple)
- Copie cette URL, tu en auras besoin pour l'app Flutter

## ⚠️ Important

- Le premier déploiement peut prendre 2-3 minutes
- Sur le plan gratuit, le serveur peut mettre 30 secondes à démarrer après inactivité
- Les commandes sont stockées en mémoire (perdues au redémarrage)

## Prochaine étape

Une fois que tu as l'URL, je mettrai à jour l'application Flutter pour utiliser cette URL !




