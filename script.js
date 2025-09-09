const API_BASE = "https://openapi.programming-hero.com/api";
const CATEGORIES_ENDPOINT = `${API_BASE}/categories`;
const CATEGORY_BY_ID = id => `${API_BASE}/category/${id}`;
const PLANT_BY_ID = id => `${API_BASE}/plant/${id}`;


const categoriesList = document.getElementById('categories-list');
const cardsGrid = document.getElementById('cards-grid');
const spinner = document.getElementById('spinner');
const cartItemsEl = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

let activeCategoryBtn = null;
let cart = new Map(); 
function showSpinner(show = true){
  spinner.classList.toggle('hidden', !show);
}


function findArrayInResponse(json){
  if (!json) return [];
  if (Array.isArray(json)) return json;
  for (const k of Object.keys(json)){
    if (Array.isArray(json[k])) return json[k];
  }
  return [];
}


function formatPrice(n){
  return `৳${n}`;
}


async function loadCategories(){
  showSpinner(true);
  try {
    const res = await fetch(CATEGORIES_ENDPOINT);
    const json = await res.json();
    const categories = findArrayInResponse(json) || [];
    if (categories.length === 0){
      categoriesList.innerHTML = `<button class="active">All Trees</button>`;
      return;
    }

    categoriesList.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.textContent = 'All Trees';
    allBtn.dataset.id = 'all';
    allBtn.classList.add('active');
    categoriesList.appendChild(allBtn);
    allBtn.addEventListener('click', () => onCategoryClick(allBtn,'all'));

    categories.forEach(cat => {
      const name = cat.name || cat.category_name || cat.category || cat.title || 'Category';
      const id = cat.id || cat.category_id || cat._id || cat.idCategory || cat.category_id;
      const btn = document.createElement('button');
      btn.textContent = name;
      if (id) btn.dataset.id = id;
      categoriesList.appendChild(btn);
      btn.addEventListener('click', () => onCategoryClick(btn, id));
    });

    onCategoryClick(allBtn, 'all');
  } catch (err){
    console.error('Failed to load categories', err);
    categoriesList.innerHTML = `<p style="color:#b33">Failed to load categories</p>`;
  } finally {
    showSpinner(false);
  }
}


async function onCategoryClick(btn, id){
  if (activeCategoryBtn) activeCategoryBtn.classList.remove('active');
  btn.classList.add('active');
  activeCategoryBtn = btn;

  await loadTreesForCategory(id);
}


async function loadTreesForCategory(id){
  showSpinner(true);
  cardsGrid.innerHTML = ''; 

  try {
    let url = id === 'all' ? `${API_BASE}/plants` : CATEGORY_BY_ID(id);
    const res = await fetch(url);
    const json = await res.json();
    const arr = findArrayInResponse(json) || [];

    if (arr.length === 0) {
      cardsGrid.innerHTML = `<p style="grid-column:1/-1;padding:18px">No trees found for this category.</p>`;
      return;
    }

    for (const item of arr){
      const id = item.id || item._id || item.plant_id || item.plantId || item.idPlant || item.plant_id;
      const name = item.name || item.plant_name || item.common_name || item.title || 'Unnamed';
      const image = item.image || item.image_url || item.thumbnail || item.img || '';
      const short = (item.short_description || item.description || item.details || item.info || '').slice(0,120);
      const price = item.price || item.cost || 500;
      const category = item.category || item.category_name || item.cat || '';

      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `
        <img src="${image || 'https://via.placeholder.com/400x240?text=No+Image'}" alt="${name}">
        <h4 data-id="${id}" class="plant-name">${name}</h4>
        <p>${short || 'No description available'}</p>
        <div class="cat">${category || 'Tree'}</div>
        <div class="price-row">
          <div class="price">${formatPrice(price)}</div>
          <button class="add-btn" data-id="${id}" data-name="${name}" data-price="${price}">Add to Cart</button>
        </div>
      `;
      cardsGrid.appendChild(card);

      card.querySelector('.plant-name').addEventListener('click', () => openModalWithPlant(id));
      card.querySelector('.add-btn').addEventListener('click', () => addToCart({
        id: id,
        name: name,
        price: Number(price)
      }));
    }

  } catch (err){
    console.error('Failed to load trees', err);
    cardsGrid.innerHTML = `<p style="grid-column:1/-1;color:#b33">Failed to load trees.</p>`;
  } finally {
    showSpinner(false);
  }
}


