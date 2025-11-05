# Configuration ngrok pour accès public

## Installation de ngrok

1. Téléchargez ngrok depuis https://ngrok.com/download
2. Décompressez l'archive
3. Ajoutez ngrok à votre PATH ou placez-le dans le dossier orders_site

## Utilisation

1. Démarrez le serveur : `node server.js`
2. Dans un nouveau terminal, lancez : `ngrok http 3000`
3. Copiez l'URL HTTPS fournie (ex: https://abc123.ngrok.io)
4. Mettez à jour l'URL dans l'application Flutter

## Configuration automatique

Pour automatiser, vous pouvez utiliser le script PowerShell `start-ngrok.ps1`


