'use strict';

// ─── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_FEED_URL = 'https://raw.githubusercontent.com/dunnryan220-ux/autohive-inventory/main/AutoHive_Inventory_Full.csv';

// ─── State ────────────────────────────────────────────────────────────────────

let _inventory  = [];
let _statuses   = {};
let _filter     = 'all';
let _query      = '';
let _modalVin   = null;
let _queueTotal = 0;

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  bindStaticEvents();
  await restoreSavedFeedUrl();

  // Always load from cache first — never auto-fetch on startup
  const cached = await loadFromLocalStorage();
  if (cached && cached.length) {
    _inventory = cached;
    await loadStatuses();
    updateStats();
    renderGrid();
    showState('grid');
    updateCacheTimestamp(await getTimestamp());
  } else {
    // No cache — show empty state prompting the user to refresh
    showState('empty');
    $('stat-total').textContent = '0';
    $('stat-active').textContent = '0';
    $('stat-staged').textContent = '0';
    $('stat-oos').textContent = '0';
  }

  startStorageWatcher();
});

// ─── Feed URL persistence ─────────────────────────────────────────────────────

async function restoreSavedFeedUrl() {
  const result = await chrome.storage.local.get('ht_feed_url');
  if (result.ht_feed_url) {
    $('feed-url-input').value = result.ht_feed_url;
    $('feed-url-status').textContent = '✓ custom URL';
  } else {
    $('feed-url-input').value = DEFAULT_FEED_URL;
  }
}

function getActiveFeedUrl() {
  const val = $('feed-url-input').value.trim();
  return val || DEFAULT_FEED_URL;
}

// ─── Static event bindings ────────────────────────────────────────────────────

function bindStaticEvents() {
  $('btn-refresh').addEventListener('click', () => fetchAndLoad(true));

  $('btn-save-url').addEventListener('click', async () => {
    const url = $('feed-url-input').value.trim();
    await chrome.storage.local.set({ ht_feed_url: url || DEFAULT_FEED_URL });
    $('feed-url-status').textContent = 'Saved — fetching…';
    await fetchAndLoad(true);
    $('feed-url-status').textContent = '✓ saved';
  });

  $('btn-upload-csv').addEventListener('click', () => $('csv-file-input').click());
  $('csv-file-input').addEventListener('change', handleCSVUpload);

  $('btn-post-all').addEventListener('click', postAllInventory);
  $('btn-cancel-queue').addEventListener('click', cancelQueue);

  $('search-input').addEventListener('input', () => {
    _query = $('search-input').value.trim().toLowerCase();
    renderGrid();
  });

  // Always boot with "All" filter active regardless of prior state
  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  document.querySelector('.filter-tab[data-filter="all"]').classList.add('active');
  _filter = 'all';

  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _filter = btn.dataset.filter;
      renderGrid();
    });
  });

  $('modal-close').addEventListener('click', closeModal);
  $('modal-copy').addEventListener('click', copyModalDescription);
  $('modal-regen').addEventListener('click', regenModalDescription);
  $('modal-overlay').addEventListener('click', e => { if (e.target === $('modal-overlay')) closeModal(); });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

// ─── Direct CSV fetch (no service worker) ─────────────────────────────────────

async function fetchAndLoad(force = false) {
  // Only show loading spinner if we have no data yet
  if (!_inventory.length) showState('loading');
  setFeedStatus('Fetching…');

  try {
    const url     = getActiveFeedUrl();
    const csvText = await fetchCSV(url);
    const parsed  = parseCSV(csvText);

    if (!parsed.length) throw new Error('CSV parsed but no vehicles found. Check the feed URL.');

    _inventory = parsed;
    await chrome.storage.local.set({
      ht_inventory: _inventory,
      ht_inventory_timestamp: Date.now(),
    });

    await loadStatuses();
    updateStats();
    renderGrid();
    showState('grid');
    updateCacheTimestamp(Date.now());
    setFeedStatus(`✓ ${_inventory.length} vehicles`);
    toast(`✅ ${_inventory.length} vehicles loaded`, 'success');

  } catch (err) {
    console.error('[Hatchett Torque] fetch error:', err);
    setFeedStatus('❌ fetch failed');

    if (_inventory.length) {
      // Already have data on screen — just warn, don't wipe the grid
      toast(`⚠️ Refresh failed: ${err.message} — showing cached data.`, 'error');
    } else {
      // Nothing on screen — try falling back to storage cache
      const fallback = await loadFromLocalStorage();
      if (fallback && fallback.length) {
        _inventory = fallback;
        await loadStatuses();
        updateStats();
        renderGrid();
        showState('grid');
        toast(`⚠️ Live fetch failed — loaded ${fallback.length} cached vehicles.`, 'error');
      } else {
        showState('error');
        $('error-message').textContent =
          `${err.message}\n\nTo fix: go to chrome://extensions → find Hatchett Torque → click the ↺ reload icon. Or use "Upload CSV" to load a local file.`;
      }
    }
  }
}

