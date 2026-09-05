// ১. ফায়ারবেস কনফিগারেশন
const firebaseConfig = {
  apiKey: "AIzaSyCzAK0IH10btuzOpoXb_KBhWYqktk-5J80",
  authDomain: "sondhiptk-86389.firebaseapp.com",
  projectId: "sondhiptk-86389",
  storageBucket: "sondhiptk-86389.firebasestorage.app",
  messagingSenderId: "1028560106293",
  appId: "1:1028560106293:web:8e852e186ac05ca900d27c",
  measurementId: "G-KSHYYRDLCM"
};

// ২. ইনিশিয়ালাইজেশন
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// XSS Sanitization Helper
function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, match => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[match]));
}

function updateThemeToggle() {
  const isDark = document.documentElement.dataset.theme === 'dark';
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;
  
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

const getLocalOrders = () => JSON.parse(localStorage.getItem('sondhi_orders') || '[]');
const saveLocalOrder = (order) => {
  const orders = getLocalOrders();
  orders.unshift(order);
  localStorage.setItem('sondhi_orders', JSON.stringify(orders));
};

let cart = [];
const formatCurrency = (amount) => `৳ ${Number(amount || 0).toLocaleString('bn-BD')}`;
const getCartSubtotal = () => cart.reduce((total, item) => total + item.price * item.quantity, 0);

// ৩. অর্ডার সাবমিশন
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
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
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
  
  const timeoutId = window.setTimeout(() => {
    failOrder(new Error('Order request timed out'));
  }, 10000);

  const completeOrder = () => {
    if (submissionFinished) return;
    submissionFinished = true;
    clearTimeout(timeoutId);
    
    saveLocalOrder({ ...newOrder, createdAt: new Date().toISOString() });
    document.getElementById('orderFormView').classList.add('hidden');
    document.getElementById('successView').classList.remove('hidden');
    cart = [];
  };

  const failOrder = (error) => {
    if (submissionFinished) return;
    submissionFinished = true;
    clearTimeout(timeoutId);

    console.error('Firebase order sync error:', error);
    submitError.textContent = 'অর্ডার পাঠানো যায়নি। ইন্টারনেট সংযোগ বা Firebase সেটিংস পরীক্ষা করে আবার চেষ্টা করুন।';
    submitError.classList.remove('hidden');
    submitButton.disabled = false;
    submitButton.textContent = 'Confirm Purchase';
  };

  db.collection('orders').add(newOrder).then(completeOrder).catch(failOrder);
}

