# Hatchett Torque — Complete Handoff for Manus AI

## Project Goal

Build a **Chrome Extension (Manifest V3)** called **Hatchett Torque** that:
1. Pulls a live vehicle inventory CSV feed from GitHub
2. Displays inventory in a premium dashboard (options page)
3. Injects a floating sidebar into Facebook Marketplace's listing creation page
4. **Automatically fills in the vehicle listing form** on Facebook Marketplace
5. Stages vehicle photos for the user to upload
6. Generates AI copywriting for listing descriptions

## Current Status

- ✅ Extension installs and loads
- ✅ Dashboard fetches 107 vehicles from GitHub CSV feed and displays them
- ✅ Sidebar injects into Facebook Marketplace and shows inventory
- ✅ Sidebar opens, vehicle selection works, image tray works
- ✅ Form fill button triggers the automation sequence
- ✅ Dropdowns on Facebook's form **open** when triggered
- ❌ **Dropdowns do not commit a selection** — the option is found but the click does not register with React
- ❌ **Photos are not uploaded** — no automation for the file upload input
- ❌ Text fields (Title, Price, Mileage) may or may not be filling correctly

## Critical Technical Context

### Facebook's Form is Built in React
Facebook Marketplace uses React's synthetic event system. **Standard DOM `.click()` is intercepted and swallowed.** You must deliver the full browser pointer event sequence for React to register the interaction:

```
pointerover → pointerenter → mouseover → mouseenter → pointerdown → mousedown → (wait 50ms) → pointerup → mouseup → click
```

Additionally, for `<input>` and `<textarea>` text fields, you must bypass React's controlled component guard by using the **native prototype value setter**:

```javascript
const nativeSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype, 'value'
).set;
nativeSetter.call(inputElement, 'new value');
inputElement.dispatchEvent(new Event('input', { bubbles: true }));
inputElement.dispatchEvent(new Event('change', { bubbles: true }));
```

### Facebook Vehicle Form URL
The actual Facebook vehicle listing form is at:
```
https://www.facebook.com/marketplace/create/vehicle
```
NOT `/create/item`. The manifest content_scripts must match both.

### Facebook Vehicle Form Fields (Confirmed from live screenshots)
- **Condition** dropdown options: `Excellent`, `Very good`, `Good`, `Fair`, `Poor`
- **Fuel type** dropdown options: `Gasoline`, `Diesel`, `Electric`, `Hybrid`, `Flex`, `Petrol`, `Plug-in hybrid`, `Other`
- **Transmission** dropdown options: `Automatic`, `Manual`
- **Interior color** options: `Black`, `Blue`, `Brown`, `Gold`, `Green`, `Gray`, `Pink`, `Purple`, `Red`, `Silver`
- **Vehicle type** (category) options: `Car/Truck`, `Motorcycle`, `Powersports`, `RV/Camper`, `Boat`, `Trailer`, `Golf Cart`

### Photo Upload
Facebook's photo upload uses `<input type="file" accept="image/*" multiple>`. The vehicle images are URLs (not local files), so you cannot use `input.files = ...` directly. The approach is:
1. Fetch each image URL → convert to Blob → create a `File` object
2. Use `DataTransfer` to build a `FileList` and assign it via the native setter trick, OR
3. Use the `DataTransfer` drag-and-drop approach: dispatch `dragenter`, `dragover`, `drop` events on the upload zone with a `DataTransfer` object containing `File` objects

The most reliable approach for Chrome extensions:
```javascript
async function uploadImagesFromUrls(imageUrls) {
  const files = await Promise.all(
    imageUrls.slice(0, 20).map(async (url, i) => {
      const resp = await fetch(url);
      const blob = await resp.blob();
      return new File([blob], `photo_${i+1}.jpg`, { type: blob.type || 'image/jpeg' });
    })
  );

  const fileInput = document.querySelector('input[type="file"][accept*="image"]');
  if (!fileInput) return false;

  const dt = new DataTransfer();
  files.forEach(f => dt.items.add(f));

  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'files'
  ).set;
  nativeSetter.call(fileInput, dt.files);
  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}
```

---

## Data Source

**GitHub CSV Feed URL:**
```
https://raw.githubusercontent.com/dunnryan220-ux/autohive-inventory/main/AutoHive_Inventory_Full.csv
```

**CSV Column Names (actual, confirmed):**

