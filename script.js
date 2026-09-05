// ১. ফায়ারবেস কনফিগারেশন (ছবি থেকে নেওয়া ডাটা)
const firebaseConfig = {
  apiKey: "AIzaSyCzAK0IH10btuzOpoXb_KBhWYqktk-5J80",
  authDomain: "sondhiptk-86389.firebaseapp.com",
  projectId: "sondhiptk-86389",
  storageBucket: "sondhiptk-86389.firebasestorage.app",
  messagingSenderId: "1028560106293",
  appId: "1:1028560106293:web:8e852e186ac05ca900d27c",
  measurementId: "G-KSHYYRDLCM"
};

// ২. CDN ফ্রন্টএন্ডের জন্য ইনিশিয়ালাইজেশন
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function updateThemeToggle() {
  const isDark = document.documentElement.dataset.theme === 'dark';
  const toggle = document.getElementById('themeToggle');
  if (!toggle) {
    return;
  }
  toggle.innerHTML = `<i class="fas fa-${isDark ? 'sun' : 'moon'}" aria-hidden="true"></i>`;
  toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  toggle.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem('sondhi_theme', nextTheme);
  updateThemeToggle();
}

window.addEventListener('DOMContentLoaded', updateThemeToggle);

const getLocalOrders = () => JSON.parse(localStorage.getItem('sondhi_orders') || '[]');
const saveLocalOrder = (order) => {
  const orders = getLocalOrders();
  orders.unshift(order);
  localStorage.setItem('sondhi_orders', JSON.stringify(orders));
};

// ২. অর্ডার Firebase-এ সেভ করার ফাংশন
async function handleOrderSubmit(e) {
  e.preventDefault();

  const submitButton = document.getElementById('confirmPurchaseButton');
  const submitError = document.getElementById('orderSubmitError');
  submitButton.disabled = true;
  submitButton.textContent = 'অর্ডার পাঠানো হচ্ছে...';
  submitError.classList.add('hidden');

  const newOrder = {
    id: 'SND-' + Math.floor(1000 + Math.random() * 9000),
    date: new Date().toLocaleDateString('bn-BD'),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(), // ক্রমানুসারে সাজানোর জন্য
    product: cart.map((item) => `${item.product} × ${item.quantity}`).join(', '),
    name: document.getElementById('fullName').value,
    phone: document.getElementById('phoneNumber').value,
    address: document.getElementById('address').value,
    promoCode: document.getElementById('promoCode').value.trim() || 'N/A',
    items: cart.map((item) => ({ ...item })),
    quantity: cart.reduce((total, item) => total + item.quantity, 0),
    subtotal: getCartSubtotal()
  };

  let submissionFinished = false;
  const completeOrder = () => {
    if (submissionFinished) {
      return;
    }
    submissionFinished = true;
    saveLocalOrder({ ...newOrder, createdAt: new Date().toISOString() });
    document.getElementById('orderFormView').classList.add('hidden');
    document.getElementById('successView').classList.remove('hidden');
    cart = [];

  };
  const failOrder = (error) => {
    if (submissionFinished) {
      return;
    }
    submissionFinished = true;
    console.error('Firebase order sync error:', error);
    submitError.textContent = 'অর্ডার পাঠানো যায়নি। ইন্টারনেট সংযোগ বা Firebase সেটিংস পরীক্ষা করে আবার চেষ্টা করুন।';
    submitError.classList.remove('hidden');
    submitButton.disabled = false;
    submitButton.textContent = 'Confirm Purchase';
  };

  db.collection('orders').add(newOrder).then(completeOrder).catch(failOrder);
  window.setTimeout(() => failOrder(new Error('Order request timed out')), 10000);
}