function addToCart(item){
  if (!item.id) return;
  const existing = cart.get(item.id);
  if (existing) existing.qty += 1;
  else cart.set(item.id, {...item, qty:1});
  
  renderCart();

  alert(`🌳 "${item.name}" added to cart!`);
}





function removeFromCart(id){
  if (!cart.has(id)) return;
  cart.delete(id);
  renderCart();
}


function renderCart(){
  cartItemsEl.innerHTML = '';
  if (cart.size === 0){
    cartItemsEl.innerHTML = `<p class="empty-cart">No items yet</p>`;
    cartTotalEl.textContent = formatPrice(0);
    return;
  }

  let total = 0;
  for (const [id, item] of cart){
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div>
        <div class="name">${item.name}</div>
        <div class="qty">x${item.qty} • ${formatPrice(item.price)}</div>
      </div>
      <div><button class="remove" data-id="${id}">❌</button></div>
    `;
    cartItemsEl.appendChild(row);
    row.querySelector('.remove').addEventListener('click', () => removeFromCart(id));
    total += item.price * item.qty;
  }
  cartTotalEl.textContent = formatPrice(total);
}

async function openModalWithPlant(id){
  if (!id){
    modalBody.innerHTML = `<p>No details available</p>`;
    modal.classList.remove('hidden');
    return;
  }

  
  modalBody.innerHTML = `<div class="spinner"></div>`;
  modal.classList.remove('hidden');

  try {
    const res = await fetch(PLANT_BY_ID(id));
    const json = await res.json();
    let plant = null;

    if (json && typeof json === 'object'){
      if (json.data && typeof json.data === 'object') plant = json.data;
      else {
        for (const key of Object.keys(json)){
          if (json[key] && typeof json[key] === 'object' && !Array.isArray(json[key])){
            plant = json[key]; break;
          }
        }
      }
    }

    if (!plant){
      const arr = findArrayInResponse(json);
      if (arr.length) plant = arr[0];
    }

    if (!plant){
      modalBody.innerHTML = `<p>Details not available.</p>`;
      return;
    }

    const name = plant.name || plant.plant_name || plant.common_name || 'Tree';
    const image = plant.image || plant.image_url || plant.img || '';
    const desc = plant.description || plant.details || plant.info || 'No details available';
    const price = plant.price || plant.cost || 500;
    const category = plant.category || plant.category_name || '';

    modalBody.innerHTML = `
      <div style="display:flex;gap:14px;flex-direction:column">
        <div style="display:flex;gap:14px;flex-wrap:wrap">
          <img src="${image || 'https://via.placeholder.com/400x240?text=No+Image'}" alt="${name}" style="width:240px;height:160px;object-fit:cover;border-radius:8px">
          <div>
            <h3 style="margin:0 0 6px">${name}</h3>
            <div style="font-size:13px;margin-bottom:8px;color:#666">${category}</div>
            <div style="font-weight:700;margin-bottom:8px">${formatPrice(price)}</div>
            <button id="modal-add" class="add-btn" style="padding:8px 12px">Add to Cart</button>
          </div>
        </div>
        <div style="font-size:14px;color:#333">${desc}</div>
      </div>
    `;
    document.getElementById('modal-add').addEventListener('click', () => {
      addToCart({id, name, price:Number(price)});
      modal.classList.add('hidden');
    });

  } catch(err){
    console.error('Plant fetch error', err);
    modalBody.innerHTML = `<p>Failed to load details.</p>`;
  }
}


modalClose.addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', e => {
  if (e.target === modal) modal.classList.add('hidden');
});


document.getElementById('donate-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('donor-name').value.trim();
  const email = document.getElementById('donor-email').value.trim();
  const count = document.getElementById('donor-count').value;
  if (!name || !email || !count){
    alert('Please provide name, email and number of trees.');
    return;
  }
  alert(`Thanks ${name}! Donation for ${count} trees received (demo).`);
  e.target.reset();
});

loadCategories();
renderCart();
