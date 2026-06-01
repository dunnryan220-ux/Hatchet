/**
 * Hatchett Torque — Dashboard Controller (dashboard.js)
 *
 * Runs in the full-page options UI (dashboard.html).
 * Communicates with background.js via chrome.runtime.sendMessage.
 *
 * State shape:
 *   _inventory  — array of parsed vehicle objects from storage
 *   _statuses   — { [vin]: 'staged'|'active'|'out_of_stock'|'unset' }
 *   _filter     — active status filter tab
 *   _query      — active search string
 *   _modalVin   — VIN of vehicle whose description is currently shown
 *   _queueTotal — total vehicles in the current bulk queue (for progress)
 */

'use strict';

// ─── State ────────────────────────────────────────────────────────────────────

let _inventory  = [];
let _statuses   = {};
let _filter     = 'all';
let _query      = '';
let _modalVin   = null;
let _queueTotal = 0;

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

const grid          = $('inventory-grid');
const loadingState  = $('loading-state');
const emptyState    = $('empty-state');
const errorState    = $('error-state');
const errorMessage  = $('error-message');
const queueBanner   = $('queue-banner');
const queueLabel    = $('queue-label');
const queueFill     = $('queue-progress-fill');
const resultCount   = $('result-count');
const cacheTs       = $('cache-timestamp');
const modalOverlay  = $('modal-overlay');
const modalBody     = $('modal-body');
const modalTitle    = $('modal-title');

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  bindStaticEvents();
  await restoreSavedFeedUrl();
  await loadData(false);
  startStorageWatcher();
});

async function restoreSavedFeedUrl() {
  const result = await chrome.storage.local.get('ht_feed_url');
  if (result.ht_feed_url) {
    $('feed-url-input').value = result.ht_feed_url;
    $('feed-url-status').textContent = '✓ custom URL active';
  }
}

// ─── Static event bindings ────────────────────────────────────────────────────

function bindStaticEvents() {
  // Refresh feed from URL
  $('btn-refresh').addEventListener('click', () => loadData(true));

  // Save custom feed URL and immediately fetch
  $('btn-save-url').addEventListener('click', async () => {
    const url = $('feed-url-input').value.trim();
    if (!url) {
      await chrome.storage.local.remove('ht_feed_url');
      $('feed-url-status').textContent = 'Cleared — using default URL';
      return;
    }
    await chrome.storage.local.set({ ht_feed_url: url });
    $('feed-url-status').textContent = 'Saved — fetching…';
    await loadData(true);
    $('feed-url-status').textContent = '✓ custom URL active';
  });

  // Local CSV file upload
  $('btn-upload-csv').addEventListener('click', () => $('csv-file-input').click());
  $('csv-file-input').addEventListener('change', handleCSVUpload);

  // Post All
  $('btn-post-all').addEventListener('click', postAllInventory);

  // Cancel queue
  $('btn-cancel-queue').addEventListener('click', cancelQueue);

  // Search
  $('search-input').addEventListener('input', () => {
    _query = $('search-input').value.trim().toLowerCase();
    renderGrid();
  });

  // Filter tabs
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _filter = btn.dataset.filter;
      renderGrid();
    });
  });

  // Modal controls
  $('modal-close').addEventListener('click', closeModal);
  $('modal-copy').addEventListener('click', copyModalDescription);
  $('modal-regen').addEventListener('click', regenModalDescription);
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    if ((e.metaKey || e.ctrlKey) && e.key === 'r') { e.preventDefault(); loadData(true); }
  });
}

// ─── Data loading ──────────────────────────────────────────────────────────────

