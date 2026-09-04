tailwind.config = {
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'Hind Siliguri', 'sans-serif'], serif: ['Georgia', 'serif'] },
      colors: { forest: '#0d2818', sage: '#2d6a4f', emerald: '#1b4332', sand: '#fcfaf7', accent: '#d4a373' },
      animation: { 'blob': 'blob 7s infinite', 'fade-in': 'fadeIn 0.5s ease-out' },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        fadeIn: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } }
      }
    }
  }
};

const getOrders = () => JSON.parse(localStorage.getItem('sondhi_orders') || '[]');
const saveOrders = (orders) => localStorage.setItem('sondhi_orders', JSON.stringify(orders));
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

function handleOrderSubmit(e) {
  e.preventDefault();
  const newOrder = {
    id: 'SND-' + Math.floor(1000 + Math.random() * 9000),
    date: new Date().toLocaleDateString('bn-BD'),
    product: cart.map((item) => `${item.product} × ${item.quantity}`).join(', '),
    name: document.getElementById('fullName').value,
    phone: document.getElementById('phoneNumber').value,
    address: document.getElementById('address').value,
    promoCode: document.getElementById('promoCode').value.trim() || 'N/A',
    items: cart.map((item) => ({ ...item })),
    quantity: cart.reduce((total, item) => total + item.quantity, 0),
    subtotal: getCartSubtotal()
  };

  const orders = getOrders();
  orders.unshift(newOrder);
  saveOrders(orders);

  document.getElementById('orderFormView').classList.add('hidden');
  document.getElementById('successView').classList.remove('hidden');
  cart = [];
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

function renderOrders() {
  const orders = getOrders();
  const tbody = document.getElementById('ordersTableBody');

  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="p-10 text-center text-slate-400">এখনো কোনো অর্ডার পাওয়া যায়নি।</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(o => `
    <tr class="hover:bg-stone-50 transition">
      <td class="px-6 py-5 font-mono text-xs text-sage">${o.id}</td>
      <td class="px-6 py-5">${o.date}</td>
      <td class="px-6 py-5 font-bold">${o.items ? o.items.map((item) => `${item.product} × ${item.quantity}`).join('<br>') : o.product}</td>
      <td class="px-6 py-5">${o.quantity || 1}</td>
      <td class="px-6 py-5 font-bold">${o.name}</td>
      <td class="px-6 py-5 font-mono">${o.phone}</td>
      <td class="order-address px-6 py-5">${o.address}</td>
      <td class="px-6 py-5 font-mono text-sage">${o.promoCode || 'N/A'}</td>
      <td class="px-6 py-5 font-bold text-forest">${formatCurrency(o.subtotal || 0)}</td>
    </tr>
  `).join('');
}
