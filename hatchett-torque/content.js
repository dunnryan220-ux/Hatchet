/**
 * Hatchett Torque — Content Script (content.js)
 *
 * Injected into https://www.facebook.com/marketplace/create/item
 *
 * Responsibilities:
 *  1. Mount the "Torque Sidebar" as a Shadow DOM host — zero style leakage
 *  2. Signal background that the page is ready and receive vehicle context
 *  3. Display the full inventory list with search + filter
 *  4. Run the form-fill automation sequence on command
 *  5. Present the image staging tray with download + drag-assist UX
 *
 * Facebook DOM notes (last audited — update selectors here if Meta patches):
 *  - Title input:       [aria-label="Title"]  ||  div[role="textbox"][contenteditable]
 *  - Price input:       input[aria-label="Price"]  ||  [placeholder="Price"]
 *  - Description area:  div[role="textbox"][contenteditable]  (second editable on page)
 *  - Category/type:     div[role="button"] containing "Vehicle Type" text label
 *  - Year/Make/Model:   [aria-label="Year"]  [aria-label="Make"]  [aria-label="Model"]
 *  - Mileage:           [aria-label="Mileage"]
 *  - Transmission:      div[role="button"] → inner text matches "Transmission"
 *  - Condition:         div[role="button"] → inner text matches "Condition"
 *  - Photo input:       input[type="file"][accept*="image"]
 *
 * IMPORTANT: Facebook uses React's controlled components. Native DOM input
 * events alone are swallowed. Use the React fiber nativeInputValueSetter
 * trick to bypass controlled-component guards.
 */

// ─── Shadow host mount ────────────────────────────────────────────────────────

(function mountTorqueSidebar() {
  if (document.getElementById('ht-torque-host')) return;

  const host = document.createElement('div');
  host.id = 'ht-torque-host';
  Object.assign(host.style, {
    position: 'fixed',
    top: '0',
    right: '0',
    height: '100vh',
    zIndex: '2147483647',
    pointerEvents: 'none', // outer host is click-through
  });
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  injectSidebarCSS(shadow);
  injectSidebarHTML(shadow);
  initSidebar(shadow);
})();

// ─── Embedded sidebar CSS (injected into shadow root) ─────────────────────────

