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

// ২. অর্ডার Firebase-এ সেভ করার ফাংশন
async function handleOrderSubmit(e) {
  e.preventDefault();
  
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

  try {
    // Firestore-এর 'orders' কালেকশনে ডাটা সেভ
    await db.collection('orders').add(newOrder);

    document.getElementById('orderFormView').classList.add('hidden');
    document.getElementById('successView').classList.remove('hidden');
    cart = [];
  } catch (error) {
    console.error("Order submission error: ", error);
    alert("অর্ডার সাবমিট করতে সমস্যা হয়েছে! অনুগ্রহ করে আবার চেষ্টা করুন।");
  }
}

// ৪. এডমিন প্যানেলে রিয়েলটাইম ডাটা দেখানোর ফাংশন (renderOrders আপডেট করুন)
function renderOrders() {
  const tbody = document.getElementById('ordersTableBody');
  tbody.innerHTML = '<tr><td colspan="9" class="p-10 text-center text-slate-400">অর্ডার লোড হচ্ছে...</td></tr>';

  // onSnapshot ব্যবহার করায় নতুন অর্ডার আসলেই টেবিল নিজে থেকেই আপডেট হয়ে যাবে
  db.collection('orders').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="9" class="p-10 text-center text-slate-400">এখনো কোনো অর্ডার পাওয়া যায়নি।</td></tr>';
      return;
    }

    tbody.innerHTML = snapshot.docs.map(doc => {
      const o = doc.data();
      return `
        <tr class="hover:bg-stone-50 transition">
          <td class="px-6 py-5 font-mono text-xs text-sage">${o.id || 'N/A'}</td>
          <td class="px-6 py-5">${o.date || ''}</td>
          <td class="px-6 py-5 font-bold">${o.items ? o.items.map((item) => `${item.product} × ${item.quantity}`).join('<br>') : o.product}</td>
          <td class="px-6 py-5">${o.quantity || 1}</td>
          <td class="px-6 py-5 font-bold">${o.name}</td>
          <td class="px-6 py-5 font-mono">${o.phone}</td>
          <td class="order-address px-6 py-5">${o.address}</td>
          <td class="px-6 py-5 font-mono text-sage">${o.promoCode || 'N/A'}</td>
          <td class="px-6 py-5 font-bold text-forest">${formatCurrency(o.subtotal || 0)}</td>
        </tr>
      `;
    }).join('');
  });
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
  cart[index].quantity = Math.max(1, Number(quantity) || 1);
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
        <input type="number" min="1" value="${item.quantity}" onchange="updateQuantity(${index}, this.value)" aria-label="Quantity for ${item.product}" />
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