| CSV Column | Maps To |
|---|---|
| `VIN` | vin |
| `Stock #` | stockNumber |
| `New/Used` | condition (`U` = used, `N` = new) |
| `Year` | year |
| `Make` | make |
| `Model` | model |
| `Series` | trim |
| `Series Detail` | trimDetail |
| `Body` | bodyStyle |
| `Transmission` | transmission |
| `Odometer` | mileage |
| `Engine Cylinder Ct` | engineCyl |
| `Engine Displacement` | engineDisp |
| `Drivetrain Desc` | drivetrain |
| `Colour` | exteriorColor |
| `Interior Color` | interiorColor |
| `Price` | price |
| `MSRP` | msrp |
| `Description` | description |
| `Features` | features (pipe `\|` delimited) |
| `City MPG` | cityMpg |
| `Highway MPG` | hwyMpg |
| `Photos` | images (pipe `\|` delimited URLs) |
| `Dealer Name` | dealerName |
| `Engine` | engine |
| `Fuel` | fuelType |
| `Age` | daysOnLot |
| `Dealer City` | dealerCity |
| `Dealer Region` | dealerRegion |
| `Certified` | certified |

---

## File Structure

All files live flat in a single folder (no subfolders except `icons/`):

```
hatchett-torque/
├── manifest.json
├── background.js
├── dashboard.html
├── dashboard.js
├── dashboard.css
├── content.js
├── aiCopywriter.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

**For Chrome extension loading:** zip all files flat (icons at root level), no nested folder.

---

## manifest.json

```json
{
  "manifest_version": 3,
  "name": "Hatchett Torque",
  "version": "1.0.0",
  "description": "Premium automotive inventory deployment to Facebook Marketplace — by Hatchett Automotive.",
  "author": "Hatchett Automotive",

  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "tabs"
  ],

  "host_permissions": [
    "https://www.facebook.com/*",
    "https://raw.githubusercontent.com/*"
  ],

  "background": {
    "service_worker": "background.js"
  },

  "action": {
    "default_title": "Hatchett Torque — Open Dashboard",
    "default_icon": {
      "16":  "icon16.png",
      "48":  "icon48.png",
      "128": "icon128.png"
    }
  },

  "options_ui": {
    "page": "dashboard.html",
    "open_in_tab": true
  },

  "content_scripts": [
    {
      "matches": [
        "https://www.facebook.com/marketplace/create/item*",
        "https://www.facebook.com/marketplace/create/vehicle*"
      ],
      "js": ["aiCopywriter.js", "content.js"],
      "run_at": "document_idle",
      "all_frames": false
    }
  ],

  "web_accessible_resources": [
    {
      "resources": ["icon16.png", "icon48.png", "icon128.png"],
      "matches": ["https://www.facebook.com/*"]
    }
  ],

  "icons": {
    "16":  "icon16.png",
    "48":  "icon48.png",
    "128": "icon128.png"
  }
}
```

---

## background.js

```javascript
/**
 * Hatchett Torque — Service Worker (background.js)
 */

const FEED_URL    = 'https://raw.githubusercontent.com/dunnryan220-ux/autohive-inventory/main/AutoHive_Inventory_Full.csv';
const STORAGE_KEY = 'ht_inventory';
const TS_KEY      = 'ht_inventory_timestamp';
const STATUS_KEY  = 'ht_statuses';
const QUEUE_KEY   = 'ht_queue';
const PENDING_KEY = 'ht_pending_vehicle';
const CACHE_TTL   = 30 * 60 * 1000;
const FB_URL      = 'https://www.facebook.com/marketplace/create/vehicle';

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg.type) {
    case 'FETCH_INVENTORY':
      fetchAndCache(msg.force, msg.feedUrl)
        .then(inv => sendResponse({ ok: true, inventory: inv }))
        .catch(err => sendResponse({ ok: false, error: err.message }));
      return true;
    case 'GET_INVENTORY':
      getInventory()
        .then(inv => sendResponse({ ok: true, inventory: inv }))
        .catch(err => sendResponse({ ok: false, error: err.message }));
      return true;
    case 'SET_STATUS':
      setStatus(msg.vin, msg.status)
        .then(() => sendResponse({ ok: true }))
        .catch(err => sendResponse({ ok: false, error: err.message }));
      return true;
    case 'GET_STATUSES':
      chrome.storage.local.get(STATUS_KEY, r =>
        sendResponse({ ok: true, statuses: r[STATUS_KEY] || {} })
      );
      return true;
    case 'QUEUE_POST_ALL':
      startQueue(msg.vins)
        .then(() => sendResponse({ ok: true }))
        .catch(err => sendResponse({ ok: false, error: err.message }));
      return true;
    case 'POST_SINGLE':
      openTab(msg.vehicle)
        .then(id => sendResponse({ ok: true, tabId: id }))
        .catch(err => sendResponse({ ok: false, error: err.message }));
      return true;
    case 'CONTENT_READY':
      injectPending(_sender.tab?.id)
        .then(() => sendResponse({ ok: true }))
        .catch(err => sendResponse({ ok: false, error: err.message }));
      return true;
    default:
      sendResponse({ ok: false, error: `Unknown: ${msg.type}` });
  }
});

