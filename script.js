const API_BASE = 'https://shopease-api-jfjy.onrender.com';

let products = [];
let cart = [];
let orders = [];

const el = (id) => document.getElementById(id);

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(HTTP ${res.status} ${res.statusText} ${text});
  }

  return res.json();
}

async function loadProducts() {
  const grid = el('productGrid');
  if (!grid) return;

  try {
    const data = await fetchJSON(${API_BASE}/products);
    products = Array.isArray(data) ? data : [];
    renderProducts();
  } catch (error) {
    console.error('Failed to load products:', error);
    grid.innerHTML = '<p>Failed to load products</p>';
  }
}

async function loadOrders() {
  const box = el('ordersList');
  if (!box) return;

  try {
    const data = await fetchJSON(${API_BASE}/orders);
    orders = Array.isArray(data) ? data : [];
    renderOrders();
  } catch (error) {
    console.error('Failed to load orders:', error);
    box.innerHTML = '<p>Failed to load orders</p>';
  }
}

function renderProducts() {
  const grid = el('productGrid');
  if (!grid) return;

  const searchInput = el('search');
  const q = (searchInput ? searchInput.value : '').trim().toLowerCase();

  const filtered = products.filter((p) =>
    (p.name || '').toLowerCase().includes(q)
  );

  if (filtered.length === 0) {
    grid.innerHTML = '<p>No products found</p>';
    return;
  }

  grid.innerHTML = filtered.map((p) => `
    <div class="card">
      <img src="${p.img}" alt="${p.name}" width="100%" style="object-fit:cover;">
      <h3>${p.name}</h3>
      <p>₹${p.price}</p>
      <p>Stock: ${p.stock}</p>
      <button onclick="addToCart(${p.id})">Add</button>
    </div>
  `).join('');
}

function addToCart(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  const f = cart.find(x => x.id === id);

  if (f) {
    if (f.qty < p.stock) {
      f.qty++;
    } else {
      alert('Out of stock');
    }
  } else {
    cart.push({ ...p, qty: 1 });
  }

  renderCart();
}

function renderCart() {
  const div = el('cartItems');
  const totalEl = el('total');
  if (!div || !totalEl) return;

  div.innerHTML = '';
  let total = 0;

  if (cart.length === 0) {
    div.innerHTML = 'Cart empty';
    totalEl.innerText = '0';
    return;
  }

  cart.forEach((i) => {
    total += i.price * i.qty;

    div.innerHTML += `
      <p>
        ${i.name} x ${i.qty} = ₹${i.price * i.qty}
        <button onclick="changeQty(${i.id}, -1)">-</button>
        <button onclick="changeQty(${i.id}, 1)">+</button>
      </p>
    `;
  });

  totalEl.innerText = total;
}

function changeQty(id, delta) {
  const item = cart.find(x => x.id === id);
  if (!item) return;

  const product = products.find(p => p.id === id);
  if (!product) return;

  if (delta === 1 && item.qty >= product.stock) {
    alert('Max stock reached');
    return;
  }

  item.qty += delta;

  if (item.qty <= 0) {
    cart = cart.filter(x => x.id !== id);
  }

  renderCart();
}

async function placeOrder() {
  const nameInput = el('custName');
  const msg = el('orderMsg');

  if (!nameInput || !msg) return;

  const name = nameInput.value.trim();

  if (!name) {
    msg.innerText = 'Enter name';
    return;
  }

  if (cart.length === 0) {
    msg.innerText = 'Cart empty';
    return;
  }

  try {
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const items = cart.map(i => ${i.name} x ${i.qty}).join(', ');

    for (const item of cart) {
      const product = products.find(p => p.id === item.id);
      if (!product) continue;

      const newStock = product.stock - item.qty;

      const updateRes = await fetch(${API_BASE}/products/${item.id}, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...product,
          stock: newStock
        })
      });

      if (!updateRes.ok) {
        throw new Error(Failed to update stock for product ${item.id});
      }

      product.stock = newStock;
    }

    const orderRes = await fetch(${API_BASE}/orders, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        total,
        items,
        date: new Date().toISOString()
      })
    });

    if (!orderRes.ok) {
      throw new Error('Failed to save order');
    }

    const savedOrder = await orderRes.json();
    orders.unshift(savedOrder);

    cart = [];
    renderCart();
    renderProducts();
    renderOrders();

    nameInput.value = '';
    msg.innerText = 'Order placed!';
  } catch (error) {
    console.error(error);
    msg.innerText = 'Something went wrong while placing order';
  }
}

function renderOrders() {
  const box = el('ordersList');
  if (!box) return;

  if (orders.length === 0) {
    box.innerHTML = 'No orders';
    return;
  }

  box.innerHTML = orders.map(o => `
    <div class="section">
      <strong>Order #${o.id}</strong><br>
      ${o.name}<br>
      ₹${o.total}<br>
      ${o.items}<br>
      ${o.date ? new Date(o.date).toLocaleString() : ''}
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  await loadOrders();
  renderCart();

  const searchInput = el('search');
  if (searchInput) {
    searchInput.addEventListener('input', renderProducts);
  }
});