// ৪. এডমিন ডাটা রেন্ডারিং
async function renderOrders() {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;
  
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

// Global variable orders cache
let currentOrdersCache = [];

function renderOrderRows(orders, tbody) {
  currentOrdersCache = orders;
  tbody.innerHTML = orders.map((o, idx) => {
    const orderKey = encodeURIComponent(o.id || '');
    const firestoreKey = encodeURIComponent(o.firestoreId || '');
    
    const formattedItems = o.items 
      ? o.items.map((item) => `${escapeHTML(item.product)} × ${item.quantity}`).join('<br>') 
      : escapeHTML(o.product);

    return `
      <tr class="hover:bg-stone-50 transition">
        <td class="px-6 py-5 font-mono text-xs text-sage">${escapeHTML(o.promoCode || 'N/A')}</td>
        <td class="px-6 py-5">${escapeHTML(o.date || '')}</td>
        <td class="px-6 py-5 font-bold">${formattedItems}</td>
        <td class="px-6 py-5">${o.quantity || 1}</td>
        <td class="px-6 py-5 font-bold">${escapeHTML(o.name)}</td>
        <td class="px-6 py-5 font-mono">${escapeHTML(o.phone)}</td>
        <td class="order-address px-6 py-5">${escapeHTML(o.address)}</td>
        <td class="px-6 py-5 font-bold text-forest">${formatCurrency(o.subtotal || 0)}</td>
        <td class="px-6 py-5 flex items-center gap-2">
          <button type="button" class="print-order-button" onclick="printOrder(${idx})" aria-label="Print order">প্রিন্ট</button>
          <button type="button" class="delete-order-button" onclick="deleteOrder('${orderKey}', '${firestoreKey}')" aria-label="Delete order">মুছুন</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ৫. প্রিন্ট লেবেল / মেমো জেনারেটর
function printOrder(index) {
  const o = currentOrdersCache[index];
  if (!o) return;

  const printWindow = window.open('', '_blank', 'width=700,height=800');
  
  const itemsList = o.items 
    ? o.items.map(item => `<li><span>${escapeHTML(item.product)}</span> <strong>x ${item.quantity}</strong></li>`).join('') 
    : `<li><span>${escapeHTML(o.product)}</span> <strong>x ${o.quantity || 1}</strong></li>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="bn">
    <head>
      <meta charset="UTF-8">
      <title>Shipping Label - ${escapeHTML(o.id || 'Order')}</title>
      <style>
        @page { size: A5; margin: 0; }
        body {
          font-family: 'Hind Siliguri', 'Inter', sans-serif;
          background: #fff;
          color: #000;
          margin: 0;
          padding: 20px;
          display: flex;
          justify-content: center;
        }
        .label-card {
          width: 100%;
          max-width: 480px;
          border: 2px solid #173b2b;
          border-radius: 16px;
          padding: 20px;
          box-sizing: border-box;
          position: relative;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 12px;
        }
        .brand {
          font-size: 28px;
          font-weight: bold;
          font-family: Georgia, serif;
          color: #173b2b;
        }
        .company-info {
          font-size: 11px;
          line-height: 1.4;
          text-align: right;
          border-left: 1px solid #ccc;
          padding-left: 10px;
        }
        .striped-border {
          height: 12px;
          background: repeating-linear-gradient(
            -45deg,
            #173b2b,
            #173b2b 10px,
            #ffffff 10px,
            #ffffff 20px
          );
          margin: 10px 0 15px 0;
        }
        .section-title {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        .info-group {
          margin-bottom: 8px;
          font-size: 14px;
          display: flex;
        }
        .info-label {
          width: 110px;
          font-weight: 600;
        }
        .info-value {
          flex: 1;
        }
        .items-box {
          margin-top: 15px;
          background: #f9f9f9;
          padding: 10px;
          border-radius: 8px;
          border: 1px dashed #ccc;
        }
        .items-box ul {
          margin: 5px 0 0 0;
          padding-left: 20px;
          font-size: 13px;
        }
        .items-box li {
          margin-bottom: 4px;
        }
        .total-price {
          margin-top: 12px;
          font-size: 16px;
          font-weight: bold;
          text-align: right;
          color: #173b2b;
        }
        .footer-note {
          margin-top: 20px;
          text-align: center;
          font-size: 11px;
          font-weight: bold;
          letter-spacing: 1px;
        }
      </style>
    </head>
    <body>
      <div class="label-card">
        <div class="header">
          <div class="brand">Sondhi</div>
          <div class="company-info">
            <strong>Sondhi Pure Organic</strong><br>
            Customer Care: 09658-667813<br>
            WhatsApp: 01575-427056<br>
            sondhiptk@gmail.com
          </div>
        </div>
        
        <div class="striped-border"></div>

        <div class="section-title">Shipping To:</div>
        
        <div class="info-group">
          <span class="info-label">Order ID:</span>
          <span class="info-value"><strong>${escapeHTML(o.id || 'N/A')}</strong> (${escapeHTML(o.date || '')})</span>
        </div>
        <div class="info-group">
          <span class="info-label">Name:</span>
          <span class="info-value">${escapeHTML(o.name)}</span>
        </div>
        <div class="info-group">
          <span class="info-label">Phone:</span>
          <span class="info-value"><strong>${escapeHTML(o.phone)}</strong></span>
        </div>
        <div class="info-group">
          <span class="info-label">Address:</span>
          <span class="info-value">${escapeHTML(o.address)}</span>
        </div>

        <div class="items-box">
          <strong>Products:</strong>
          <ul>${itemsList}</ul>
          <div class="total-price">Total Amount: ${formatCurrency(o.subtotal || 0)}</div>
        </div>

        <div class="striped-border"></div>

        <div class="footer-note">
          THANK YOU FOR SUPPORTING US!
        </div>
      </div>
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() { window.close(); };
        };
      <\/script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

async function deleteOrder(encodedOrderId, encodedFirestoreId) {
  const orderId = decodeURIComponent(encodedOrderId);
  const firestoreId = decodeURIComponent(encodedFirestoreId);
  
  if (!window.confirm('এই অর্ডারটি মুছে ফেলতে চান?')) return;

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

// ৬. কার্ট হ্যান্ডলার
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
  const shopEl = document.getElementById('shop');
  if (shopEl) shopEl.scrollIntoView({ behavior: 'smooth' });
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
      <div class="cart-item-name">${escapeHTML(item.product)}</div>
      <div class="cart-item-controls">
        <input type="number" min="0" value="${item.quantity}" onchange="updateQuantity(${index}, this.value)" aria-label="Quantity for ${escapeHTML(item.product)}" />
        <span>${formatCurrency(item.price * item.quantity)}</span>
      </div>
    </div>
  `).join('');
}

// ৭. এডমিন প্যানেল & Auth (Updated)
function openAdminModal() {
  document.getElementById('adminModal').classList.remove('hidden');
}

function closeAdminModal() {
  document.getElementById('adminModal').classList.add('hidden');
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('adminEmail').value.trim();
  const pass = document.getElementById('adminPassword').value.trim();
  const loginError = document.getElementById('loginError');

  // Specific Credentials Check
  if (email === 'sondhiptk@gmail.com' && pass === 'sondhi2026') {
    // Save session locally
    localStorage.setItem('sondhi_admin_session', 'true');
    
    document.getElementById('adminLoginView').classList.add('hidden');
    document.getElementById('adminDashboardView').classList.remove('hidden');
    loginError.classList.add('hidden');
    renderOrders();
    return;
  }

  // Fallback to Firebase Auth (if configured)
  try {
    await auth.signInWithEmailAndPassword(email, pass);
    localStorage.setItem('sondhi_admin_session', 'true');
    document.getElementById('adminLoginView').classList.add('hidden');
    document.getElementById('adminDashboardView').classList.remove('hidden');
    loginError.classList.add('hidden');
    renderOrders();
  } catch (error) {
    console.error('Authentication failure:', error);
    loginError.textContent = 'ইমেইল বা পাসওয়ার্ড ভুল হয়েছে!';
    loginError.classList.remove('hidden');
  }
}

function adminLogout() {
  localStorage.removeItem('sondhi_admin_session');
  auth.signOut().finally(() => {
    document.getElementById('adminDashboardView').classList.add('hidden');
    document.getElementById('adminLoginView').classList.remove('hidden');
    document.getElementById('adminEmail').value = '';
    document.getElementById('adminPassword').value = '';
  });
}

// Auto-check session on load
auth.onAuthStateChanged((user) => {
  const isLocalAdmin = localStorage.getItem('sondhi_admin_session') === 'true';
  if (user || isLocalAdmin) {
    document.getElementById('adminLoginView').classList.add('hidden');
    document.getElementById('adminDashboardView').classList.remove('hidden');
    renderOrders();
  }
});