async function fetchAndCache(force = false, overrideUrl = null) {
  if (!force) {
    const cached = await fromCache();
    if (cached) return cached;
  }
  const url = overrideUrl || FEED_URL;
  const resp = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  if (!resp.ok) throw new Error(`Feed fetch failed: ${resp.status}`);
  const text = await resp.text();
  const inv  = parseCSV(text);
  await chrome.storage.local.set({ [STORAGE_KEY]: inv, [TS_KEY]: Date.now() });
  return inv;
}

async function getInventory() {
  const cached = await fromCache();
  return cached || fetchAndCache(true);
}

async function fromCache() {
  const r = await chrome.storage.local.get([STORAGE_KEY, TS_KEY]);
  if (r[STORAGE_KEY] && r[TS_KEY] && (Date.now() - r[TS_KEY]) < CACHE_TTL) return r[STORAGE_KEY];
  return null;
}

function parseCSV(raw) {
  const text = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = splitLine(lines[0]).map(h => h.trim().toLowerCase());
  const col = aliases => {
    for (const a of aliases) {
      const i = headers.indexOf(a.toLowerCase());
      if (i !== -1) return i;
    }
    return -1;
  };
  const COLS = {
    vin:      col(['vin']),
    stock:    col(['stock #','stock#','stock','stocknumber']),
    newused:  col(['new/used','newused','condition']),
    year:     col(['year','modelyear']),
    make:     col(['make']),
    model:    col(['model']),
    series:   col(['series','trim']),
    body:     col(['body','bodystyle']),
    trans:    col(['transmission','trans']),
    odo:      col(['odometer','mileage','miles']),
    engcyl:   col(['engine cylinder ct','enginecylinderct','cylinders']),
    engdisp:  col(['engine displacement','enginedisplacement']),
    drive:    col(['drivetrain desc','drivetraindesc','drivetrain']),
    colour:   col(['colour','color','exteriorcolor','exterior color']),
    interior: col(['interior color','interiorcolor']),
    price:    col(['price','listprice','sellingprice']),
    msrp:     col(['msrp']),
    desc:     col(['description','comments']),
    features: col(['features','options','equipment']),
    citympg:  col(['city mpg','citympg']),
    hwympg:   col(['highway mpg','highwaympg','hwy mpg']),
    photos:   col(['photos','images','imageurls','photourl']),
    dealer:   col(['dealer name','dealername']),
    engine:   col(['engine','enginedescription']),
    fuel:     col(['fuel','fueltype','fuel type']),
    age:      col(['age','days on lot','daysonlot']),
    dcity:    col(['dealer city','dealercity']),
    dregion:  col(['dealer region','dealerregion','state']),
    cert:     col(['certified']),
  };
  const g = (cells, k) => COLS[k] !== -1 ? (cells[COLS[k]] || '').trim() : '';
  const inv = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const c = splitLine(line);
    const vin = g(c, 'vin');
    if (!vin) continue;
    inv.push({
      vin,
      stockNumber:  g(c,'stock'),
      year:         g(c,'year'),
      make:         g(c,'make'),
      model:        g(c,'model'),
      trim:         g(c,'series'),
      condition:    g(c,'newused'),
      price:        g(c,'price') || g(c,'msrp'),
      msrp:         g(c,'msrp'),
      mileage:      g(c,'odo'),
      exteriorColor:g(c,'colour'),
      interiorColor:g(c,'interior'),
      engine:       g(c,'engine') || [g(c,'engdisp'), g(c,'engcyl') ? g(c,'engcyl')+'-cyl':''].filter(Boolean).join(' '),
      transmission: g(c,'trans'),
      drivetrain:   g(c,'drive'),
      fuelType:     g(c,'fuel'),
      bodyStyle:    g(c,'body'),
      cityMpg:      g(c,'citympg'),
      hwyMpg:       g(c,'hwympg'),
      dealerName:   g(c,'dealer'),
      dealerCity:   g(c,'dcity'),
      dealerRegion: g(c,'dregion'),
      daysOnLot:    g(c,'age'),
      certified:    g(c,'cert'),
      images:       pipe(g(c,'photos')),
      features:     pipe(g(c,'features')),
      description:  g(c,'desc'),
    });
  }
  return inv;
}

