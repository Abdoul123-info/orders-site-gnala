import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const API_URL = '/api/orders';
const STATS_URL = '/api/stats';
const ORDERS_REFRESH_MS = 30_000;
const STATS_REFRESH_MS = 60_000;

const firebaseConfig = {
  apiKey: 'AIzaSyANkanQ9HJ1BtKc8nBkd70hRaIW3PWfwKU',
  appId: '1:483552581279:web:281e00a0b62aed39bdb4aa',
  messagingSenderId: '483552581279',
  projectId: 'gnala-cosmetic',
  authDomain: 'gnala-cosmetic.firebaseapp.com',
  storageBucket: 'gnala-cosmetic.firebasestorage.app',
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

const ordersBody = document.getElementById('ordersBody');
const statsBar = document.getElementById('statsBar');
const statsText = document.getElementById('statsText');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const loginBtn = document.getElementById('loginBtn');
const authStatus = document.getElementById('authStatus');
const authError = document.getElementById('authError');
const refreshBtn = document.getElementById('refreshBtn');

let currentIdToken = null;
let ordersInterval = null;
let statsInterval = null;

const setTableMessage = (message) => {
  if (!ordersBody) return;
  ordersBody.innerHTML = `<tr><td colspan="11" class="no-orders" data-label="">${message}</td></tr>`;
};

const setAuthError = (message = '') => {
  authError.textContent = message;
};

const toggleLoadingState = (isLoading) => {
  if (isLoading) {
    refreshBtn.setAttribute('disabled', 'disabled');
    refreshBtn.textContent = 'Chargement...';
  } else {
    refreshBtn.removeAttribute('disabled');
    refreshBtn.textContent = 'Actualiser';
  }
};

const refreshIdToken = async (force = false) => {
  if (!auth.currentUser) {
    currentIdToken = null;
    return null;
  }
  currentIdToken = await auth.currentUser.getIdToken(force);
  return currentIdToken;
};

const ensureAuthenticated = () => {
  if (!currentIdToken) {
    setTableMessage('Connectez-vous avec un compte administrateur pour consulter les commandes.');
    return false;
  }
  return true;
};

const loadStats = async () => {
  try {
    const response = await fetch(STATS_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!data || data.mongo === false) {
      statsBar.classList.add('hidden');
      return;
    }
    
    // Formater le revenu avec séparateurs de milliers
    const formatRevenue = (amount) => {
      return new Intl.NumberFormat('fr-FR', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount || 0);
    };
    
    const ordersCount = data.ordersCount || 0;
    const activeOrdersCount = data.activeOrdersCount || 0;
    const totalRevenue = data.totalRevenue || 0;
    const preciseSize = data.ordersCollection?.sizeMB ?? data.db?.dataSizeMB ?? 0;
    const preciseStorage = data.ordersCollection?.storageSizeMB ?? data.db?.storageSizeMB ?? 0;
    
    const text = `Total commandes: ${ordersCount} (${activeOrdersCount} actives) | Revenu total: ${formatRevenue(totalRevenue)} FCFA | Collection: ${preciseSize.toFixed(2)} Mo`;
    statsText.textContent = text;
    statsBar.classList.remove('hidden');
  } catch (error) {
    console.warn('Stats indisponibles:', error);
    statsBar.classList.add('hidden');
  }
};

const loadOrders = async (forceRefreshToken = false) => {
  if (!ensureAuthenticated()) return;

  try {
    toggleLoadingState(true);
    if (forceRefreshToken) {
      await refreshIdToken(true);
    }

    const response = await fetch(API_URL, {
      headers: {
        Authorization: `Bearer ${currentIdToken}`,
      },
    });

    if (response.status === 401) {
      setTableMessage('Accès refusé (401). Vérifiez que ce compte est autorisé et réessayez.');
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const orders = await response.json();
    if (!Array.isArray(orders)) {
      throw new Error('Réponse inattendue du serveur.');
    }

    displayOrders(orders);
  } catch (error) {
    console.error('Erreur lors du chargement des commandes:', error);
    setTableMessage('Erreur lors du chargement des commandes.');
  } finally {
    toggleLoadingState(false);
  }
};

const displayOrders = (orders) => {
  if (!orders || orders.length === 0) {
    setTableMessage('Aucune commande pour le moment.');
    return;
  }

  console.log('📋 Affichage de', orders.length, 'commande(s)');
  orders.forEach((order, index) => {
    console.log(`  Commande ${index + 1}: id=${order.id}, status=${order.status}`);
  });

  orders.sort((a, b) => {
    const dateA = new Date(a.createdAt || a.receivedAt || 0);
    const dateB = new Date(b.createdAt || b.receivedAt || 0);
    return dateB - dateA;
  });

  ordersBody.innerHTML = orders
    .map((order) => {
      const date = formatDate(order.createdAt || order.receivedAt);
      const status = order.status || 'pending';
      const deliveryType = order.deliveryType || 'simple';
      const fullName = order.userName || 'N/A';
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      const totalItems = order.totalItems || 0;
      const totalPrice = formatPrice(order.totalPrice || 0);

      return `
        <tr>
          <td data-label="Date">${date}</td>
          <td data-label="Nom">${firstName ? `<strong>${firstName}</strong> ${lastName || ''}`.trim() : fullName}</td>
          <td data-label="Téléphone">${order.userPhone || 'N/A'}</td>
          <td data-label="Email">${order.userEmail || 'N/A'}</td>
          <td data-label="Adresse">${order.address || 'N/A'}</td>
          <td data-label="Zone/Secteur">${order.zone || 'N/A'}</td>
          <td data-label="Livraison">
            <span class="delivery-badge delivery-${deliveryType}">
              Livraison
            </span>
          </td>
          <td class="items-list" data-label="Articles">
            ${formatItems(order.items || [])}
            <small>(${totalItems} article(s))</small>
          </td>
          <td class="total-price" data-label="Total">${totalPrice} FCFA</td>
          <td data-label="Statut">
            <span class="status-badge status-${status}">
              ${getStatusLabel(status)}
            </span>
          </td>
          <td data-label="Actions">
            <div class="action-buttons">
              <button class="btn-action btn-view" data-action="view" data-id="${order.id}">
                Voir
              </button>
              ${
                status === 'pending'
                  ? `<button class="btn-action btn-complete" data-action="status" data-status="processing" data-id="${order.id}">Traiter</button>`
                  : ''
              }
              ${
                status === 'processing'
                  ? `<button class="btn-action btn-confirm" data-action="status" data-status="confirmed" data-id="${order.id}">Confirmer</button>`
                  : ''
              }
              ${
                status === 'confirmed'
                  ? `<button class="btn-action btn-ship" data-action="status" data-status="shipped" data-id="${order.id}">Expédier</button>`
                  : ''
              }
              ${
                status === 'shipped'
                  ? `<button class="btn-action btn-deliver" data-action="status" data-status="delivered" data-id="${order.id}">Livrer</button>`
                  : ''
              }
              ${
                status !== 'cancelled'
                  ? `<button class="btn-action btn-cancel" data-action="delete" data-id="${order.id}">Rejeter</button>`
                  : ''
              }
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
};

const formatItems = (items) => {
  if (!items || items.length === 0) return 'Aucun article';
  return (
    '<ul>' +
    items
      .map(
        (item) => `
      <li>
        <span class="item-name">${item.productName || item.name || 'Produit'}</span>
        <span class="item-quantity"> - x${item.quantity} (${formatPrice(item.price || 0)} FCFA)</span>
      </li>`
      )
      .join('') +
    '</ul>'
  );
};

const formatPrice = (price) => {
  const safePrice = Number(price) || 0;
  return safePrice.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'N/A';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const getStatusLabel = (status) => {
  const labels = {
    pending: 'En attente',
    processing: 'En traitement',
    confirmed: 'Confirmée',
    completed: 'Terminée',
    shipped: 'Expédiée',
    delivered: 'Livrée',
    cancelled: 'Annulée',
  };
  return labels[status] || status;
};

const updateStatus = async (orderId, newStatus) => {
  if (!ensureAuthenticated()) {
    window.alert('Authentification requise. Veuillez vous reconnecter.');
    return;
  }

  const confirmMessages = {
    processing: 'Confirmez-vous le traitement de cette commande ?',
    confirmed: 'Confirmez-vous la confirmation de cette commande ?',
    shipped: 'Confirmez-vous l\'expédition de cette commande ?',
    delivered: 'Confirmez-vous la livraison de cette commande ?',
    cancelled: '⚠️ Attention : Voulez-vous vraiment rejeter/annuler cette commande ? Cette action est irréversible.',
  };
  const confirmMessage = confirmMessages[newStatus] || `Confirmez-vous le changement de statut vers "${getStatusLabel(newStatus)}" ?`;
  if (!window.confirm(confirmMessage)) {
    return;
  }

  try {
    // Rafraîchir le token avant la requête
    await refreshIdToken(true);
    
    const url = `${API_URL}/${orderId}/status`;
    console.log('🔄 Mise à jour statut:', { orderId, newStatus, url });
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentIdToken}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });

    console.log('📥 Réponse status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur serveur:', errorText);
      let errorMessage = `Erreur ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ Statut mis à jour:', result);
    console.log('📋 Nouveau statut de la commande:', result.order?.status);

    // Rafraîchir la liste des commandes avec token forcé
    console.log('🔄 Rechargement de la liste des commandes...');
    await loadOrders(true);
    console.log('✅ Liste des commandes rechargée');
    window.alert('Statut mis à jour avec succès.');
  } catch (error) {
    console.error('❌ Erreur maj statut:', error);
    window.alert(`Erreur lors de la mise à jour du statut: ${error.message || 'Erreur inconnue'}`);
  }
};

const deleteOrder = async (orderId) => {
  if (!ensureAuthenticated()) {
    window.alert('Authentification requise. Veuillez vous reconnecter.');
    return;
  }

  // Confirmation stricte pour la suppression
  if (!window.confirm('⚠️ ATTENTION : Voulez-vous vraiment SUPPRIMER DÉFINITIVEMENT cette commande ?\n\nCette action est IRRÉVERSIBLE et la commande sera effacée de la base de données.')) {
    return;
  }

  // Double confirmation
  if (!window.confirm('⚠️ DERNIÈRE CONFIRMATION : La commande sera supprimée définitivement. Continuer ?')) {
    return;
  }

  try {
    // Rafraîchir le token avant la requête
    await refreshIdToken(true);
    
    const url = `${API_URL}/${orderId}`;
    console.log('🗑️ Suppression commande:', { orderId, url });
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentIdToken}`,
      },
    });

    console.log('📥 Réponse suppression:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur serveur:', errorText);
      let errorMessage = `Erreur ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ Commande supprimée:', result);

    // Rafraîchir la liste des commandes avec token forcé
    console.log('🔄 Rechargement de la liste des commandes...');
    await loadOrders(true);
    console.log('✅ Liste des commandes rechargée');
    window.alert('Commande supprimée définitivement.');
  } catch (error) {
    console.error('❌ Erreur suppression:', error);
    window.alert(`Erreur lors de la suppression: ${error.message || 'Erreur inconnue'}`);
  }
};

const viewOrder = async (orderId) => {
  if (!ensureAuthenticated()) return;

  try {
    const response = await fetch(`${API_URL}/${orderId}`, {
      headers: {
        Authorization: `Bearer ${currentIdToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const order = await response.json();
    const details = `
Détails de la commande #${orderId}

Nom: ${order.userName || 'N/A'}
Téléphone: ${order.userPhone || 'N/A'}
Email: ${order.userEmail || 'N/A'}
Adresse: ${order.address || 'N/A'}
Zone/Secteur: ${order.zone || 'N/A'}
Type de livraison: Livraison
Statut: ${getStatusLabel(order.status || 'pending')}
Date: ${formatDate(order.createdAt || order.receivedAt)}

Articles:
${(order.items || [])
  .map(
    (item) =>
      `- ${item.productName || item.name} x${item.quantity} = ${formatPrice(
        item.totalPrice || item.price * item.quantity
      )} FCFA`
  )
  .join('\n')}

TOTAL: ${formatPrice(order.totalPrice || 0)} FCFA
    `;

    window.alert(details);
  } catch (error) {
    console.error('Erreur détails commande:', error);
    window.alert('Erreur lors du chargement des détails.');
  }
};

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setAuthError('');
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;

  if (!email || !password) {
    setAuthError('Email et mot de passe requis.');
    return;
  }

  try {
    loginBtn.setAttribute('disabled', 'disabled');
    loginBtn.textContent = 'Connexion...';
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error('Erreur connexion admin:', error);
    setAuthError('Connexion impossible: ' + (error.message || 'Vérifiez vos identifiants.'));
  } finally {
    loginBtn.removeAttribute('disabled');
    loginBtn.textContent = 'Se connecter';
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Erreur déconnexion:', error);
  }
});

refreshBtn.addEventListener('click', () => loadOrders());

ordersBody.addEventListener('click', (event) => {
  const target = event.target.closest('button[data-action]');
  if (!target) return;
  
  event.preventDefault();
  event.stopPropagation();
  
  const orderId = target.dataset.id;
  const action = target.dataset.action;

  console.log('🔘 Action cliquée:', { action, orderId, target });

  if (action === 'view') {
    viewOrder(orderId);
  } else if (action === 'delete') {
    console.log('🗑️ Suppression demandée:', { orderId });
    deleteOrder(orderId);
  } else if (action === 'status') {
    const newStatus = target.dataset.status;
    console.log('📝 Changement de statut demandé:', { orderId, newStatus });
    updateStatus(orderId, newStatus);
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentIdToken = null;
    authStatus.textContent = 'Non connecté';
    setTableMessage('Connectez-vous avec un compte administrateur pour consulter les commandes.');
    logoutBtn.setAttribute('disabled', 'disabled');
    loginBtn.removeAttribute('disabled');
    stopIntervals();
    return;
  }

  authStatus.textContent = `Connecté : ${user.email}`;
  logoutBtn.removeAttribute('disabled');
  loginBtn.setAttribute('disabled', 'disabled');
  await refreshIdToken(true);

  loadOrders();
  loadStats();
  startIntervals();
});

const startIntervals = () => {
  if (!ordersInterval) {
    ordersInterval = setInterval(() => loadOrders(), ORDERS_REFRESH_MS);
  }
  if (!statsInterval) {
    statsInterval = setInterval(loadStats, STATS_REFRESH_MS);
  }
};

const stopIntervals = () => {
  if (ordersInterval) {
    clearInterval(ordersInterval);
    ordersInterval = null;
  }
  if (statsInterval) {
    clearInterval(statsInterval);
    statsInterval = null;
  }
};

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopIntervals();
  } else if (auth.currentUser) {
    startIntervals();
    loadOrders();
    loadStats();
  }
});

// État initial
setTableMessage('Connexion requise pour afficher les commandes.');
loadStats();