function injectSidebarCSS(shadow) {
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Design tokens ── */
    :root, .ht-root {
      --bg:        #0d0d18;
      --surface:   #12121f;
      --raised:    #191928;
      --overlay:   #1f1f34;
      --border:    #23233a;
      --bri:       #2e2e4a;
      --gold:      #c8a45a;
      --gold-b:    #e6c07b;
      --gold-dim:  #7a622e;
      --gold-glow: rgba(200,164,90,0.15);
      --t1:        #f0f0fa;
      --t2:        #9090b8;
      --t3:        #555570;
      --active:    #22c55e;
      --staged:    #f59e0b;
      --oos:       #ef4444;
      --neutral:   #6366f1;
      --r:         8px;
      --rl:        14px;
      --shadow:    0 0 60px rgba(0,0,0,0.7), 0 0 1px rgba(200,164,90,0.1);
    }

    /* ── Sidebar panel ── */
    #ht-panel {
      position: fixed;
      top: 0;
      right: 0;
      height: 100vh;
      width: 360px;
      background: var(--bg);
      border-left: 1px solid var(--border);
      box-shadow: var(--shadow);
      display: flex;
      flex-direction: column;
      pointer-events: all;
      transform: translateX(100%);
      transition: transform 380ms cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
      font-size: 13px;
      color: var(--t1);
      -webkit-font-smoothing: antialiased;
    }

    #ht-panel.open { transform: translateX(0); }

    /* ── Toggle tab ── */
    #ht-toggle {
      position: fixed;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
      background: linear-gradient(135deg, var(--gold) 0%, #a8832a 100%);
      color: #07070e;
      padding: 14px 8px;
      border-radius: 10px 0 0 10px;
      cursor: pointer;
      pointer-events: all;
      writing-mode: vertical-rl;
      text-orientation: mixed;
      font-weight: 800;
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      box-shadow: -4px 0 20px rgba(200,164,90,0.3);
      transition: right 380ms cubic-bezier(0.4,0,0.2,1), box-shadow 200ms;
      z-index: 1;
      user-select: none;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    #ht-panel.open ~ #ht-toggle,
    #ht-toggle.shifted { right: 360px; }
    #ht-toggle:hover { box-shadow: -6px 0 28px rgba(200,164,90,0.5); }

    /* ── Header ── */
    #ht-header {
      flex-shrink: 0;
      padding: 18px 16px 14px;
      border-bottom: 1px solid var(--border);
      background: linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%);
    }

    #ht-header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    #ht-brand {
      display: flex;
      align-items: center;
      gap: 9px;
    }

    #ht-logo {
      width: 30px;
      height: 30px;
      background: linear-gradient(135deg, var(--gold) 0%, var(--gold-dim) 100%);
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 900;
      color: #07070e;
      flex-shrink: 0;
    }

    #ht-brand-text h2 {
      font-size: 13px;
      font-weight: 800;
      color: var(--t1);
      letter-spacing: -0.2px;
      line-height: 1.1;
    }

    #ht-brand-text span {
      font-size: 9px;
      color: var(--gold);
      font-weight: 600;
      letter-spacing: 1.8px;
      text-transform: uppercase;
    }

    #ht-close-btn {
      background: var(--raised);
      border: 1px solid var(--border);
      color: var(--t2);
      border-radius: var(--r);
      padding: 5px 8px;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      transition: 150ms;
    }
    #ht-close-btn:hover { color: var(--t1); background: var(--overlay); }

    #ht-search {
      width: 100%;
      background: var(--raised);
      border: 1px solid var(--border);
      border-radius: var(--r);
      padding: 8px 12px;
      color: var(--t1);
      font-size: 12px;
      font-family: inherit;
      outline: none;
      transition: border-color 150ms, box-shadow 150ms;
    }
    #ht-search::placeholder { color: var(--t3); }
    #ht-search:focus {
      border-color: var(--gold-dim);
      box-shadow: 0 0 0 3px var(--gold-glow);
    }

    /* ── Filter tabs ── */
    #ht-filters {
      display: flex;
      gap: 4px;
      padding: 10px 16px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
      overflow-x: auto;
    }

    .ht-filter-btn {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--t2);
      font-family: inherit;
      white-space: nowrap;
      transition: 150ms;
    }
    .ht-filter-btn:hover { color: var(--t1); background: var(--raised); }
    .ht-filter-btn.active { background: var(--raised); color: var(--gold-b); border-color: var(--gold-dim); }

    /* ── Inventory list ── */
    #ht-inventory-list {
      flex: 1;
      overflow-y: auto;
      padding: 10px 0;
    }

    #ht-inventory-list::-webkit-scrollbar { width: 4px; }
    #ht-inventory-list::-webkit-scrollbar-track { background: var(--bg); }
    #ht-inventory-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

    .ht-vehicle-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      cursor: pointer;
      border-bottom: 1px solid var(--border);
      transition: background 150ms;
    }
    .ht-vehicle-item:hover { background: var(--surface); }
    .ht-vehicle-item.selected { background: var(--surface); border-left: 3px solid var(--gold); }

    .ht-item-thumb {
      width: 52px;
      height: 36px;
      border-radius: 5px;
      object-fit: cover;
      background: var(--raised);
      flex-shrink: 0;
    }

    .ht-item-thumb-ph {
      width: 52px;
      height: 36px;
      border-radius: 5px;
      background: var(--raised);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
      color: var(--t3);
    }

    .ht-item-info { flex: 1; min-width: 0; }

    .ht-item-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--t1);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.3;
    }

    .ht-item-sub {
      font-size: 10px;
      color: var(--t2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ht-item-actions {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
      flex-shrink: 0;
    }

    /* ── Badges ── */
    .ht-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      border-radius: 20px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .ht-badge::before { content: ''; width: 4px; height: 4px; border-radius: 50%; }
    .ht-badge-active  { background: rgba(34,197,94,0.1);  color: #22c55e; border: 1px solid rgba(34,197,94,0.2); }
    .ht-badge-active::before  { background: #22c55e; }
    .ht-badge-staged  { background: rgba(245,158,11,0.1); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2); }
    .ht-badge-staged::before  { background: #f59e0b; }
    .ht-badge-out_of_stock { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
    .ht-badge-out_of_stock::before { background: #ef4444; }
    .ht-badge-unset   { background: rgba(99,102,241,0.1); color: #6366f1; border: 1px solid rgba(99,102,241,0.2); }
    .ht-badge-unset::before   { background: #6366f1; }

    /* ── Item post button ── */
    .ht-post-btn {
      padding: 3px 9px;
      background: linear-gradient(135deg, var(--gold) 0%, #a8832a 100%);
      color: #07070e;
      border: none;
      border-radius: 5px;
      font-size: 10px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      transition: 150ms;
      white-space: nowrap;
    }
    .ht-post-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }

    /* ── Staging area ── */
    #ht-staging {
      border-top: 1px solid var(--border);
      background: var(--surface);
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
    }

    #ht-staging-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px 8px;
    }

    #ht-staging-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--t3);
    }

    #ht-selected-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--gold-b);
      padding: 0 14px 8px;
    }

    #ht-image-tray {
      display: flex;
      gap: 6px;
      padding: 0 14px 10px;
      overflow-x: auto;
      min-height: 60px;
    }
    #ht-image-tray::-webkit-scrollbar { height: 3px; }
    #ht-image-tray::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

    .ht-img-cell {
      flex-shrink: 0;
      position: relative;
      width: 72px;
      height: 52px;
      border-radius: var(--r);
      overflow: hidden;
      border: 1px solid var(--border);
      cursor: pointer;
      background: var(--raised);
    }
    .ht-img-cell img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .ht-img-cell .ht-img-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      transition: 150ms;
      opacity: 0;
    }
    .ht-img-cell:hover .ht-img-overlay { background: rgba(0,0,0,0.6); opacity: 1; }

    #ht-staging-actions {
      display: flex;
      gap: 8px;
      padding: 0 14px 14px;
    }

    .ht-action-btn {
      flex: 1;
      padding: 9px 0;
      border-radius: var(--r);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      font-family: inherit;
      transition: 150ms;
      text-align: center;
    }

    .ht-action-fill {
      background: linear-gradient(135deg, var(--gold) 0%, #a8832a 100%);
      color: #07070e;
      box-shadow: 0 2px 10px rgba(200,164,90,0.3);
    }
    .ht-action-fill:hover { filter: brightness(1.1); transform: translateY(-1px); }

    .ht-action-preview {
      background: var(--raised);
      color: var(--t1);
      border: 1px solid var(--bri);
    }
    .ht-action-preview:hover { background: var(--overlay); }

    /* ── Status overlay ── */
    #ht-status-bar {
      padding: 8px 14px;
      font-size: 11px;
      color: var(--t2);
      background: var(--bg);
      border-top: 1px solid var(--border);
      flex-shrink: 0;
      min-height: 34px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    #ht-status-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--t3);
      flex-shrink: 0;
    }
    #ht-status-dot.filling { background: var(--staged); animation: blink 1s infinite; }
    #ht-status-dot.done    { background: var(--active); }
    #ht-status-dot.error   { background: var(--oos); }

    @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

    /* ── Empty states ── */
    .ht-empty {
      padding: 32px 20px;
      text-align: center;
      color: var(--t3);
      font-size: 12px;
      line-height: 1.7;
    }
    .ht-empty-icon { font-size: 28px; margin-bottom: 8px; }

    /* ── Drop hint ── */
    #ht-drop-hint {
      border: 2px dashed var(--border);
      border-radius: var(--r);
      padding: 10px;
      text-align: center;
      font-size: 10px;
      color: var(--t3);
      margin: 0 14px 10px;
      transition: border-color 150ms;
    }
    #ht-drop-hint.drag-active {
      border-color: var(--gold-dim);
      color: var(--gold);
      background: var(--gold-glow);
    }

    /* ── Spinner ── */
    .ht-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid var(--border);
      border-top-color: var(--gold);
      border-radius: 50%;
      animation: ht-spin 0.7s linear infinite;
    }
    @keyframes ht-spin { to { transform: rotate(360deg); } }

    /* ── Copy flash ── */
    .ht-copy-flash {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--raised);
      border: 1px solid var(--gold-dim);
      color: var(--gold-b);
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      animation: flashIn 200ms ease, flashOut 300ms 1.5s ease forwards;
      pointer-events: none;
      z-index: 10;
    }
    @keyframes flashIn  { from { opacity:0; transform: translateX(-50%) translateY(8px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }
    @keyframes flashOut { to   { opacity:0; transform: translateX(-50%) translateY(8px); } }
  `;
  shadow.appendChild(style);
}

// ─── Sidebar HTML template ─────────────────────────────────────────────────────

function injectSidebarHTML(shadow) {
  const panel = document.createElement('div');
  panel.innerHTML = `
    <div id="ht-panel">

      <!-- Header -->
      <div id="ht-header">
        <div id="ht-header-top">
          <div id="ht-brand">
            <div id="ht-logo">T</div>
            <div id="ht-brand-text">
              <h2>Hatchett Torque</h2>
              <span>Inventory Engine</span>
            </div>
          </div>
          <button id="ht-close-btn" title="Close sidebar">✕</button>
        </div>
        <input id="ht-search" type="text" placeholder="🔍  Search inventory — make, model, VIN..." />
      </div>

      <!-- Filter tabs -->
      <div id="ht-filters">
        <button class="ht-filter-btn active" data-filter="all">All</button>
        <button class="ht-filter-btn" data-filter="unset">In Stock</button>
        <button class="ht-filter-btn" data-filter="staged">Staged</button>
        <button class="ht-filter-btn" data-filter="active">Active</button>
        <button class="ht-filter-btn" data-filter="out_of_stock">Sold</button>
      </div>

      <!-- Inventory list -->
      <div id="ht-inventory-list">
        <div class="ht-empty">
          <div class="ht-empty-icon">🚗</div>
          Loading inventory…
        </div>
      </div>

      <!-- Staging area -->
      <div id="ht-staging">
        <div id="ht-staging-header">
          <span id="ht-staging-title">Staging Area</span>
          <span id="ht-img-count" style="font-size:10px;color:var(--t3);"></span>
        </div>
        <div id="ht-selected-name">Select a vehicle above to begin</div>
        <div id="ht-image-tray"></div>
        <div id="ht-drop-hint">
          ⬆ Drag images directly into the Facebook photo block
        </div>
        <div id="ht-staging-actions">
          <button class="ht-action-btn ht-action-fill"    id="ht-fill-btn"    disabled>⚡ Fill Form Now</button>
          <button class="ht-action-btn ht-action-preview" id="ht-preview-btn" disabled>📋 Copy Description</button>
        </div>
      </div>

      <!-- Status bar -->
      <div id="ht-status-bar">
        <div id="ht-status-dot"></div>
        <span id="ht-status-text">Ready — select a vehicle to begin</span>
      </div>

    </div>

    <!-- Slide tab (outside panel so it's always visible) -->
    <div id="ht-toggle">⚡ Torque</div>
  `;
  shadow.appendChild(panel);
}

// ─── Sidebar controller ───────────────────────────────────────────────────────

let _inventory = [];
let _statuses  = {};
let _selected  = null;
let _filter    = 'all';
let _query     = '';

function initSidebar(shadow) {
  const panel      = shadow.getElementById('ht-panel');
  const toggle     = shadow.getElementById('ht-toggle');
  const closeBtn   = shadow.getElementById('ht-close-btn');
  const search     = shadow.getElementById('ht-search');
  const fillBtn    = shadow.getElementById('ht-fill-btn');
  const previewBtn = shadow.getElementById('ht-preview-btn');
  const dropHint   = shadow.getElementById('ht-drop-hint');

  // Toggle open/close
  toggle.addEventListener('click', () => {
    panel.classList.toggle('open');
    toggle.classList.toggle('shifted');
  });
  closeBtn.addEventListener('click', () => {
    panel.classList.remove('open');
    toggle.classList.remove('shifted');
  });

  // Search
  search.addEventListener('input', () => {
    _query = search.value.trim().toLowerCase();
    renderInventoryList(shadow);
  });

  // Filter tabs
  shadow.getElementById('ht-filters').addEventListener('click', e => {
    const btn = e.target.closest('.ht-filter-btn');
    if (!btn) return;
    shadow.querySelectorAll('.ht-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _filter = btn.dataset.filter;
    renderInventoryList(shadow);
  });

  // Fill form
  fillBtn.addEventListener('click', () => {
    if (!_selected) return;
    runFormFillSequence(_selected, shadow);
  });

  // Copy description
  previewBtn.addEventListener('click', () => {
    if (!_selected) return;
    const desc = window.HatchettCopywriter.generateDescription(_selected);
    navigator.clipboard.writeText(desc).then(() => {
      showCopyFlash(shadow, '📋 Description copied!');
    }).catch(() => {
      showCopyFlash(shadow, '⚠ Clipboard access denied');
    });
  });

  // Image drop-hint drag feedback
  setupDropZone(dropHint);

  // Signal background we're alive
  chrome.runtime.sendMessage({ type: 'CONTENT_READY' });

  // Load data
  loadInventoryFromStorage(shadow);
}

// ─── Data loading ──────────────────────────────────────────────────────────────

function loadInventoryFromStorage(shadow) {
  chrome.storage.local.get(['ht_inventory', 'ht_statuses', 'ht_pending_vehicle'], result => {
    _inventory = result.ht_inventory || [];
    _statuses  = result.ht_statuses  || {};

    // If a vehicle was queued for this tab, auto-select it
    const pending = result.ht_pending_vehicle;
    if (pending) {
      _selected = pending;
      shadow.getElementById('ht-panel').classList.add('open');
      shadow.getElementById('ht-toggle').classList.add('shifted');
      renderStagingArea(shadow);
    }

    renderInventoryList(shadow);
    setStatus(shadow, _inventory.length ? `${_inventory.length} vehicles loaded` : 'No inventory cached — open dashboard to fetch feed', _inventory.length ? null : 'error');
  });
}

// ─── Inventory list renderer ──────────────────────────────────────────────────

function renderInventoryList(shadow) {
  const container = shadow.getElementById('ht-inventory-list');

  const filtered = _inventory.filter(v => {
    const status = _statuses[v.vin] || 'unset';

    const filterPass = _filter === 'all' || status === _filter;
    if (!filterPass) return false;

    if (!_query) return true;
    const haystack = [v.year, v.make, v.model, v.trim, v.vin, v.stockNumber].join(' ').toLowerCase();
    return haystack.includes(_query);
  });

  if (!filtered.length) {
    container.innerHTML = `
      <div class="ht-empty">
        <div class="ht-empty-icon">🔍</div>
        ${_inventory.length ? 'No vehicles match your search.' : 'Open the Hatchett Torque dashboard to fetch your feed.'}
      </div>`;
    return;
  }

  container.innerHTML = '';

  filtered.forEach(vehicle => {
    const status = _statuses[vehicle.vin] || 'unset';
    const thumb  = vehicle.images?.[0];
    const price  = window.HatchettCopywriter?.formatPrice(vehicle.price) || vehicle.price || '—';
    const isSelected = _selected?.vin === vehicle.vin;

    const item = document.createElement('div');
    item.className = `ht-vehicle-item${isSelected ? ' selected' : ''}`;
    item.dataset.vin = vehicle.vin;

    item.innerHTML = `
      ${thumb
        ? `<img class="ht-item-thumb" src="${escHtml(thumb)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextSibling.style.display='flex'">`
        : ''}
      <div class="ht-item-thumb-ph" style="${thumb ? 'display:none' : ''}">🚗</div>
      <div class="ht-item-info">
        <div class="ht-item-title">${escHtml(vehicle.year)} ${escHtml(vehicle.make)} ${escHtml(vehicle.model)}</div>
        <div class="ht-item-sub">${escHtml(price)} · ${formatMileageShort(vehicle.mileage)}</div>
      </div>
      <div class="ht-item-actions">
        <span class="ht-badge ht-badge-${status}">${statusLabel(status)}</span>
        <button class="ht-post-btn" data-vin="${escHtml(vehicle.vin)}">Post →</button>
      </div>
    `;

    // Select vehicle (click anywhere except the Post button)
    item.addEventListener('click', e => {
      if (e.target.classList.contains('ht-post-btn')) return;
      selectVehicle(vehicle, shadow);
    });

    // Post button
    item.querySelector('.ht-post-btn').addEventListener('click', e => {
      e.stopPropagation();
      selectVehicle(vehicle, shadow);
      // Small delay so staging area appears before we start filling
      setTimeout(() => runFormFillSequence(vehicle, shadow), 300);
    });

    container.appendChild(item);
  });
}

// ─── Vehicle selection & staging ──────────────────────────────────────────────

function selectVehicle(vehicle, shadow) {
  _selected = vehicle;
  renderInventoryList(shadow);
  renderStagingArea(shadow);

  const fillBtn    = shadow.getElementById('ht-fill-btn');
  const previewBtn = shadow.getElementById('ht-preview-btn');
  fillBtn.disabled    = false;
  previewBtn.disabled = false;
}

function renderStagingArea(shadow) {
  if (!_selected) return;

  shadow.getElementById('ht-selected-name').textContent =
    `${_selected.year} ${_selected.make} ${_selected.model}${_selected.trim ? ' ' + _selected.trim : ''}`;

  const tray     = shadow.getElementById('ht-image-tray');
  const imgCount = shadow.getElementById('ht-img-count');
  const images   = _selected.images || [];

  imgCount.textContent = images.length ? `${images.length} image${images.length !== 1 ? 's' : ''}` : '';
  tray.innerHTML = '';

  if (!images.length) {
    tray.innerHTML = `<div class="ht-empty" style="padding:12px;font-size:11px;">No images in feed for this vehicle.</div>`;
    return;
  }

  images.forEach((url, i) => {
    const cell = document.createElement('div');
    cell.className = 'ht-img-cell';
    cell.title = `Image ${i + 1} — click to copy URL`;
    cell.innerHTML = `
      <img src="${escHtml(url)}" alt="Image ${i+1}" loading="lazy" draggable="true" />
      <div class="ht-img-overlay">📋</div>
    `;

    // Make image draggable into FB upload zone
    const img = cell.querySelector('img');
    img.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/uri-list', url);
      e.dataTransfer.setData('text/plain', url);
      e.dataTransfer.effectAllowed = 'copy';
    });

    // Click → copy URL to clipboard
    cell.addEventListener('click', () => {
      navigator.clipboard.writeText(url).then(() => {
        showCopyFlash(shadow, `📋 Image ${i + 1} URL copied`);
      });
    });

    tray.appendChild(cell);
  });
}

// ─── Drop zone helpers ─────────────────────────────────────────────────────────

function setupDropZone(dropHint) {
  ['dragenter','dragover'].forEach(evt => {
    dropHint.addEventListener(evt, e => {
      e.preventDefault();
      dropHint.classList.add('drag-active');
    });
  });
  ['dragleave','drop'].forEach(evt => {
    dropHint.addEventListener(evt, () => dropHint.classList.remove('drag-active'));
  });
}

// ─── Form fill automation ─────────────────────────────────────────────────────

/**
 * runFormFillSequence
 *
 * Orchestrates form population with human-emulation delays.
 * Each step: focus → set value (React-compatible) → fire events → blur → micro-delay
 *
 * Does NOT click the final Publish button — that checkpoint is reserved for the
 * human operator to review before submission.
 */
async function runFormFillSequence(vehicle, shadow) {
  setStatus(shadow, '⚡ Starting form fill…', 'filling');

  const description = window.HatchettCopywriter?.generateDescription(vehicle) || buildFallbackDescription(vehicle);
  const title       = window.HatchettCopywriter?.generateTitle(vehicle) || `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  try {
    // ── Step 1: Scroll to top, let page settle
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await delay(randomMs(300, 500));

    // ── Step 2: Title
    setStatus(shadow, 'Filling title…', 'filling');
    const titleFilled = await fillTextField(
      ['[aria-label="Title"]', 'input[placeholder*="title" i]', 'input[placeholder*="Title"]'],
      title
    );
    if (!titleFilled) setStatus(shadow, '⚠ Title field not found — scroll down and try again', 'error');
    await delay(randomMs(200, 400));

    // ── Step 3: Price
    setStatus(shadow, 'Filling price…', 'filling');
    const priceRaw = String(vehicle.price).replace(/[^0-9.]/g, '');
    await fillTextField(
      ['[aria-label="Price"]', 'input[placeholder*="Price" i]', 'input[type="number"][placeholder*="price" i]'],
      priceRaw
    );
    await delay(randomMs(150, 350));

    // ── Step 4: Description (Facebook uses a contenteditable div, not textarea)
    setStatus(shadow, 'Filling description…', 'filling');
    await fillContentEditable(description);
    await delay(randomMs(300, 500));

    // ── Step 5: Year dropdown (if available)
    setStatus(shadow, 'Selecting year…', 'filling');
    await selectDropdownByLabel('Year', vehicle.year, shadow);
    await delay(randomMs(200, 400));

    // ── Step 6: Make dropdown
    setStatus(shadow, 'Selecting make…', 'filling');
    await selectDropdownByLabel('Make', vehicle.make, shadow);
    await delay(randomMs(200, 400));

    // ── Step 7: Model dropdown
    setStatus(shadow, 'Selecting model…', 'filling');
    await selectDropdownByLabel('Model', vehicle.model, shadow);
    await delay(randomMs(200, 400));

    // ── Step 8: Mileage
    setStatus(shadow, 'Filling mileage…', 'filling');
    const mileageRaw = String(vehicle.mileage).replace(/[^0-9]/g, '');
    await fillTextField(
      ['[aria-label="Mileage"]', 'input[placeholder*="Mileage" i]', 'input[placeholder*="miles" i]'],
      mileageRaw
    );
    await delay(randomMs(150, 350));

    // ── Step 9: Transmission dropdown
    if (vehicle.transmission) {
      setStatus(shadow, 'Selecting transmission…', 'filling');
      const txNorm = window.HatchettCopywriter?.normalizeTransmission(vehicle.transmission) || vehicle.transmission;
      // Try both "Automatic" and the raw value
      const txKey = txNorm.toLowerCase().includes('auto') ? 'Automatic' : 'Manual';
      await selectDropdownByLabel('Transmission', txKey, shadow);
      await delay(randomMs(150, 350));
    }

    // ── Step 10: Condition (default to "Used")
    setStatus(shadow, 'Setting condition…', 'filling');
    await selectDropdownByLabel('Condition', 'Used', shadow);
    await delay(randomMs(150, 300));

    // ── Step 11: Fuel type
    if (vehicle.fuelType) {
      setStatus(shadow, 'Selecting fuel type…', 'filling');
      await selectDropdownByLabel('Fuel type', normalizeFuelType(vehicle.fuelType), shadow);
      await delay(randomMs(150, 300));
    }

    // ── Done — remind operator about photos + publish
    setStatus(shadow, '✅ Form filled — upload photos then review & publish', 'done');

    // Mark as staged in storage
    chrome.storage.local.get('ht_statuses', result => {
      const statuses = result.ht_statuses || {};
      statuses[vehicle.vin] = 'staged';
      chrome.storage.local.set({ ht_statuses: statuses });
      _statuses = statuses;
      renderInventoryList(shadow);
    });

  } catch (err) {
    setStatus(shadow, `❌ Error: ${err.message}`, 'error');
    console.error('[Hatchett Torque] Form fill error:', err);
  }
}

// ── React-compatible text field filler ──────────────────────────────────────────

async function fillTextField(selectors, value) {
  const input = findElement(selectors);
  if (!input) return false;

  input.focus();
  await delay(randomMs(80, 150));

  // Bypass React's controlled component guard via native prototype setter
  const proto = input.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;

  const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (nativeSetter) {
    nativeSetter.call(input, value);
  } else {
    input.value = value;
  }

  fireReactEvents(input);
  await delay(randomMs(80, 200));
  input.blur();
  return true;
}

/**
 * fillContentEditable
 *
 * Facebook's description field is a contenteditable div, not a textarea.
 * We simulate keypress events to set its content. ExecCommand is used as
 * the most reliable fallback for React's event delegation.
 */
async function fillContentEditable(value) {
  // Selector priority list — update here if FB patches the DOM
  const selectors = [
    'div[aria-label="Description"][contenteditable="true"]',
    'div[role="textbox"][contenteditable="true"][aria-multiline="true"]',
    '[data-testid="marketplace-description-field"]',
    'div[contenteditable="true"][class*="description" i]',
  ];

  // Find all contenteditable divs and use the one most likely to be description
  // (typically the second one on the page — the first is title)
  let target = findElement(selectors);

  if (!target) {
    const all = document.querySelectorAll('div[contenteditable="true"]');
    // Use the second contenteditable if multiple — first is usually title
    target = all[all.length > 1 ? 1 : 0] || null;
  }

  if (!target) return false;

  target.focus();
  await delay(randomMs(100, 200));

  // Select all existing content and replace
  document.execCommand('selectAll', false, null);
  await delay(50);
  document.execCommand('insertText', false, value);

  // Dispatch React-compatible events
  target.dispatchEvent(new Event('input', { bubbles: true }));
  target.dispatchEvent(new Event('change', { bubbles: true }));

  await delay(randomMs(100, 200));
  return true;
}

// ── Pseudo-dropdown handler ────────────────────────────────────────────────────

/**
 * selectDropdownByLabel
 *
 * Facebook renders many form controls as div[role="button"] wrappers rather
 * than native <select> elements. This function:
 *   1. Finds the wrapper matching the aria-label or inner text label
 *   2. Simulates a click to open the popover
 *   3. Waits for the option list to appear in the DOM
 *   4. Text-matches and clicks the target option
 *   5. Fires input/change events to commit the React state update
 *
 * Selector archaeology (update on FB layout patches):
 *   Label containers: [aria-label="${label}"]  ||  div:contains("${label}") ancestor of div[role="button"]
 *   Option items:     div[role="option"]  ||  li[role="option"]  ||  div[role="menuitem"]
 */
async function selectDropdownByLabel(label, value, shadow) {
  if (!value) return false;

  // Approach A: aria-label on the trigger element
  let trigger = document.querySelector(
    `[aria-label="${label}"], [aria-label*="${label}" i]`
  );

  // Approach B: Find by visible text label sibling
  if (!trigger) {
    const allButtons = document.querySelectorAll('div[role="button"], button, div[role="combobox"]');
    for (const btn of allButtons) {
      if (btn.textContent.trim().toLowerCase().includes(label.toLowerCase())) {
        trigger = btn;
        break;
      }
    }
  }

  // Approach C: Label element pointing to an input
  if (!trigger) {
    const labels = document.querySelectorAll('label, span, div');
    for (const el of labels) {
      if (el.childElementCount === 0 && el.textContent.trim().toLowerCase() === label.toLowerCase()) {
        trigger = el.closest('[role="button"], button') ||
                  el.parentElement?.querySelector('[role="button"], button, select');
        if (trigger) break;
      }
    }
  }

  if (!trigger) {
    setStatus(shadow, `⚠ Dropdown "${label}" not found — fill manually`, null);
    return false;
  }

  trigger.click();
  await delay(randomMs(300, 500));

  // Wait for option list to appear (max 3 seconds)
  const optionList = await waitForElement(
    'div[role="option"], li[role="option"], div[role="menuitem"], div[role="listbox"] div',
    3000
  );

  if (!optionList) {
    setStatus(shadow, `⚠ Options for "${label}" didn't appear — fill manually`, null);
    return false;
  }

  // Find matching option by text
  const allOptions = document.querySelectorAll(
    'div[role="option"], li[role="option"], div[role="menuitem"]'
  );
  const lowerValue = value.toLowerCase();

  let matched = null;
  for (const opt of allOptions) {
    const text = opt.textContent.trim().toLowerCase();
    if (text === lowerValue || text.startsWith(lowerValue)) {
      matched = opt;
      break;
    }
  }

  // Fuzzy fallback
  if (!matched) {
    for (const opt of allOptions) {
      if (opt.textContent.trim().toLowerCase().includes(lowerValue)) {
        matched = opt;
        break;
      }
    }
  }

  if (!matched) {
    // Close popover by pressing Escape and continue
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    setStatus(shadow, `⚠ Option "${value}" not found in "${label}" — select manually`, null);
    return false;
  }

  matched.click();
  await delay(randomMs(150, 300));
  fireReactEvents(matched);
  return true;
}

// ─── React event helper ────────────────────────────────────────────────────────

function fireReactEvents(el) {
  ['input', 'change', 'blur'].forEach(evtName => {
    el.dispatchEvent(new Event(evtName, { bubbles: true, cancelable: true }));
  });
}

// ─── Utility: element finders ─────────────────────────────────────────────────

function findElement(selectors) {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el) return el;
    } catch (_) { /* invalid selector — skip */ }
  }
  return null;
}