function splitLine(line) {
  const fields = []; let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') { if (line[i+1]==='"') { cur+='"'; i++; } else inQ=false; }
      else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ',') { fields.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function pipe(v) { return v ? v.split('|').map(s=>s.trim()).filter(Boolean) : []; }

async function setStatus(vin, status) {
  const r = await chrome.storage.local.get(STATUS_KEY);
  const s = r[STATUS_KEY] || {};
  s[vin] = status;
  await chrome.storage.local.set({ [STATUS_KEY]: s });
}

async function openTab(vehicle) {
  await chrome.storage.local.set({ [PENDING_KEY]: vehicle });
  const tab = await chrome.tabs.create({ url: FB_URL, active: true });
  return tab.id;
}

async function injectPending(tabId) {
  if (!tabId) return;
  const r = await chrome.storage.local.get(PENDING_KEY);
  if (!r[PENDING_KEY]) return;
  await chrome.tabs.sendMessage(tabId, { type: 'LOAD_VEHICLE', vehicle: r[PENDING_KEY] });
}

async function startQueue(vins) {
  if (!vins?.length) return;
  const sr = await chrome.storage.local.get(STATUS_KEY);
  const statuses = sr[STATUS_KEY] || {};
  const eligible = vins.filter(v => statuses[v] !== 'active');
  await chrome.storage.local.set({ [QUEUE_KEY]: eligible });
  await advanceQueue();
}

async function advanceQueue() {
  const r = await chrome.storage.local.get([QUEUE_KEY, STORAGE_KEY]);
  const queue = r[QUEUE_KEY] || [];
  if (!queue.length) { await chrome.storage.local.remove(QUEUE_KEY); return; }
  const [next, ...rest] = queue;
  const vehicle = (r[STORAGE_KEY] || []).find(v => v.vin === next);
  await chrome.storage.local.set({ [QUEUE_KEY]: rest });
  if (vehicle) await openTab(vehicle);
  else await advanceQueue();
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;
  const key = `ht_active_tab_${tabId}`;
  const was = await chrome.storage.local.get(key);
  if (was[key] && !tab.url.includes('/marketplace/create/')) {
    await chrome.storage.local.remove(key);
    setTimeout(() => advanceQueue(), 2000);
  }
  if (tab.url.includes('/marketplace/create/')) {
    await chrome.storage.local.set({ [key]: true });
  }
});
```

---

## aiCopywriter.js

```javascript
/**
 * Hatchett Torque — AI Copywriting Engine (aiCopywriter.js)
 * Loaded before content.js; exposes window.HatchettCopywriter
 */

