# Guide de déploiement Render - GRATUIT

Render est gratuit et fonctionne très bien pour notre serveur.

## Étapes de déploiement

### 1. Créer un compte Render
1. Va sur https://render.com
2. Clique sur "Get Started for Free"
3. Connecte-toi avec GitHub, Google ou Email
4. Utilise ton email : oumarouabdoul485@gmail.com

### 2. Créer un nouveau Web Service
1. Une fois connecté, clique sur "New +" en haut à droite
2. Sélectionne "Web Service"
3. Choisis une des options :
   - **Option A** : Connecter un dépôt GitHub (si tu as mis le code sur GitHub)
   - **Option B** : "Public Git repository" et entre l'URL si tu as un repo public
   - **Option C** : "Manual Deploy" (nous ferons cette option)

### 3. Configuration (Option C - Manual Deploy)
1. Clique sur "New +" > "Web Service"
2. Clique sur "Manual Deploy" ou "Build and deploy from a public Git repository"
3. Si tu as un repo GitHub, connecte-le
4. Sinon, utilise "Manual Deploy" et upload les fichiers

### 4. Configuration du service
Dans les paramètres du service :

- **Name** : `orders-site-gnala` (ou un nom de ton choix)
- **Environment** : `Node`
- **Build Command** : `npm install`
- **Start Command** : `npm start`
- **Plan** : Sélectionne **Free** (gratuit)

### 5. Variables d'environnement (optionnel)
- PORT : Render définit automatiquement le port, pas besoin de variable

### 6. Déployer
1. Clique sur "Create Web Service"
2. Render va automatiquement :
   - Installer les dépendances (`npm install`)
   - Démarrer le serveur (`npm start`)
   - Te donner une URL publique (ex: `https://orders-site-gnala.onrender.com`)

### 7. Obtenir l'URL
Une fois déployé, Render te donne une URL comme :
- `https://orders-site-gnala.onrender.com`

### 8. Mettre à jour l'application Flutter
1. Ouvre `gnala_cosmetic/lib/config/server_config.dart`
2. Modifie :
   ```dart
   static const String? publicServerUrl = 'https://ton-url.onrender.com';
   ```
   Remplace `ton-url` par ton URL réelle de Render

### 9. Reconstruire l'APK
```bash
cd ../gnala_cosmetic
flutter build apk --debug --target-platform android-arm,android-arm64 --split-per-abi
```

## Notes importantes
- Render est **100% gratuit** pour les services web
- L'URL est permanente
- Le serveur peut mettre quelques secondes à démarrer après inactivité (gratuit)
- Les commandes sont stockées en mémoire (perdues au redémarrage)