async function handleCSVUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  $('csv-file-input').value = ''; // reset so same file can be re-uploaded

  showState('loading');
  try {
    const csvText = await file.text();
    const result  = await sendMsg({ type: 'LOAD_CSV_TEXT', csvText });
    if (!result.ok) throw new Error(result.error);

    _inventory = result.inventory;
    const statusResult = await sendMsg({ type: 'GET_STATUSES' });
    _statuses  = statusResult.statuses || {};

    updateCacheTimestamp(Date.now());
    updateStats();
    renderGrid();
    showState(_inventory.length ? 'grid' : 'empty');
    toast(`✅ Loaded ${_inventory.length} vehicles from ${file.name}`, 'success');
  } catch (err) {
    showState('error');
    errorMessage.textContent = 'CSV upload failed: ' + err.message;
    toast('❌ ' + err.message, 'error');
  }
}

async function loadData(force = false) {
  showState('loading');

  try {
    const urlResult = await chrome.storage.local.get('ht_feed_url');
    const feedUrl   = urlResult.ht_feed_url || null;

    // Always pull statuses alongside inventory
    const [invResult, statusResult, tsResult] = await Promise.all([
      sendMsg({ type: force ? 'FETCH_INVENTORY' : 'GET_INVENTORY', force, feedUrl }),
      sendMsg({ type: 'GET_STATUSES' }),
      new Promise(resolve => chrome.storage.local.get('ht_inventory_timestamp', r => resolve(r))),
    ]);

    if (!invResult.ok) throw new Error(invResult.error || 'Unknown error');

    _inventory = invResult.inventory || [];
    _statuses  = statusResult.statuses || {};

    updateCacheTimestamp(tsResult.ht_inventory_timestamp);
    updateStats();
    renderGrid();
    showState(_inventory.length ? 'grid' : 'empty');
    if (force) toast('✅ Feed refreshed — ' + _inventory.length + ' vehicles loaded', 'success');

  } catch (err) {
    showState('error');
    errorMessage.textContent = 'Failed to load inventory: ' + err.message;
    toast('❌ ' + err.message, 'error');
  }
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function updateStats() {
  const counts = { active: 0, staged: 0, out_of_stock: 0, unset: 0 };

  _inventory.forEach(v => {
    const s = _statuses[v.vin] || 'unset';
    if (counts[s] !== undefined) counts[s]++;
    else counts.unset++;
  });

  $('stat-total').textContent  = _inventory.length;
  $('stat-active').textContent = counts.active;
  $('stat-staged').textContent = counts.staged;
  $('stat-oos').textContent    = counts.out_of_stock;
}

// ─── Grid rendering ────────────────────────────────────────────────────────────

function renderGrid() {
  const filtered = getFiltered();
  resultCount.textContent = filtered.length !== _inventory.length
    ? `${filtered.length} of ${_inventory.length} vehicles`
    : `${_inventory.length} vehicles`;

  grid.innerHTML = '';

  if (!filtered.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;display:flex;flex-direction:column;align-items:center;gap:12px;padding:60px 0;color:var(--text-muted);">
        <div style="font-size:36px;opacity:0.4">🔍</div>
        <p style="font-size:14px">No vehicles match your current search or filter.</p>
      </div>`;
    return;
  }

  filtered.forEach((vehicle, i) => {
    const card = buildVehicleCard(vehicle, i);
    grid.appendChild(card);
  });
}

function getFiltered() {
  return _inventory.filter(v => {
    const status = _statuses[v.vin] || 'unset';
    if (_filter !== 'all' && status !== _filter) return false;
    if (!_query) return true;
    const haystack = [v.year, v.make, v.model, v.trim, v.vin, v.stockNumber,
                      v.exteriorColor, v.price].join(' ').toLowerCase();
    return haystack.includes(_query);
  });
}

// ─── Vehicle card builder ─────────────────────────────────────────────────────

function buildVehicleCard(vehicle, index) {
  const status  = _statuses[vehicle.vin] || 'unset';
  const thumb   = vehicle.images?.[0] || null;
  const price   = HatchettCopywriter.formatPrice(vehicle.price);
  const mileage = HatchettCopywriter.formatMileage(vehicle.mileage);
  const label   = statusLabels[status] || 'In Stock';

  const card = document.createElement('div');
  card.className = 'vehicle-card';
  card.dataset.vin = vehicle.vin;
  card.style.animationDelay = `${Math.min(index * 25, 300)}ms`;

  card.innerHTML = `
    ${thumb
      ? `<img class="vehicle-card-thumb" src="${esc(thumb)}" alt="${esc(vehicle.year)} ${esc(vehicle.make)} ${esc(vehicle.model)}" loading="lazy"
             onerror="this.style.display='none';this.nextSibling.style.display='flex'">`
      : ''}
    <div class="vehicle-card-thumb-placeholder" style="${thumb ? 'display:none' : ''}">🚗</div>

    <div class="vehicle-card-body">
      <div class="vehicle-card-title">${esc(vehicle.year)} ${esc(vehicle.make)} ${esc(vehicle.model)}${vehicle.trim ? ' <span style="font-weight:500;color:var(--text-secondary)">' + esc(vehicle.trim) + '</span>' : ''}</div>
      <div class="vehicle-card-sub">
        ${vehicle.stockNumber ? 'Stock #' + esc(vehicle.stockNumber) + ' · ' : ''}${esc(vehicle.vin?.slice(-8) || '—')}
      </div>
      <div class="vehicle-card-price">${esc(price)}</div>
      <div class="vehicle-card-mileage">${esc(mileage)}</div>
    </div>

    <div class="vehicle-card-footer">
      <span class="badge badge-${status}">${label}</span>
      <div style="display:flex;gap:6px;align-items:center">
        <button class="btn btn-ghost btn-sm" data-action="preview" data-vin="${esc(vehicle.vin)}" title="Preview generated description">📋</button>
        <button class="btn btn-primary btn-sm" data-action="post" data-vin="${esc(vehicle.vin)}">
          Post →
        </button>
      </div>
    </div>
  `;

  card.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const vin = btn.dataset.vin;
    const v   = _inventory.find(x => x.vin === vin);
    if (!v) return;

    if (btn.dataset.action === 'post')    postSingleVehicle(v);
    if (btn.dataset.action === 'preview') openDescriptionModal(v);
  });

  // Status change on right-click context menu override (middle ground: status cycle on badge click)
  const badge = card.querySelector('.badge');
  badge.style.cursor = 'pointer';
  badge.title = 'Click to cycle status';
  badge.addEventListener('click', e => {
    e.stopPropagation();
    cycleStatus(vehicle.vin);
  });

  return card;
}

const statusLabels = {
  unset:       'In Stock',
  staged:      'Staged',
  active:      'Active',
  out_of_stock:'Sold',
};

const statusCycle = ['unset', 'staged', 'active', 'out_of_stock'];

async function cycleStatus(vin) {
  const current = _statuses[vin] || 'unset';
  const nextIdx = (statusCycle.indexOf(current) + 1) % statusCycle.length;
  const next    = statusCycle[nextIdx];

  await sendMsg({ type: 'SET_STATUS', vin, status: next });
  _statuses[vin] = next;
  updateStats();
  renderGrid();
}

// ─── Single vehicle post ───────────────────────────────────────────────────────

async function postSingleVehicle(vehicle) {
  const result = await sendMsg({ type: 'POST_SINGLE', vehicle });
  if (result.ok) {
    toast(`🚀 Opening Facebook for: ${vehicle.year} ${vehicle.make} ${vehicle.model}`, 'info');
  } else {
    toast('❌ Failed to open tab: ' + result.error, 'error');
  }
}

// ─── Bulk post queue ──────────────────────────────────────────────────────────

async function postAllInventory() {
  const eligible = _inventory.filter(v => (_statuses[v.vin] || 'unset') !== 'active');

  if (!eligible.length) {
    toast('All inventory is already marked Active.', 'info');
    return;
  }

  const confirmed = confirm(
    `Queue ${eligible.length} vehicle${eligible.length !== 1 ? 's' : ''} for Facebook Marketplace posting?\n\n` +
    `Each vehicle will open in a Facebook tab sequentially. You will review and publish each listing manually — Hatchett Torque will fill the form for you.\n\n` +
    `Already Active listings will be skipped.`
  );
  if (!confirmed) return;

  _queueTotal = eligible.length;
  updateQueueBanner(0, _queueTotal);
  queueBanner.classList.add('visible');

  const vins = eligible.map(v => v.vin);
  const result = await sendMsg({ type: 'QUEUE_POST_ALL', vins });

  if (!result.ok) {
    toast('❌ Queue start failed: ' + result.error, 'error');
    queueBanner.classList.remove('visible');
  } else {
    toast(`🚀 Queue started — ${eligible.length} vehicles queued`, 'success');
  }
}

async function cancelQueue() {
  await chrome.storage.local.remove('ht_queue');
  queueBanner.classList.remove('visible');
  toast('Queue cancelled.', 'info');
}

function updateQueueBanner(completed, total) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  queueFill.style.width = pct + '%';
  queueLabel.textContent = total > 0
    ? `Posting ${completed + 1} of ${total} vehicles…`
    : 'Queue complete';
}

// ─── Description modal ─────────────────────────────────────────────────────────

function openDescriptionModal(vehicle) {
  _modalVin  = vehicle.vin;
  const desc = HatchettCopywriter.generateDescription(vehicle);
  modalTitle.textContent = `${vehicle.year} ${vehicle.make} ${vehicle.model} — Generated Description`;
  modalBody.textContent  = desc;
  modalOverlay.classList.add('visible');
}

function closeModal() {
  modalOverlay.classList.remove('visible');
  _modalVin = null;
}

function regenModalDescription() {
  const vehicle = _inventory.find(v => v.vin === _modalVin);
  if (!vehicle) return;
  modalBody.textContent = HatchettCopywriter.generateDescription(vehicle);
}

function copyModalDescription() {
  const text = modalBody.textContent;
  navigator.clipboard.writeText(text).then(() => {
    toast('📋 Description copied to clipboard!', 'success');
  }).catch(() => {
    toast('⚠ Clipboard access denied.', 'error');
  });
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function showState(state) {
  loadingState.style.display = state === 'loading' ? 'flex'  : 'none';
  emptyState.style.display   = state === 'empty'   ? 'flex'  : 'none';
  errorState.style.display   = state === 'error'   ? 'flex'  : 'none';
  grid.style.display         = state === 'grid'    ? 'grid'  : 'none';
}

function updateCacheTimestamp(ts) {
  if (!ts) { cacheTs.textContent = ''; return; }
  const d   = new Date(ts);
  const ago = Math.floor((Date.now() - ts) / 60000);
  cacheTs.textContent = ago < 1
    ? 'Feed: just now'
    : ago < 60
    ? `Feed: ${ago}m ago`
    : `Feed: ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

// ─── Toast notifications ──────────────────────────────────────────────────────

function toast(message, type = 'info') {
  const container = $('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);

  setTimeout(() => {
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

// ─── Storage change watcher (live badge updates) ───────────────────────────────

function startStorageWatcher() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (changes.ht_statuses) {
      _statuses = changes.ht_statuses.newValue || {};
      updateStats();
      renderGrid();
    }

    if (changes.ht_queue) {
      const queue = changes.ht_queue.newValue;
      if (queue?.length) {
        const done = _queueTotal - queue.length;
        updateQueueBanner(done, _queueTotal);
      } else if (_queueTotal > 0) {
        // Queue finished
        updateQueueBanner(_queueTotal, _queueTotal);
        queueLabel.textContent = '✅ Queue complete';
        setTimeout(() => queueBanner.classList.remove('visible'), 3000);
        toast('✅ All vehicles have been queued for posting!', 'success');
        _queueTotal = 0;
      }
    }

    if (changes.ht_inventory) {
      _inventory = changes.ht_inventory.newValue || [];
      updateStats();
      renderGrid();
    }
  });
}

// ─── Message helper ───────────────────────────────────────────────────────────

function sendMsg(msg) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(msg, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response || {});
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

// ─── String safety ────────────────────────────────────────────────────────────

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
