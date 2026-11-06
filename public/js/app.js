const state = {
  token: localStorage.getItem('parknova_token'),
  user: null,
  slots: [],
  vehicles: [],
  records: [],
  slotFilter: 'All',
  modalSubmit: null
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const authView = $('#authView');
const appView = $('#appView');
const dialog = $('#formDialog');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function showToast(message, isError = false) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 3200);
}

async function api(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (error) {
    throw new Error('Cannot reach the server. Check that the Node.js server is running.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) logout(false);
    throw new Error(data.message || 'Something went wrong.');
  }
  return data;
}

function setAuthTab(tab) {
  $$('.auth-tab').forEach((button) => button.classList.toggle('active', button.dataset.authTab === tab));
  $('#loginForm').classList.toggle('hidden', tab !== 'login');
  $('#signupForm').classList.toggle('hidden', tab !== 'signup');
  $('#authTitle').textContent = tab === 'login' ? 'Sign in to your space' : 'Create your ParkNova account';
  $('#authSubtitle').textContent = tab === 'login' ? 'Manage your parking experience with ease.' : 'Join ParkNova and keep your journeys moving.';
}

$$('.auth-tab').forEach((button) => button.addEventListener('click', () => setAuthTab(button.dataset.authTab)));

// $('#signupForm').addEventListener('submit', async (event) => {
//   event.preventDefault();
//   const form = new FormData(event.currentTarget);
//   const body = Object.fromEntries(form.entries());
//   try {
//     const result = await api('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) });
//     showToast(result.message);
//     event.currentTarget.reset();
//     setAuthTab('login');
//     $('#loginForm [name="email"]').value = body.email;
//   } catch (error) {
//     showToast(error.message, true);
//   }
// });

$('#signupForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const body = Object.fromEntries(form.entries());

  try {
    const result = await api('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    showToast(result.message);
    formElement.reset();
    setAuthTab('login');
    $('#loginForm [name="email"]').value = body.email;

  } catch (error) {
    showToast(error.message, true);
  }
});



$('#loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.currentTarget).entries());
  try {
    const result = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(body) });
    state.token = result.token;
    state.user = result.user;
    localStorage.setItem('parknova_token', state.token);
    await enterApp();
  } catch (error) {
    showToast(error.message, true);
  }
});

function logout(showMessage = true) {
  state.token = null;
  state.user = null;
  localStorage.removeItem('parknova_token');
  appView.classList.add('hidden');
  authView.classList.remove('hidden');
  if (showMessage) showToast('You have signed out.');
}

$('#logoutBtn').addEventListener('click', () => logout());

async function enterApp() {
  try {
    const result = await api('/api/auth/me');
    state.user = result.user;
    authView.classList.add('hidden');
    appView.classList.remove('hidden');
    const initial = (state.user.name || 'U').charAt(0).toUpperCase();
    $('#sideAvatar').textContent = initial;
    $('#topAvatar').textContent = initial;
    $('#sideName').textContent = state.user.name;
    $('#sideRole').textContent = state.user.role.toUpperCase();
    $('#welcomeName').textContent = state.user.name.split(' ')[0];
    $$('.admin-only').forEach((element) => element.classList.toggle('hidden', state.user.role !== 'admin'));
    $('#year').textContent = new Date().getFullYear();
    $('#dateLabel').textContent = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()).toUpperCase();
    await refreshAll();
    navigate('overview');
  } catch (error) {
    logout(false);
    showToast(error.message, true);
  }
}

async function refreshAll() {
  const [slots, vehicles, records] = await Promise.all([
    api('/api/slots'), api('/api/vehicles'), api('/api/records')
  ]);
  state.slots = slots.slots;
  state.vehicles = vehicles.vehicles;
  state.records = records.records;
  renderSlots();
  renderVehicles();
  renderRecords();
  renderOverview();
}

