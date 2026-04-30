

const API_BASE = 'http://localhost:3000';

let products = [];
let cart = [];
let orders = [];

async function loadProducts() {
  try {
    const res = await fetch(`${API_BASE}/products`);
    products = await res.json();
    renderProducts();
  } catch (error) {
    console.error('Failed to load products:', error);
    document.getElementById('productGrid').innerHTML = 'Failed to load products';
  }
}

async function loadOrders() {
  try {
    const res = await fetch(`${API_BASE}/orders`);
    orders = await res.json();
    renderOrders();
  } catch (error) {
    console.error('Failed to load orders:', error);
    document.getElementById('ordersList').innerHTML = 'Failed to load orders';
  }
}

function renderProducts() {
  let q = document.getElementById('search').value.toLowerCase();
  let grid = document.getElementById('productGrid');
  grid.innerHTML = '';

  products.forEach(p => {
    if (p.name.toLowerCase().includes(q)) {
      grid.innerHTML += `
        <div class="card">
          <img src="${p.img}" width="100%">
          <h3>${p.name}</h3>
          <p>₹${p.price}</p>
          <p>Stock: ${p.stock}</p>
          <button onclick="addToCart(${p.id})">Add</button>
        </div>
      `;
    }
  });
}

function addToCart(id) {
  let p = products.find(x => x.id === id);
  let f = cart.find(x => x.id === id);

  if (!p) return;

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
  let div = document.getElementById('cartItems');
  div.innerHTML = '';
  let total = 0;

  if (cart.length === 0) {
    div.innerHTML = 'Cart empty';
  }

  cart.forEach(i => {
    total += i.price * i.qty;

    div.innerHTML += `
      <p>
        ${i.name} x ${i.qty} = ₹${i.price * i.qty}
        <button onclick="changeQty(${i.id},-1)">-</button>
        <button onclick="changeQty(${i.id},1)">+</button>
      </p>
    `;
  });

  document.getElementById('total').innerText = total;
}

function changeQty(id, delta) {
  let item = cart.find(x => x.id === id);
  if (!item) return;

  let product = products.find(p => p.id === id);
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
  let name = document.getElementById('custName').value.trim();
  let msg = document.getElementById('orderMsg');

  if (!name) {
    msg.innerText = 'Enter name';
    return;
  }

  if (cart.length === 0) {
    msg.innerText = 'Cart empty';
    return;
  }

  try {
    let total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    let items = cart.map(i => `${i.name} x ${i.qty}`).join(', ');

    // Reduce stock on server
    for (let item of cart) {
      let product = products.find(p => p.id === item.id);
      if (!product) continue;

      let newStock = product.stock - item.qty;

      const updateRes = await fetch(`${API_BASE}/products/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stock: newStock })
      });

      if (!updateRes.ok) {
        throw new Error(`Failed to update stock for product ${item.id}`);
      }

      product.stock = newStock;
    }

    // Save order on server
    const orderRes = await fetch(`${API_BASE}/orders`, {
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

    document.getElementById('custName').value = '';
    msg.innerText = 'Order placed!';
  } catch (error) {
    console.error(error);
    msg.innerText = 'Something went wrong while placing order';
  }
}

function renderOrders() {
  let box = document.getElementById('ordersList');

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
});