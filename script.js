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

function openCheckout(productName) {
  document.getElementById('productInput').value = productName;
  document.getElementById('selectedProductDisplay').innerText = "Selected Item: " + productName;
  document.getElementById('checkoutModal').classList.remove('hidden');
  document.getElementById('orderFormView').classList.remove('hidden');
  document.getElementById('successView').classList.add('hidden');
}

function closeCheckout() {
  document.getElementById('checkoutModal').classList.add('hidden');
}

function handleOrderSubmit(e) {
  e.preventDefault();
  const newOrder = {
    id: 'SND-' + Math.floor(1000 + Math.random() * 9000),
    date: new Date().toLocaleDateString('bn-BD'),
    product: document.getElementById('productInput').value,
    name: document.getElementById('fullName').value,
    phone: document.getElementById('phoneNumber').value,
    address: document.getElementById('address').value
  };

  const orders = getOrders();
  orders.unshift(newOrder);
  saveOrders(orders);

  document.getElementById('orderFormView').classList.add('hidden');
  document.getElementById('successView').classList.remove('hidden');
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
    tbody.innerHTML = '<tr><td colspan="6" class="p-10 text-center text-slate-400">এখনো কোনো অর্ডার পাওয়া যায়নি।</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(o => `
    <tr class="hover:bg-stone-50 transition">
      <td class="px-6 py-5 font-mono text-xs text-sage">${o.id}</td>
      <td class="px-6 py-5">${o.date}</td>
      <td class="px-6 py-5 font-bold">${o.product}</td>
      <td class="px-6 py-5 font-bold">${o.name}</td>
      <td class="px-6 py-5 font-mono">${o.phone}</td>
      <td class="px-6 py-5 max-w-xs truncate">${o.address}</td>
    </tr>
  `).join('');
}