function navigate(page) {
  $$('.page-content').forEach((section) => section.classList.toggle('hidden', section.id !== `page-${page}`));
  $$('.nav-link[data-page]').forEach((button) => button.classList.toggle('active', button.dataset.page === page));
  const titles = { overview: 'Overview', slots: 'Parking slots', vehicles: 'Vehicles', records: 'Parking records' };
  $('#pageTitle').textContent = titles[page] || 'Overview';
  $('#sidebar').classList.remove('open');
}

$$('.nav-link[data-page]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.page)));
$$('[data-goto]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.goto)));
$('#mobileMenu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

function badge(status) {
  const cls = String(status || '').toLowerCase();
  return `<span class="status-badge ${escapeHtml(cls)}">${escapeHtml(status)}</span>`;
}

function renderOverview() {
  const total = state.slots.length;
  const available = state.slots.filter((slot) => slot.status === 'Available').length;
  $('#statTotal').textContent = total;
  $('#statAvailable').textContent = available;
  $('#statVehicles').textContent = state.vehicles.length;
  const revenue = state.records.reduce((sum, record) => sum + Number(record.parking_fee || 0), 0);
  $('#statRevenue').textContent = `₹${revenue.toFixed(0)}`;
  $('#miniSlotGrid').innerHTML = state.slots.slice(0, 8).map((slot) =>
    `<div class="mini-slot ${slot.status.toLowerCase()}"><strong>${escapeHtml(slot.slot_number)}</strong><small>${escapeHtml(slot.status)}</small></div>`
  ).join('') || '<p class="muted">No slots have been added yet.</p>';
  $('#recentRecords').innerHTML = state.records.slice(0, 5).map((record) =>
    `<tr><td><strong>${escapeHtml(record.vehicle_number)}</strong></td><td>${escapeHtml(record.slot_number)}</td><td>${escapeHtml(record.entry_time)}</td><td>${badge(record.status)}</td><td>₹${Number(record.parking_fee || 0).toFixed(2)}</td></tr>`
  ).join('') || '<tr><td colspan="5" class="empty-cell">No parking activity yet.</td></tr>';
  if (state.user.role === 'admin') {
    api('/api/records/summary/dashboard').then((result) => {
      const stats = result.stats;
      $('#statTotal').textContent = stats.total_slots || 0;
      $('#statAvailable').textContent = stats.available_slots || 0;
      $('#statVehicles').textContent = stats.total_vehicles || 0;
      $('#statRevenue').textContent = `₹${Number(stats.total_revenue || 0).toFixed(0)}`;
    }).catch(() => {});
  }
}

function renderSlots() {
  const filtered = state.slotFilter === 'All' ? state.slots : state.slots.filter((slot) => slot.status === state.slotFilter);
  $('#slotCount').textContent = `${filtered.length} slot${filtered.length === 1 ? '' : 's'}`;
  $('#slotGrid').innerHTML = filtered.map((slot) => `
    <article class="slot-card ${slot.status.toLowerCase()}">
      <div class="slot-top"><span class="slot-symbol">▦</span>${badge(slot.status)}</div>
      <h3>${escapeHtml(slot.slot_number)}</h3>
      <p>${escapeHtml(slot.location)}</p>
      <div class="slot-meta"><small>${escapeHtml(slot.vehicle_type)} space</small><small>ID #${slot.slot_id}</small></div>
      ${state.user.role === 'admin' ? `<div class="slot-admin-actions"><button class="small-btn" data-edit-slot="${slot.slot_id}">Edit status</button><button class="small-btn" data-delete-slot="${slot.slot_id}">Delete</button></div>` : ''}
    </article>`).join('') || '<div class="panel"><p class="muted">No slots match this filter.</p></div>';
  $$('[data-edit-slot]').forEach((button) => button.addEventListener('click', () => editSlot(Number(button.dataset.editSlot))));
  $$('[data-delete-slot]').forEach((button) => button.addEventListener('click', () => deleteSlot(Number(button.dataset.deleteSlot))));
}

$$('[data-slot-filter]').forEach((button) => button.addEventListener('click', () => {
  state.slotFilter = button.dataset.slotFilter;
  $$('[data-slot-filter]').forEach((item) => item.classList.toggle('active', item === button));
  renderSlots();
}));

function renderVehicles() {
  $('#vehicleGrid').innerHTML = state.vehicles.map((vehicle) => `
    <article class="vehicle-card">
      <div class="vehicle-card-top"><span class="vehicle-emoji">${vehicle.vehicle_type.toLowerCase() === 'bike' ? '🏍️' : vehicle.vehicle_type.toLowerCase() === 'ev' ? '⚡' : '🚘'}</span>
      <button class="small-btn" data-delete-vehicle="${vehicle.vehicle_id}">Remove</button></div>
      <h3>${escapeHtml(vehicle.vehicle_number)}</h3><p>${escapeHtml(vehicle.vehicle_model || 'Model not specified')} · ${escapeHtml(vehicle.vehicle_type)}</p>
      ${state.user.role === 'admin' ? `<div class="vehicle-owner">Owner: ${escapeHtml(vehicle.owner_name)}</div>` : ''}
    </article>`).join('') || '<div class="panel"><p class="muted">No vehicles registered yet. Add your first vehicle.</p></div>';
  $$('[data-delete-vehicle]').forEach((button) => button.addEventListener('click', () => deleteVehicle(Number(button.dataset.deleteVehicle))));
}

function renderRecords() {
  $('#recordsBody').innerHTML = state.records.map((record) => `
    <tr><td><strong>${escapeHtml(record.vehicle_number)}</strong><br><span class="muted">${escapeHtml(record.vehicle_type)}</span></td>
    <td>${escapeHtml(record.owner_name)}</td><td>${escapeHtml(record.slot_number)}</td>
    <td>${escapeHtml(record.entry_time)}</td><td>${escapeHtml(record.exit_time || '—')}</td>
    <td>₹${Number(record.parking_fee || 0).toFixed(2)}</td>
    <td>${record.status === 'Parked' ? `<button class="record-action exit" data-exit="${record.record_id}">Record exit</button>` : badge(record.status)}</td></tr>`
  ).join('') || '<tr><td colspan="7" class="empty-cell">No parking records yet. Record the first vehicle entry.</td></tr>';
  $$('[data-exit]').forEach((button) => button.addEventListener('click', () => recordExit(Number(button.dataset.exit))));
}

function openModal(title, eyebrow, fields, submitHandler, submitText = 'Save details') {
  $('#modalTitle').textContent = title;
  $('#modalEyebrow').textContent = eyebrow;
  $('#modalSubmit').textContent = submitText;
  $('#modalFields').innerHTML = fields;
  state.modalSubmit = submitHandler;
  dialog.showModal();
}

function closeModal() {
  dialog.close();
  state.modalSubmit = null;
}

$('#closeModal').addEventListener('click', closeModal);
$('#cancelModal').addEventListener('click', closeModal);
// $('#modalForm').addEventListener('submit', async (event) => {
//   event.preventDefault();
//   if (!state.modalSubmit) return;
//   const values = Object.fromEntries(new FormData(event.currentTarget).entries());
//   try {
//     await state.modalSubmit(values);
//     closeModal();
//     event.currentTarget.reset();
//     await refreshAll();
//   } catch (error) {
//     showToast(error.message, true);
//   }
// });
$('#modalForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const formElement = event.currentTarget;

  if (!state.modalSubmit) return;

  const values = Object.fromEntries(
    new FormData(formElement).entries()
  );

  try {
    await state.modalSubmit(values);

    formElement.reset();
    closeModal();

    await refreshAll();

  } catch (error) {
    showToast(error.message, true);
  }
});

$('#addSlotBtn').addEventListener('click', () => {
  openModal('Add a parking slot', 'FACILITY SETUP', `
    <label>Slot number<input name="slot_number" placeholder="Example: D-01" required></label>
    <label>Vehicle type<select name="vehicle_type" required><option value="Car">Car</option><option value="Bike">Bike</option><option value="EV">EV</option></select></label>
    <label>Location<input name="location" placeholder="Example: Ground Floor" required></label>`,
    async (values) => { const result = await api('/api/slots', { method: 'POST', body: JSON.stringify(values) }); showToast(result.message); });
});

async function editSlot(id) {
  const slot = state.slots.find((item) => item.slot_id === id);
  if (!slot) return;
  openModal(`Edit ${slot.slot_number}`, 'SLOT SETTINGS', `
    <label>Vehicle type<select name="vehicle_type"><option ${slot.vehicle_type === 'Car' ? 'selected' : ''}>Car</option><option ${slot.vehicle_type === 'Bike' ? 'selected' : ''}>Bike</option><option ${slot.vehicle_type === 'EV' ? 'selected' : ''}>EV</option></select></label>
    <label>Location<input name="location" value="${escapeHtml(slot.location)}" required></label>
    <label>Status<select name="status"><option ${slot.status === 'Available' ? 'selected' : ''}>Available</option><option ${slot.status === 'Occupied' ? 'selected' : ''}>Occupied</option><option ${slot.status === 'Maintenance' ? 'selected' : ''}>Maintenance</option></select></label>`,
    async (values) => { const result = await api(`/api/slots/${id}`, { method: 'PUT', body: JSON.stringify(values) }); showToast(result.message); });
}

async function deleteSlot(id) {
  if (!window.confirm('Delete this parking slot?')) return;
  try { const result = await api(`/api/slots/${id}`, { method: 'DELETE' }); showToast(result.message); await refreshAll(); }
  catch (error) { showToast(error.message, true); }
}

$('#addVehicleBtn').addEventListener('click', () => {
  openModal('Register a vehicle', 'YOUR GARAGE', `
    <label>Vehicle number<input name="vehicle_number" placeholder="Example: AP 39 AB 1234" required></label>
    <label>Vehicle type<select name="vehicle_type" required><option value="Car">Car</option><option value="Bike">Bike</option><option value="EV">EV</option></select></label>
    <label>Vehicle model<input name="vehicle_model" placeholder="Example: Honda City"></label>`,
    async (values) => { const result = await api('/api/vehicles', { method: 'POST', body: JSON.stringify(values) }); showToast(result.message); });
});

async function deleteVehicle(id) {
  if (!window.confirm('Remove this vehicle?')) return;
  try { const result = await api(`/api/vehicles/${id}`, { method: 'DELETE' }); showToast(result.message); await refreshAll(); }
  catch (error) { showToast(error.message, true); }
}

$('#entryBtn').addEventListener('click', () => {
  const availableSlots = state.slots.filter((slot) => slot.status === 'Available');
  if (!state.vehicles.length) return showToast('Register a vehicle before recording an entry.', true);
  if (!availableSlots.length) return showToast('There are no available parking slots.', true);
  const vehicleOptions = state.vehicles.map((vehicle) => `<option value="${vehicle.vehicle_id}">${escapeHtml(vehicle.vehicle_number)} · ${escapeHtml(vehicle.vehicle_type)}</option>`).join('');
  const slotOptions = availableSlots.map((slot) => `<option value="${slot.slot_id}">${escapeHtml(slot.slot_number)} · ${escapeHtml(slot.vehicle_type)} · ${escapeHtml(slot.location)}</option>`).join('');
  openModal('Record vehicle entry', 'ARRIVAL CONTROL', `
    <label>Select vehicle<select name="vehicle_id" required>${vehicleOptions}</select></label>
    <label>Assign parking slot<select name="slot_id" required>${slotOptions}</select></label>`,
    async (values) => { const result = await api('/api/records/entry', { method: 'POST', body: JSON.stringify(values) }); showToast(result.message); },
    'Confirm entry');
});

async function recordExit(id) {
  if (!window.confirm('Record the exit for this vehicle? The parking fee will be calculated automatically.')) return;
  try {
    const result = await api(`/api/records/${id}/exit`, { method: 'POST', body: JSON.stringify({}) });
    showToast(result.message);
    await refreshAll();
  } catch (error) { showToast(error.message, true); }
}

(async function init() {
  if (state.token) {
    try { await enterApp(); }
    catch (error) { logout(false); }
  }
})();