async function fetchCSV(url) {
  const resp = await fetch(url, { cache: 'no-store' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching feed — check URL: ${url}`);
  const text = await resp.text();
  if (!text.trim()) throw new Error('Feed returned empty response.');
  return text;
}

// ─── Local CSV file upload ─────────────────────────────────────────────────────

async function handleCSVUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  $('csv-file-input').value = '';

  showState('loading');
  try {
    const csvText  = await file.text();
    _inventory     = parseCSV(csvText);
    if (!_inventory.length) throw new Error('No vehicle rows found in this CSV file.');

    await chrome.storage.local.set({
      ht_inventory: _inventory,
      ht_inventory_timestamp: Date.now(),
    });

    await loadStatuses();
    updateStats();
    renderGrid();
    showState('grid');
    updateCacheTimestamp(Date.now());
    toast(`✅ ${_inventory.length} vehicles loaded from ${file.name}`, 'success');
  } catch (err) {
    showState('error');
    $('error-message').textContent = 'Upload failed: ' + err.message;
    toast('❌ ' + err.message, 'error');
  }
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

async function loadFromLocalStorage() {
  const r = await chrome.storage.local.get('ht_inventory');
  return r.ht_inventory || [];
}

async function loadStatuses() {
  const r = await chrome.storage.local.get('ht_statuses');
  _statuses = r.ht_statuses || {};
}

async function getTimestamp() {
  const r = await chrome.storage.local.get('ht_inventory_timestamp');
  return r.ht_inventory_timestamp || null;
}

// ─── CSV parser (mirrors background.js — must stay in sync) ───────────────────

const FEED_COLS = {
  vin:               ['vin'],
  stocknumber:       ['stock #', 'stock#', 'stock', 'stocknumber', 'stock_number'],
  newused:           ['new/used', 'newused', 'condition'],
  year:              ['year', 'modelyear'],
  make:              ['make'],
  model:             ['model'],
  series:            ['series', 'trim', 'trimlevel'],
  body:              ['body', 'bodystyle', 'body style'],
  transmission:      ['transmission', 'trans'],
  odometer:          ['odometer', 'mileage', 'miles'],
  enginecylinderct:  ['engine cylinder ct', 'enginecylinderct', 'cylinders'],
  enginedisplacement:['engine displacement', 'enginedisplacement'],
  drivetraindesc:    ['drivetrain desc', 'drivetraindesc', 'drivetrain'],
  colour:            ['colour', 'color', 'exteriorcolor', 'exterior color'],
  interiorcolor:     ['interior color', 'interiorcolor'],
  price:             ['price', 'listprice', 'sellingprice'],
  msrp:              ['msrp'],
  description:       ['description', 'comments'],
  features:          ['features', 'options', 'equipment'],
  citympg:           ['city mpg', 'citympg'],
  highwaympg:        ['highway mpg', 'highwaympg', 'hwy mpg'],
  photos:            ['photos', 'images', 'imageurls', 'photourl'],
  dealername:        ['dealer name', 'dealername'],
  engine:            ['engine'],
  fuel:              ['fuel', 'fueltype', 'fuel type'],
  age:               ['age', 'days on lot'],
  dealercity:        ['dealer city', 'dealercity'],
  dealerregion:      ['dealer region', 'dealerregion', 'state'],
  certified:         ['certified'],
};

function parseCSV(raw) {
  const text = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  const lines = splitCSVIntoRows(text);
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map(h => h.trim().toLowerCase());

  function colIdx(key) {
    const aliases = FEED_COLS[key] || [key];
    for (const a of aliases) {
      const i = headers.indexOf(a.toLowerCase());
      if (i !== -1) return i;
    }
    return -1;
  }

  // Pre-compute column indices once
  const idx = {};
  Object.keys(FEED_COLS).forEach(k => { idx[k] = colIdx(k); });

  const get = (cells, key) => idx[key] !== -1 ? (cells[idx[key]] || '').trim() : '';

  const inventory = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells = splitCSVLine(line);
    const vin   = get(cells, 'vin');
    if (!vin) continue;

    const priceRaw  = get(cells, 'price') || get(cells, 'msrp');
    const engineRaw = get(cells, 'engine') ||
      [get(cells, 'enginedisplacement'), get(cells, 'enginecylinderct') ? get(cells, 'enginecylinderct') + '-cyl' : '']
        .filter(Boolean).join(' ');

    inventory.push({
      vin,
      stockNumber:  get(cells, 'stocknumber'),
      year:         get(cells, 'year'),
      make:         get(cells, 'make'),
      model:        get(cells, 'model'),
      trim:         get(cells, 'series'),
      condition:    get(cells, 'newused'),
      price:        priceRaw,
      msrp:         get(cells, 'msrp'),
      mileage:      get(cells, 'odometer'),
      exteriorColor:get(cells, 'colour'),
      interiorColor:get(cells, 'interiorcolor'),
      engine:       engineRaw,
      transmission: get(cells, 'transmission'),
      drivetrain:   get(cells, 'drivetraindesc'),
      fuelType:     get(cells, 'fuel'),
      bodyStyle:    get(cells, 'body'),
      cityMpg:      get(cells, 'citympg'),
      hwyMpg:       get(cells, 'highwaympg'),
      dealerName:   get(cells, 'dealername'),
      dealerCity:   get(cells, 'dealercity'),
      dealerRegion: get(cells, 'dealerregion'),
      daysOnLot:    get(cells, 'age'),
      certified:    get(cells, 'certified'),
      images:       pipeSplit(get(cells, 'photos')),
      features:     pipeSplit(get(cells, 'features')),
      description:  get(cells, 'description'),
    });
  }
  return inventory;
}

// Split CSV text into logical rows, handling quoted newlines
function splitCSVIntoRows(text) {
  const rows  = [];
  let cur     = '';
  let inQ     = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQ = !inQ;
      cur += ch;
    } else if (!inQ && (ch === '\n' || (ch === '\r' && text[i+1] === '\n'))) {
      if (ch === '\r') i++;
      rows.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur) rows.push(cur);
  return rows;
}

function splitCSVLine(line) {
  const fields = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i+1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ',') { fields.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function pipeSplit(val) {
  return val ? val.split('|').map(s => s.trim()).filter(Boolean) : [];
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function updateStats() {
  const counts = { active: 0, staged: 0, out_of_stock: 0 };
  _inventory.forEach(v => {
    const s = _statuses[v.vin];
    if (s && counts[s] !== undefined) counts[s]++;
  });
  $('stat-total').textContent  = _inventory.length;
  $('stat-active').textContent = counts.active;
  $('stat-staged').textContent = counts.staged;
  $('stat-oos').textContent    = counts.out_of_stock;
}

// ─── Grid rendering ────────────────────────────────────────────────────────────

function renderGrid() {
  const grid     = $('inventory-grid');
  const filtered = getFiltered();

  $('result-count').textContent = filtered.length !== _inventory.length
    ? `${filtered.length} of ${_inventory.length}`
    : `${_inventory.length} vehicles`;

  grid.innerHTML = '';

  if (!filtered.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--text-muted);">
      <div style="font-size:36px;opacity:.4;margin-bottom:12px">🔍</div>
      No vehicles match your search or filter.
    </div>`;
    return;
  }

  filtered.forEach((v, i) => grid.appendChild(buildVehicleCard(v, i)));
}

function getFiltered() {
  return _inventory.filter(v => {
    const s = _statuses[v.vin] || 'unset';
    if (_filter !== 'all' && s !== _filter) return false;
    if (!_query) return true;
    return [v.year, v.make, v.model, v.trim, v.vin, v.stockNumber, v.exteriorColor, v.price]
      .join(' ').toLowerCase().includes(_query);
  });
}

// ─── Vehicle card ─────────────────────────────────────────────────────────────

const STATUS_LABELS = { active: 'Active', staged: 'Staged', out_of_stock: 'Sold', unset: 'In Stock' };
const STATUS_CYCLE  = ['unset', 'staged', 'active', 'out_of_stock'];

function buildVehicleCard(v, index) {
  const status = _statuses[v.vin] || 'unset';
  const price  = HatchettCopywriter.formatPrice(v.price);
  const miles  = HatchettCopywriter.formatMileage(v.mileage);
  const thumb  = v.images?.[0] || '';

  const card = document.createElement('div');
  card.className = 'vehicle-card';
  card.style.animationDelay = `${Math.min(index * 20, 300)}ms`;
  card.dataset.vin = v.vin;

  card.innerHTML = `
    ${thumb ? `<img class="vehicle-card-thumb" src="${esc(thumb)}" alt="" loading="lazy"
        onerror="this.style.display='none';this.nextSibling.style.display='flex'">` : ''}
    <div class="vehicle-card-thumb-placeholder" style="${thumb ? 'display:none' : ''}">🚗</div>

    <div class="vehicle-card-body">
      <div class="vehicle-card-title">${esc(v.year)} ${esc(v.make)} ${esc(v.model)}
        ${v.trim ? `<span style="font-weight:500;color:var(--text-secondary);font-size:13px"> ${esc(v.trim)}</span>` : ''}
      </div>
      <div class="vehicle-card-sub">${v.stockNumber ? 'Stock #' + esc(v.stockNumber) + ' · ' : ''}${esc(v.vin?.slice(-8) || '—')}</div>
      <div class="vehicle-card-price">${esc(price)}</div>
      <div class="vehicle-card-mileage">${esc(miles)}${v.drivetrain ? ' · ' + esc(v.drivetrain) : ''}</div>
    </div>

    <div class="vehicle-card-footer">
      <span class="badge badge-${status}" data-action="cycle-status" data-vin="${esc(v.vin)}" title="Click to cycle status" style="cursor:pointer">
        ${STATUS_LABELS[status] || 'In Stock'}
      </span>
      <div style="display:flex;gap:6px">
        <button class="btn btn-ghost btn-sm" data-action="preview" data-vin="${esc(v.vin)}" title="Preview AI description">📋</button>
        <button class="btn btn-primary btn-sm" data-action="post" data-vin="${esc(v.vin)}">Post →</button>
      </div>
    </div>`;

  card.addEventListener('click', async e => {
    const el  = e.target.closest('[data-action]');
    if (!el) return;
    const vin = el.dataset.vin;
    const vehicle = _inventory.find(x => x.vin === vin);
    if (!vehicle) return;

    if (el.dataset.action === 'post')         postSingleVehicle(vehicle);
    if (el.dataset.action === 'preview')      openDescriptionModal(vehicle);
    if (el.dataset.action === 'cycle-status') cycleStatus(vin);
  });

  return card;
}

async function cycleStatus(vin) {
  const cur  = _statuses[vin] || 'unset';
  const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length];
  _statuses[vin] = next;
  const all = await chrome.storage.local.get('ht_statuses');
  const s   = all.ht_statuses || {};
  s[vin]    = next;
  await chrome.storage.local.set({ ht_statuses: s });
  updateStats();
  renderGrid();
}

