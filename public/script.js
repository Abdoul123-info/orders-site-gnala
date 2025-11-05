const API_URL = '/api/orders';

// Charger les commandes au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    loadOrders();
    
    // Actualiser toutes les 30 secondes
    setInterval(loadOrders, 30000);
});

// Charger toutes les commandes
async function loadOrders() {
    try {
        const response = await fetch(API_URL);
        const orders = await response.json();
        
        displayOrders(orders);
    } catch (error) {
        console.error('Erreur lors du chargement des commandes:', error);
        const tbody = document.getElementById('ordersBody');
        tbody.innerHTML = '<tr><td colspan="11" class="no-orders" data-label="">Erreur lors du chargement des commandes</td></tr>';
    }
}

// Afficher les commandes dans le tableau
function displayOrders(orders) {
    const tbody = document.getElementById('ordersBody');
    
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="no-orders" data-label="">Aucune commande pour le moment</td></tr>';
        return;
    }
    
    // Trier par date (plus récentes en premier)
    orders.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.receivedAt);
        const dateB = new Date(b.createdAt || b.receivedAt);
        return dateB - dateA;
    });
    
    tbody.innerHTML = orders.map(order => {
        const date = formatDate(order.createdAt || order.receivedAt);
        const status = order.status || 'pending';
        const deliveryType = order.deliveryType || 'simple';
        
        // Extraire nom et prénom (si disponible)
        const fullName = order.userName || 'N/A';
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        
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
                        ${deliveryType === 'express' ? 'Express' : 'Simple'}
                    </span>
                </td>
                <td class="items-list" data-label="Articles">
                    ${formatItems(order.items || [])}
                    <small>(${order.totalItems || 0} article(s))</small>
                </td>
                <td class="total-price" data-label="Total">${formatPrice(order.totalPrice || 0)} FCFA</td>
                <td data-label="Statut">
                    <span class="status-badge status-${status}">
                        ${getStatusLabel(status)}
                    </span>
                </td>
                <td data-label="Actions">
                    <div class="action-buttons">
                        <button class="btn-action btn-view" onclick="viewOrder('${order.id}')">
                            Voir
                        </button>
                        ${status === 'pending' ? `
                            <button class="btn-action btn-complete" onclick="updateStatus('${order.id}', 'processing')">
                                Traiter
                            </button>
                        ` : ''}
                        ${status !== 'completed' && status !== 'cancelled' ? `
                            <button class="btn-action btn-cancel" onclick="updateStatus('${order.id}', 'cancelled')">
                                Annuler
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Formater les articles
function formatItems(items) {
    if (!items || items.length === 0) return 'Aucun article';
    
    return '<ul>' + items.map(item => `
        <li>
            <span class="item-name">${item.productName || item.name || 'Produit'}</span>
            <span class="item-quantity"> - x${item.quantity} (${formatPrice(item.price || 0)} FCFA)</span>
        </li>
    `).join('') + '</ul>';
}

// Formater le prix
function formatPrice(price) {
    return parseFloat(price).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Formater la date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Obtenir le libellé du statut
function getStatusLabel(status) {
    const labels = {
        'pending': 'En attente',
        'processing': 'En traitement',
        'completed': 'Terminée',
        'cancelled': 'Annulée'
    };
    return labels[status] || status;
}

// Mettre à jour le statut d'une commande
async function updateStatus(orderId, newStatus) {
    if (!confirm(`Voulez-vous vraiment ${newStatus === 'processing' ? 'traiter' : 'annuler'} cette commande ?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            loadOrders();
            alert('Statut de la commande mis à jour avec succès');
        } else {
            alert('Erreur lors de la mise à jour du statut');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la mise à jour du statut');
    }
}

// Voir les détails d'une commande
async function viewOrder(orderId) {
    try {
        const response = await fetch(`${API_URL}/${orderId}`);
        const order = await response.json();
        
        const details = `
Détails de la commande #${orderId}

Nom: ${order.userName || 'N/A'}
Téléphone: ${order.userPhone || 'N/A'}
Email: ${order.userEmail || 'N/A'}
Adresse: ${order.address || 'N/A'}
Zone/Secteur: ${order.zone || 'N/A'}
Type de livraison: ${order.deliveryType === 'express' ? 'Express' : 'Simple'}
Statut: ${getStatusLabel(order.status || 'pending')}
Date: ${formatDate(order.createdAt || order.receivedAt)}

Articles:
${(order.items || []).map(item => 
    `- ${item.productName || item.name} x${item.quantity} = ${formatPrice(item.totalPrice || item.price * item.quantity)} FCFA`
).join('\n')}

TOTAL: ${formatPrice(order.totalPrice || 0)} FCFA
        `;
        
        alert(details);
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du chargement des détails');
    }
}