const HatchettCopywriter = (() => {

  const PRICE_HOOKS = [
    'Priced to Move — This One Won\'t Last',
    'Below Market. Above Expectation.',
    'Sharp Price. Zero Apologies.',
    'Aggressively Priced for a Fast Sale',
    'The Number Speaks for Itself',
  ];

  const CONDITION_HOOKS = [
    'Absolute Pristine Condition',
    'Showroom-Ready Right Now',
    'Mint. No Compromises.',
    'Flawless Inside and Out',
    'One of the Cleanest You\'ll Find',
  ];

  const URGENCY_HOOKS = [
    'Moves Fast — Don\'t Sleep on This',
    'Already Turning Heads on the Lot',
    'First Come, First Served — and We Mean It',
    'High-Demand Unit. Serious Buyers Only.',
    'This Will Be Gone Before the Weekend',
  ];

  const PREMIUM_KEYWORDS = [
    'leather','sunroof','moonroof','navigation','nav','bose','harman','jbl',
    'heated seat','cooled seat','remote start','blind spot','lane assist',
    'adaptive cruise','apple carplay','carplay','android auto','panoramic',
    '360','wireless charge','head-up','hud','4wd','awd','all-wheel','tow',
  ];

  const CTAS = [
    '📱 Message us RIGHT NOW to lock in your test drive. Financing available for all credit profiles.',
    '📅 Don\'t scroll past this. Message us today for a same-day walkthrough. Approvals in minutes.',
    '🗝️ This one\'s ready today. Message us to reserve it — we\'ll hold it 24 hrs on a deposit.',
    '💵 Ready to deal right now. Trade-ins welcome at top dollar.',
    '📱 Serious buyers — message us now. We\'ll get you financed even if you\'ve been turned down elsewhere.',
  ];

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function normalizeTransmission(raw) {
    if (!raw) return null;
    const l = raw.toLowerCase();
    if (l.includes('auto')) return 'Automatic Transmission';
    if (l.includes('manual')||l.includes('stick')||l.includes('mt')) return 'Manual';
    if (l.includes('cvt')) return 'CVT';
    return raw;
  }

  function formatPrice(raw) {
    const n = parseFloat(String(raw).replace(/[^0-9.]/g,''));
    if (isNaN(n)) return raw || 'Call for Price';
    return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function formatMileage(raw) {
    const n = parseInt(String(raw).replace(/[^0-9]/g,''),10);
    if (isNaN(n)) return raw || 'Ask Us';
    return n.toLocaleString('en-US') + ' miles';
  }

  function generateDescription(vehicle, opts = {}) {
    const hookStyle = opts.hookStyle || pick(['price','condition','urgency']);
    const hookPool  = hookStyle === 'price' ? PRICE_HOOKS : hookStyle === 'condition' ? CONDITION_HOOKS : URGENCY_HOOKS;
    const { year, make, model, trim, price, mileage, exteriorColor, interiorColor,
            engine, transmission, fuelType, bodyStyle, features, vin, stockNumber } = vehicle;

    const headline = `${year} ${make} ${model}${trim?' '+trim:''} — ${pick(hookPool)}`;
    const colorLine = [exteriorColor && `${exteriorColor} exterior`, interiorColor && `${interiorColor} interior`].filter(Boolean).join(', ');

    const metrics = [
      `⚡ Mileage: ${formatMileage(mileage)}`,
      price        ? `💵 Listed At: ${formatPrice(price)}` : null,
      engine       ? `🔧 Engine: ${engine}`               : null,
      transmission ? `✅ Transmission: ${normalizeTransmission(transmission)}` : null,
      fuelType     ? `✅ Fuel: ${fuelType}`                : null,
      bodyStyle    ? `🚗 Body: ${bodyStyle}`               : null,
    ].filter(Boolean).join('\n');

    const premiumFeats = (features||[]).filter(f=>PREMIUM_KEYWORDS.some(k=>f.toLowerCase().includes(k))).slice(0,6);
    const featBlock = premiumFeats.length
      ? '\n⭐ Highlights:\n' + premiumFeats.map(f=>`  ✅ ${f}`).join('\n')
      : (features?.length ? '\n⭐ Equipped With:\n' + features.slice(0,4).map(f=>`  ✅ ${f}`).join('\n') : '');

    const ref = [stockNumber&&`Stock #: ${stockNumber}`, vin&&`VIN: ${vin}`].filter(Boolean).join('  |  ');

    return [
      headline, '', colorLine||null, '', '— Key Numbers —', metrics, featBlock||null,
      '', '🛡️ No bait-and-switch. Price as described. Carfax available.',
      '', '— Act Now —', pick(CTAS), '', ref ? `📋 ${ref}` : null,
    ].filter(p=>p!==null).join('\n');
  }

  function generateTitle(vehicle) {
    const { year, make, model, trim, price, mileage } = vehicle;
    const p = price   ? ` — ${formatPrice(price)}`    : '';
    const m = mileage ? ` | ${formatMileage(mileage)}`  : '';
    const t = trim    ? ` ${trim}`                     : '';
    const s = `${year} ${make} ${model}${t}${p}${m}`;
    return s.length <= 100 ? s : `${year} ${make} ${model}${t}${p}`;
  }

  return { generateDescription, generateTitle, formatPrice, formatMileage, normalizeTransmission };
})();

if (typeof window !== 'undefined') window.HatchettCopywriter = HatchettCopywriter;
```

---

## dashboard.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hatchett Torque — Dashboard</title>
  <link rel="stylesheet" href="dashboard.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
</head>
<body>
  <div id="app">

    <header id="header">
      <div id="header-brand">
        <div id="header-logo">⚡</div>
        <div id="header-title">
          <h1>Hatchett Torque</h1>
          <span>Inventory Deployment Engine</span>
        </div>
      </div>
      <div id="header-actions">
        <span id="cache-timestamp"></span>
        <input type="file" id="csv-file-input" accept=".csv,text/csv,text/plain" style="display:none" />
        <button class="btn btn-ghost" id="btn-upload-csv">📂 Upload CSV</button>
        <button class="btn btn-secondary" id="btn-refresh">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
          Refresh URL Feed
        </button>
        <button class="btn btn-primary" id="btn-post-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Post All Inventory
        </button>
      </div>
    </header>

    <div id="feed-config" style="display:flex;align-items:center;gap:10px;padding:12px 0 16px;border-bottom:1px solid var(--border);margin-top:8px;">
      <span style="font-size:11px;color:var(--text-muted);white-space:nowrap;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Feed URL</span>
      <input type="text" id="feed-url-input" placeholder="https://… paste your CSV feed URL"
        style="flex:1;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-size:12px;font-family:var(--font-mono);padding:7px 12px;outline:none;"
        spellcheck="false" autocomplete="off" />
      <button class="btn btn-secondary btn-sm" id="btn-save-url">Save &amp; Fetch</button>
      <span id="feed-url-status" style="font-size:11px;color:var(--text-muted);white-space:nowrap;"></span>
    </div>

    <section id="stats-bar">
      <div class="stat-card stat-total"><div class="stat-card-value" id="stat-total">—</div><div class="stat-card-label">Total Vehicles</div></div>
      <div class="stat-card stat-active"><div class="stat-card-value" id="stat-active">—</div><div class="stat-card-label">Active Listings</div></div>
      <div class="stat-card stat-staged"><div class="stat-card-value" id="stat-staged">—</div><div class="stat-card-label">Staged</div></div>
      <div class="stat-card stat-oos"><div class="stat-card-value" id="stat-oos">—</div><div class="stat-card-label">Sold / OOS</div></div>
    </section>

    <div id="queue-banner">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      <span id="queue-label">Queue running…</span>
      <div id="queue-progress-track"><div id="queue-progress-fill" style="width:0%"></div></div>
      <button class="btn btn-ghost btn-sm" id="btn-cancel-queue">Cancel</button>
    </div>

    <div id="toolbar">
      <div id="search-wrap">
        <span id="search-icon">🔍</span>
        <input type="text" id="search-input" placeholder="Search by make, model, VIN, stock number…" autocomplete="off" spellcheck="false" />
      </div>
      <div class="filter-tabs">
        <button class="filter-tab active" data-filter="all">All</button>
        <button class="filter-tab" data-filter="unset">In Stock</button>
        <button class="filter-tab" data-filter="staged">Staged</button>
        <button class="filter-tab" data-filter="active">Active</button>
        <button class="filter-tab" data-filter="out_of_stock">Sold</button>
      </div>
      <div id="toolbar-right">
        <span id="result-count" style="font-size:12px;color:var(--text-muted);"></span>
      </div>
    </div>

    <div id="loading-state"><div class="spinner"></div><p>Fetching inventory…</p></div>
    <div id="empty-state" style="display:none"><div class="empty-icon">🚗</div><p>No vehicles found. Click <strong>Refresh Feed</strong> to load inventory.</p><button class="btn btn-primary" onclick="document.getElementById('btn-refresh').click()" style="margin-top:8px;">Refresh Feed Now</button></div>
    <div id="error-state" style="display:none"><div class="empty-icon">⚠</div><p id="error-message">An error occurred.</p><button class="btn btn-secondary" onclick="document.getElementById('btn-refresh').click()" style="margin-top:8px;">Retry</button></div>
    <div id="inventory-grid" style="display:none"></div>

  </div>

  <div id="modal-overlay">
    <div id="modal-box">
      <div id="modal-title">Generated Listing Description</div>
      <pre id="modal-body"></pre>
      <div id="modal-actions">
        <button class="btn btn-secondary btn-sm" id="modal-regen">↺ Regenerate</button>
        <button class="btn btn-primary btn-sm" id="modal-copy">📋 Copy to Clipboard</button>
        <button class="btn btn-ghost btn-sm" id="modal-close">Close</button>
      </div>
    </div>
  </div>

  <div id="toast-container"></div>

  <script src="aiCopywriter.js"></script>
  <script src="dashboard.js"></script>
</body>
</html>
```

---

## dashboard.js

(This file fetches CSV directly from the dashboard — no service worker dependency)

The full `dashboard.js` source is in the repository at:
`hatchett-torque/dashboard.js`

Key points:
- Fetches CSV directly via `fetch()` (not via service worker messages)
- Inline CSV parser with proper RFC-4180 quoting and pipe-delimited multi-value columns
- On boot: loads from cache only, never auto-fetches (avoids startup errors)
- `postSingleVehicle(vehicle)` opens `https://www.facebook.com/marketplace/create/vehicle` and stores vehicle in `chrome.storage.local` as `ht_pending_vehicle`

---

## dashboard.css

Full source is in the repository at `hatchett-torque/dashboard.css`.

Design system: Modern Japanese Luxury dark mode.
- `--bg-void: #07070e`, `--gold: #c8a45a`, `--gold-bright: #e6c07b`
- Font: Inter (sans) + JetBrains Mono
- Status colors: active=`#22c55e`, staged=`#f59e0b`, oos=`#ef4444`, neutral=`#6366f1`

---

## content.js — The Core Problem File

This is the file that needs the most work. The sidebar injection works. The inventory display works. **The form automation does not work reliably.**

### What Works
- Shadow DOM sidebar mounts correctly
- Toggle tab slides in/out
- Inventory list populates from `chrome.storage.local`
- Vehicle selection, staging area, image tray all work
- Drag-to-upload hint works
- Copy description button works

### What Doesn't Work
1. **Dropdown selections don't commit** — dropdowns open, options are visible, but clicking them doesn't register with React
2. **Photos don't upload** — no code currently exists to upload images from URLs to Facebook's file input
3. **Text field filling** — may work via the native value setter trick but needs verification

### The Fix Needed for Dropdowns

Replace the current `selectDropdownByLabel` with this pattern:

```javascript
// Trigger: use full pointer sequence to open
trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, cancelable:true, composed:true }));
trigger.dispatchEvent(new MouseEvent('mousedown',     { bubbles:true, cancelable:true, composed:true }));
await delay(60);
trigger.dispatchEvent(new PointerEvent('pointerup',   { bubbles:true, cancelable:true, composed:true }));
trigger.dispatchEvent(new MouseEvent('mouseup',       { bubbles:true, cancelable:true, composed:true }));
trigger.dispatchEvent(new MouseEvent('click',         { bubbles:true, cancelable:true, composed:true }));

// Wait for options to be VISIBLE (getBoundingClientRect().width > 0)
await delay(900);

// Find option by visible text content
const option = findVisibleOptionByText(value.toLowerCase());

// Click option with full sequence
['pointerover','pointerenter','mouseover','mouseenter'].forEach(e =>
  option.dispatchEvent(new PointerEvent(e, { bubbles:true, composed:true }))
);
await delay(80);
option.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, cancelable:true, composed:true }));
option.dispatchEvent(new MouseEvent('mousedown',     { bubbles:true, cancelable:true, composed:true }));
await delay(60);
option.dispatchEvent(new PointerEvent('pointerup',   { bubbles:true, cancelable:true, composed:true }));
option.dispatchEvent(new MouseEvent('mouseup',       { bubbles:true, cancelable:true, composed:true }));
option.dispatchEvent(new MouseEvent('click',         { bubbles:true, cancelable:true, composed:true }));
```

### The Fix Needed for Photo Upload

Add this function and call it during `runFormFillSequence`:

```javascript
async function uploadPhotosFromUrls(imageUrls) {
  if (!imageUrls?.length) return false;
  setStatus(shadow, 'Uploading photos…', 'filling');

  // Fetch images and convert to File objects
  const files = [];
  for (let i = 0; i < Math.min(imageUrls.length, 20); i++) {
    try {
      const resp = await fetch(imageUrls[i]);
      const blob = await resp.blob();
      files.push(new File([blob], `photo_${i+1}.jpg`, { type: blob.type || 'image/jpeg' }));
    } catch (_) { /* skip bad URLs */ }
  }
  if (!files.length) return false;

  // Find Facebook's file input
  const fileInput = document.querySelector('input[type="file"][accept*="image"]')
                 || document.querySelector('input[type="file"]');
  if (!fileInput) return false;

  // Assign files via DataTransfer (bypasses browser security restrictions)
  const dt = new DataTransfer();
  files.forEach(f => dt.items.add(f));

  // Use native setter to bypass React's file input guard
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'files'
  ).set;
  if (nativeSetter) {
    nativeSetter.call(fileInput, dt.files);
  } else {
    Object.defineProperty(fileInput, 'files', { value: dt.files });
  }

  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  fileInput.dispatchEvent(new Event('input',  { bubbles: true }));
  await delay(1500); // wait for FB to process uploads
  return true;
}
```

### Condition Value Mapping

The vehicle data has `condition: "U"` (used) or `"N"` (new). Facebook's dropdown uses English words:

```javascript
function deriveCondition(vehicle) {
  if ((vehicle.condition||'').toUpperCase() === 'N') return 'Excellent';
  const miles = parseInt(String(vehicle.mileage||'0').replace(/[^0-9]/g,''), 10) || 0;
  if (miles < 30000)  return 'Excellent';
  if (miles < 70000)  return 'Very good';
  if (miles < 120000) return 'Good';
  return 'Fair';
}
```

### Form Fill Sequence (runFormFillSequence)

Recommended field order and approach for Facebook's vehicle form:

```
1. Title          → fillTextField(['[aria-label="Title"]', 'input[placeholder*="title" i]'])
2. Price          → fillTextField(['[aria-label="Price"]', 'input[placeholder*="price" i]'])
3. Category       → selectDropdownByLabel('Category', 'Vehicles')  [if needed]
4. Year           → selectDropdownByLabel('Year', vehicle.year)
5. Make           → selectDropdownByLabel('Make', vehicle.make)
6. Model          → selectDropdownByLabel('Model', vehicle.model)  [wait extra — depends on Make]
7. Mileage        → fillTextField(['[aria-label="Mileage"]'])
8. Condition      → selectDropdownByLabel('Condition', deriveCondition(vehicle))
9. Transmission   → selectDropdownByLabel('Transmission', vehicle.transmission.includes('auto') ? 'Automatic' : 'Manual')
10. Fuel type     → selectDropdownByLabel('Fuel type', normalizeFuelType(vehicle.fuelType))
11. Photos        → uploadPhotosFromUrls(vehicle.images)
12. Description   → fillContentEditable(description)
```

Note: After selecting Make, wait **at least 1500ms** before trying to select Model — Facebook loads model options dynamically.

---

## Vehicle Object Schema

Each vehicle parsed from the CSV looks like this:

```javascript
{
  vin:          "1N4BL4EV4KC183156",
  stockNumber:  "P4952",
  year:         "2019",
  make:         "NISSAN",
  model:        "Altima",
  trim:         "SV",           // from "Series" column
  condition:    "U",            // "U" = used, "N" = new
  price:        "17995",
  msrp:         "18500",
  mileage:      "47281",        // from "Odometer" column
  exteriorColor:"White",        // from "Colour" column
  interiorColor:"Black",
  engine:       "2.5L 4-cyl",
  transmission: "CVT",
  drivetrain:   "FWD",
  fuelType:     "Gas",
  bodyStyle:    "Sedan",
  cityMpg:      "28",
  hwyMpg:       "39",
  dealerName:   "Hatchett Nissan",
  dealerCity:   "Wichita",
  dealerRegion: "KS",
  daysOnLot:    "12",
  certified:    "",
  images:       ["https://…/img1.jpg", "https://…/img2.jpg", …],  // up to 30+ URLs
  features:     ["Heated Seats", "Apple CarPlay", "Blind Spot Warning", …],
  description:  "…dealer notes…"
}
```

---

## chrome.storage.local Keys

| Key | Type | Contents |
|---|---|---|
| `ht_inventory` | Array | All parsed vehicle objects |
| `ht_inventory_timestamp` | Number | Unix ms of last fetch |
| `ht_statuses` | Object | `{ [vin]: 'staged'\|'active'\|'out_of_stock' }` |
| `ht_queue` | Array | Ordered VINs for bulk posting |
| `ht_pending_vehicle` | Object | Single vehicle awaiting injection on FB tab |
| `ht_feed_url` | String | Custom feed URL (overrides default) |

---

## UI Design Language

**Name:** Modern Japanese Luxury / High-contrast dark mode

**Color palette:**
- Background void: `#07070e`
- Surface: `#12121f`
- Raised surface: `#191928`
- Gold accent: `#c8a45a`
- Gold bright: `#e6c07b`
- Text primary: `#f0f0fa`
- Text secondary: `#9090b8`
- Active/live: `#22c55e`
- Staged: `#f59e0b`
- Sold/OOS: `#ef4444`

**Fonts:** Inter (UI), JetBrains Mono (code/data values)

**Sidebar:** 360px wide, fixed right, slides in with cubic-bezier animation, toggle tab always visible

---

## What Manus AI Needs to Build / Fix

**Priority 1 — Make the form automation work:**
- Implement the full pointer event sequence for dropdown option selection
- Implement `uploadPhotosFromUrls()` — fetch image URLs, convert to Files, assign to FB file input
- Verify text field filling (Title, Price, Mileage) actually commits in React

**Priority 2 — Robustness:**
- Handle the case where Make/Model are type-ahead inputs vs. dropdown lists (Facebook changes this)
- Add retry logic — if an option click doesn't commit, detect it and try again
- Better selector archaeology — FB changes their DOM regularly; build selectors that are resilient

**Priority 3 — Polish:**
- After form fill, scroll to the photo upload section and highlight it for the user
- Show a checklist in the sidebar of what was filled vs. what needs manual attention
- Status bar should update in real time during the fill sequence

---

## Repository

GitHub: `https://github.com/dunnryan220-ux/Hatchet`
Branch: `claude/hatchett-torque-extension-8B6z3`
Live CSV feed: `https://raw.githubusercontent.com/dunnryan220-ux/autohive-inventory/main/AutoHive_Inventory_Full.csv`
