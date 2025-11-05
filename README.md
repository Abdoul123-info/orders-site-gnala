# Orders Site - Gnala Cosmetic

Site de gestion des commandes pour Gnala Cosmetic.

## Installation

```bash
npm install
```

## Démarrage

```bash
npm start
```

Le serveur démarre sur le port 3000 par défaut.

Accédez à `http://localhost:3000` pour voir l'interface de gestion des commandes.

## Fonctionnalités

- Réception des commandes via API POST `/api/orders`
- Affichage des commandes dans un tableau avec :
  - Date de commande
  - Nom et prénom du client
  - Téléphone
  - Email
  - Adresse/Quartier
  - Zone/Secteur
  - Type de livraison (Simple/Express)
  - Liste des articles
  - Total
  - Statut
- Actions disponibles :
  - Voir les détails d'une commande
  - Traiter une commande (changer le statut)
  - Annuler une commande

## API Endpoints

- `POST /api/orders` - Recevoir une nouvelle commande
- `GET /api/orders` - Récupérer toutes les commandes
- `GET /api/orders/:id` - Récupérer une commande spécifique
- `PATCH /api/orders/:id/status` - Mettre à jour le statut d'une commande
- `DELETE /api/orders/:id` - Supprimer une commande

## Notes

- Les commandes sont stockées en mémoire (redémarrage du serveur = perte des données)
- Pour la production, il est recommandé d'utiliser une base de données (MongoDB, PostgreSQL, etc.)




