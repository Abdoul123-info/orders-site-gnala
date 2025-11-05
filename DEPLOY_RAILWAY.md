# Guide de déploiement Railway - Étape par étape

## Étape 1: Créer un compte Railway

1. Va sur https://railway.app
2. Clique sur "Start a New Project"
3. Connecte-toi avec GitHub, Google ou Email
4. Accepte le plan gratuit (500 heures/mois gratuites)

## Étape 2: Se connecter via CLI

Dans le terminal, dans le dossier `orders_site`, lance :

```bash
railway login
```

Cela ouvrira ton navigateur pour t'authentifier.

## Étape 3: Initialiser le projet

```bash
railway init
```

Choisis "Empty Project" quand demandé.

## Étape 4: Déployer

```bash
railway up
```

Cela va :
- Détecter automatiquement que c'est un projet Node.js
- Installer les dépendances
- Démarrer le serveur
- Te donner une URL publique (ex: https://orders-site-production.up.railway.app)

## Étape 5: Obtenir l'URL publique

```bash
railway domain
```

Ou va sur https://railway.app, ouvre ton projet, et trouve l'URL dans l'onglet "Settings" > "Domains".

## Étape 6: Mettre à jour l'application Flutter

1. Ouvre `gnala_cosmetic/lib/config/server_config.dart`
2. Modifie la ligne :
   ```dart
   static const String? publicServerUrl = null;
   ```
   En :
   ```dart
   static const String? publicServerUrl = 'https://ton-url-railway.up.railway.app';
   ```
3. Remplace `ton-url-railway` par ton URL réelle

## Étape 7: Reconstruire l'APK

```bash
cd ../gnala_cosmetic
flutter build apk --debug --target-platform android-arm,android-arm64 --split-per-abi
```

## Commandes utiles Railway

- `railway status` - Voir le statut du déploiement
- `railway logs` - Voir les logs en temps réel
- `railway open` - Ouvrir le dashboard dans le navigateur
- `railway domain` - Voir l'URL publique

## Notes importantes

- Railway est gratuit jusqu'à 500 heures/mois
- Le serveur reste actif même quand tu fermes ton ordinateur
- L'URL est permanente (ne change pas)
- Les commandes sont stockées en mémoire (perdues au redémarrage)