function waitForElement(selector, timeoutMs = 3000) {
  return new Promise(resolve => {
    if (document.querySelector(selector)) return resolve(document.querySelector(selector));
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) { observer.disconnect(); resolve(el); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); resolve(null); }, timeoutMs);
  });
}

// ─── Human-emulation timing ────────────────────────────────────────────────────

function randomMs(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Normalization helpers ─────────────────────────────────────────────────────

function normalizeFuelType(raw) {
  const lower = (raw || '').toLowerCase();
  if (lower.includes('gas') || lower.includes('gasoline') || lower.includes('petrol')) return 'Gasoline';
  if (lower.includes('diesel'))   return 'Diesel';
  if (lower.includes('electric')) return 'Electric';
  if (lower.includes('hybrid'))   return 'Hybrid';
  if (lower.includes('plug'))     return 'Plug-in hybrid';
  return raw;
}

function formatMileageShort(raw) {
  const n = parseInt(String(raw || '0').replace(/[^0-9]/g, ''), 10);
  if (isNaN(n) || n === 0) return '—';
  return n >= 1000 ? `${(n / 1000).toFixed(0)}k mi` : `${n} mi`;
}

function statusLabel(status) {
  return { active: 'Active', staged: 'Staged', out_of_stock: 'Sold', unset: 'In Stock' }[status] || 'In Stock';
}

// ─── String safety ─────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Status bar ────────────────────────────────────────────────────────────────

function setStatus(shadow, text, state) {
  const dot  = shadow.getElementById('ht-status-dot');
  const span = shadow.getElementById('ht-status-text');
  if (!dot || !span) return;
  span.textContent = text;
  dot.className = 'ht-status-dot';
  if (state) dot.classList.add(state);
}

// ─── Copy flash ────────────────────────────────────────────────────────────────

function showCopyFlash(shadow, message) {
  const existing = shadow.querySelector('.ht-copy-flash');
  if (existing) existing.remove();

  const flash = document.createElement('div');
  flash.className = 'ht-copy-flash';
  flash.textContent = message;
  shadow.appendChild(flash);
  setTimeout(() => flash.remove(), 2000);
}

// ─── Fallback description (if copywriter module fails) ────────────────────────

function buildFallbackDescription(v) {
  return [
    `${v.year} ${v.make} ${v.model}${v.trim ? ' ' + v.trim : ''} — Ready to roll.`,
    '',
    `Mileage: ${v.mileage || 'Ask us'}`,
    v.price ? `Price: $${v.price}` : '',
    v.transmission ? `Transmission: ${v.transmission}` : '',
    v.engine ? `Engine: ${v.engine}` : '',
    '',
    (v.features || []).slice(0, 5).map(f => `✅ ${f}`).join('\n'),
    '',
    `VIN: ${v.vin}`,
    v.stockNumber ? `Stock #: ${v.stockNumber}` : '',
    '',
    'Message us to schedule a test drive. Financing available.',
  ].filter(Boolean).join('\n');
}

// ─── Background message listener ──────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'LOAD_VEHICLE') {
    _selected = msg.vehicle;
    // Find the shadow root we created
    const host   = document.getElementById('ht-torque-host');
    const shadow = host?.shadowRoot;
    if (shadow) {
      const panel  = shadow.getElementById('ht-panel');
      const toggle = shadow.getElementById('ht-toggle');
      panel?.classList.add('open');
      toggle?.classList.add('shifted');
      shadow.getElementById('ht-fill-btn').disabled    = false;
      shadow.getElementById('ht-preview-btn').disabled = false;
      renderStagingArea(shadow);
      renderInventoryList(shadow);
      setStatus(shadow, `Vehicle loaded: ${msg.vehicle.year} ${msg.vehicle.make} ${msg.vehicle.model}`, 'done');
    }
    sendResponse({ ok: true });
  }
});