// ─── Posting ──────────────────────────────────────────────────────────────────

async function postSingleVehicle(vehicle) {
  try {
    // Store the vehicle as pending so the content script picks it up
    await chrome.storage.local.set({ ht_pending_vehicle: vehicle });
    await chrome.tabs.create({ url: 'https://www.facebook.com/marketplace/create/item', active: true });
    toast(`🚀 Opening Facebook for: ${vehicle.year} ${vehicle.make} ${vehicle.model}`, 'info');
    // Mark staged
    _statuses[vehicle.vin] = 'staged';
    const all = await chrome.storage.local.get('ht_statuses');
    const s   = all.ht_statuses || {};
    s[vehicle.vin] = 'staged';
    await chrome.storage.local.set({ ht_statuses: s });
    updateStats();
    renderGrid();
  } catch (err) {
    toast('❌ Could not open tab: ' + err.message, 'error');
  }
}

async function postAllInventory() {
  const eligible = _inventory.filter(v => (_statuses[v.vin] || 'unset') !== 'active');
  if (!eligible.length) { toast('All inventory is already marked Active.', 'info'); return; }

  if (!confirm(`Queue ${eligible.length} vehicle(s) for sequential posting?\n\nHatchett Torque will open each one in Facebook, fill the form, and wait for you to publish before moving to the next.`)) return;

  _queueTotal = eligible.length;
  $('queue-banner').classList.add('visible');
  updateQueueBanner(0, _queueTotal);

  const vins = eligible.map(v => v.vin);
  await chrome.storage.local.set({ ht_queue: vins });

  // Kick off first vehicle
  const firstVin = vins[0];
  const vehicle  = _inventory.find(v => v.vin === firstVin);
  if (vehicle) await postSingleVehicle(vehicle);
}