// ৪. এডমিন প্যানেলে রিয়েলটাইম ডাটা দেখানোর ফাংশন (renderOrders আপডেট করুন)
async function renderOrders() {
  const tbody = document.getElementById('ordersTableBody');
  tbody.innerHTML = '<tr><td colspan="9" class="p-10 text-center text-slate-400">অর্ডার লোড হচ্ছে...</td></tr>';

  const localOrders = getLocalOrders();
  if (localOrders.length > 0) {
    renderOrderRows(localOrders.map((order) => ({ ...order, source: 'local' })), tbody);
  }

  try {
    const remoteSnapshot = await Promise.race([
      db.collection('orders').orderBy('createdAt', 'desc').get(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase request timed out')), 4000))
    ]);

    if (!remoteSnapshot.empty) {
      renderOrderRows(remoteSnapshot.docs.map((doc) => ({ ...doc.data(), firestoreId: doc.id, source: 'firebase' })), tbody);
    } else if (localOrders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="p-10 text-center text-slate-400">এখনো কোনো অর্ডার পাওয়া যায়নি।</td></tr>';
    }
  } catch (error) {
    console.error('Firebase order read error:', error);
    if (localOrders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="p-10 text-center text-slate-400">অর্ডার লোড করা যায়নি।</td></tr>';
    }
  }
}

function renderOrderRows(orders, tbody) {
  tbody.innerHTML = orders.map((o) => {
  const orderKey = encodeURIComponent(o.id || '');
  const firestoreKey = encodeURIComponent(o.firestoreId || '');
      return `
        <tr class="hover:bg-stone-50 transition">
          <td class="px-6 py-5 font-mono text-xs text-sage">${o.promoCode || 'N/A'}</td>
          <td class="px-6 py-5">${o.date || ''}</td>
          <td class="px-6 py-5 font-bold">${o.items ? o.items.map((item) => `${item.product} × ${item.quantity}`).join('<br>') : o.product}</td>
          <td class="px-6 py-5">${o.quantity || 1}</td>
          <td class="px-6 py-5 font-bold">${o.name}</td>
          <td class="px-6 py-5 font-mono">${o.phone}</td>
          <td class="order-address px-6 py-5">${o.address}</td>
          <td class="px-6 py-5 font-bold text-forest">${formatCurrency(o.subtotal || 0)}</td>
          <td class="px-6 py-5">
            <button type="button" class="delete-order-button" onclick="deleteOrder('${orderKey}', '${firestoreKey}')" aria-label="Delete order">মুছুন</button>
          </td>
        </tr>
      `;
    }).join('');
}

async function deleteOrder(encodedOrderId, encodedFirestoreId) {
  const orderId = decodeURIComponent(encodedOrderId);
  const firestoreId = decodeURIComponent(encodedFirestoreId);
  if (!window.confirm('এই অর্ডারটি মুছে ফেলতে চান?')) {
    return;
  }

  const remainingOrders = getLocalOrders().filter((order) => order.id !== orderId);
  localStorage.setItem('sondhi_orders', JSON.stringify(remainingOrders));

  if (firestoreId) {
    try {
      await db.collection('orders').doc(firestoreId).delete();
    } catch (error) {
      console.error('Firebase order delete error:', error);
    }
  }

  await renderOrders();
}

let cart = [];

const formatCurrency = (amount) => `৳ ${amount.toLocaleString('bn-BD')}`;
const getCartSubtotal = () => cart.reduce((total, item) => total + item.price * item.quantity, 0);

function openCheckout(productName, price) {
  const existingItem = cart.find((item) => item.product === productName);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ product: productName, price, quantity: 1 });
  }

  document.getElementById('checkoutModal').classList.remove('hidden');
  document.getElementById('orderFormView').classList.remove('hidden');
  document.getElementById('successView').classList.add('hidden');
  renderCart();
}

function closeCheckout() {
  document.getElementById('checkoutModal').classList.add('hidden');
}

function addMoreProducts() {
  closeCheckout();
  document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
}

function updateQuantity(index, quantity) {
  const nextQuantity = Number(quantity);
  if (nextQuantity === 0) {
    cart.splice(index, 1);
  } else {
    cart[index].quantity = Math.max(1, nextQuantity || 1);
  }
  renderCart();
}

function renderCart() {
  const cartItems = document.getElementById('cartItems');
  const subtotal = getCartSubtotal();

  document.getElementById('selectedProductDisplay').innerText = `${cart.length} item${cart.length > 1 ? 's' : ''} selected`;
  document.getElementById('subtotalDisplay').innerText = formatCurrency(subtotal);
  cartItems.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <div class="cart-item-name">${item.product}</div>
      <div class="cart-item-controls">
        <input type="number" min="0" value="${item.quantity}" onchange="updateQuantity(${index}, this.value)" aria-label="Quantity for ${item.product}" />
        <span>${formatCurrency(item.price * item.quantity)}</span>
      </div>
    </div>
  `).join('');
}

function openAdminModal() {
  document.getElementById('adminModal').classList.remove('hidden');
}

function closeAdminModal() {
  document.getElementById('adminModal').classList.add('hidden');
}

function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('adminEmail').value;
  const pass = document.getElementById('adminPassword').value;

  if (email === 'sondhiptk@gmail.com' && pass === 'sondhi2026') {
    document.getElementById('adminLoginView').classList.add('hidden');
    document.getElementById('adminDashboardView').classList.remove('hidden');
    document.getElementById('loginError').classList.add('hidden');
    renderOrders();
  } else {
    document.getElementById('loginError').classList.remove('hidden');
  }
}

function adminLogout() {
  document.getElementById('adminDashboardView').classList.add('hidden');
  document.getElementById('adminLoginView').classList.remove('hidden');
  document.getElementById('adminEmail').value = '';
  document.getElementById('adminPassword').value = '';
}