async function cancelQueue() {
  await chrome.storage.local.remove('ht_queue');
  $('queue-banner').classList.remove('visible');
  toast('Queue cancelled.', 'info');
}

function updateQueueBanner(done, total) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  $('queue-progress-fill').style.width = pct + '%';
  $('queue-label').textContent = total > 0 ? `Posting ${done + 1} of ${total}…` : 'Queue complete';
}

// ─── Description modal ─────────────────────────────────────────────────────────

function openDescriptionModal(vehicle) {
  _modalVin = vehicle.vin;
  const desc = HatchettCopywriter.generateDescription(vehicle);
  $('modal-title').textContent = `${vehicle.year} ${vehicle.make} ${vehicle.model} — AI Description`;
  $('modal-body').textContent  = desc;
  $('modal-overlay').classList.add('visible');
}

function closeModal() { $('modal-overlay').classList.remove('visible'); _modalVin = null; }

function regenModalDescription() {
  const v = _inventory.find(x => x.vin === _modalVin);
  if (v) $('modal-body').textContent = HatchettCopywriter.generateDescription(v);
}

function copyModalDescription() {
  navigator.clipboard.writeText($('modal-body').textContent)
    .then(() => toast('📋 Copied!', 'success'))
    .catch(() => toast('⚠ Clipboard denied', 'error'));
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function showState(state) {
  $('loading-state').style.display = state === 'loading' ? 'flex'  : 'none';
  $('empty-state').style.display   = state === 'empty'   ? 'flex'  : 'none';
  $('error-state').style.display   = state === 'error'   ? 'flex'  : 'none';
  $('inventory-grid').style.display= state === 'grid'    ? 'grid'  : 'none';
}

function updateCacheTimestamp(ts) {
  if (!ts) { $('cache-timestamp').textContent = ''; return; }
  const ago = Math.floor((Date.now() - ts) / 60000);
  $('cache-timestamp').textContent = ago < 1 ? 'Feed: just now' : `Feed: ${ago}m ago`;
}

function setFeedStatus(msg) {
  $('feed-url-status').textContent = msg;
}

function toast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  $('toast-container').appendChild(el);
  setTimeout(() => { el.classList.add('toast-out'); setTimeout(() => el.remove(), 300); }, 4000);
}

// ─── Live storage watcher ─────────────────────────────────────────────────────

function startStorageWatcher() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.ht_statuses) {
      _statuses = changes.ht_statuses.newValue || {};
      updateStats();
      renderGrid();
    }
    if (changes.ht_queue) {
      const q = changes.ht_queue.newValue;
      if (q?.length) updateQueueBanner(_queueTotal - q.length, _queueTotal);
      else if (_queueTotal > 0) {
        $('queue-label').textContent = '✅ Queue complete';
        setTimeout(() => $('queue-banner').classList.remove('visible'), 3000);
        _queueTotal = 0;
      }
    }
  });
}

// ─── Safety ───────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
