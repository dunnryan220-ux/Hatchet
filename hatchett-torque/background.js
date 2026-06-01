/**
 * Hatchett Torque — Service Worker (background.js)
 *
 * Responsibilities:
 *  1. Fetch & stream-parse the AutoHive CSV feed into chrome.storage.local
 *  2. Expose a message-passing API consumed by dashboard.js and content.js
 *  3. Orchestrate the "Bulk Post" queue: open FB tabs sequentially, inject
 *     vehicle context, advance the queue on tab completion signals
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const FEED_URL       = 'https://raw.githubusercontent.com/dunnryan220-ux/autohive-inventory/main/AutoHive_Inventory_Full.csv';
const STORAGE_KEY    = 'ht_inventory';
const TS_KEY         = 'ht_inventory_timestamp';
const STATUS_KEY     = 'ht_statuses';       // { [vin]: 'staged'|'active'|'out_of_stock' }
const QUEUE_KEY      = 'ht_queue';          // ordered array of VINs for bulk posting
const PENDING_KEY    = 'ht_pending_vehicle';// single vehicle being injected right now
const CACHE_TTL_MS   = 30 * 60 * 1000;     // 30 minutes
const FB_CREATE_URL  = 'https://www.facebook.com/marketplace/create/item';

// ─── Extension icon click → open dashboard ───────────────────────────────────

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

// ─── Message router ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg.type) {

    case 'FETCH_INVENTORY':
      fetchAndCacheInventory(msg.force, msg.feedUrl)
        .then(inventory => sendResponse({ ok: true, inventory }))
        .catch(err     => sendResponse({ ok: false, error: err.message }));
      return true; // keep channel open for async

    case 'LOAD_CSV_TEXT':
      // { type, csvText } — manual upload path, bypasses network entirely
      try {
        const inventory = parseCSV(msg.csvText);
        if (!inventory.length) throw new Error('No valid vehicle rows found in CSV.');
        chrome.storage.local.set({ [STORAGE_KEY]: inventory, [TS_KEY]: Date.now() });
        sendResponse({ ok: true, inventory });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
      return true;

    case 'GET_INVENTORY':
      getInventory()
        .then(inventory => sendResponse({ ok: true, inventory }))
        .catch(err     => sendResponse({ ok: false, error: err.message }));
      return true;

    case 'SET_STATUS':
      // { type, vin, status }
      setVehicleStatus(msg.vin, msg.status)
        .then(() => sendResponse({ ok: true }))
        .catch(err => sendResponse({ ok: false, error: err.message }));
      return true;

    case 'GET_STATUSES':
      chrome.storage.local.get(STATUS_KEY, r =>
        sendResponse({ ok: true, statuses: r[STATUS_KEY] || {} })
      );
      return true;

    case 'QUEUE_POST_ALL':
      // { type, vins[] }
      startBulkQueue(msg.vins)
        .then(() => sendResponse({ ok: true }))
        .catch(err => sendResponse({ ok: false, error: err.message }));
      return true;

    case 'POST_SINGLE':
      // { type, vehicle }
      openVehicleTab(msg.vehicle)
        .then(tabId => sendResponse({ ok: true, tabId }))
        .catch(err  => sendResponse({ ok: false, error: err.message }));
      return true;

    case 'QUEUE_NEXT':
      advanceQueue()
        .then(() => sendResponse({ ok: true }))
        .catch(err => sendResponse({ ok: false, error: err.message }));
      return true;

    case 'CONTENT_READY':
      // Content script signals it has loaded — inject pending vehicle data
      injectPendingVehicle(_sender.tab?.id)
        .then(() => sendResponse({ ok: true }))
        .catch(err => sendResponse({ ok: false, error: err.message }));
      return true;

    default:
      sendResponse({ ok: false, error: `Unknown message type: ${msg.type}` });
  }
});

// ─── Feed fetching & CSV parsing ─────────────────────────────────────────────

async function fetchAndCacheInventory(force = false, overrideUrl = null) {
  if (!force) {
    const cached = await loadFromCache();
    if (cached) return cached;
  }

  // Allow dashboard to supply a custom feed URL (e.g. GitHub raw, Dropbox)
  const url = overrideUrl || FEED_URL;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': 'text/csv,text/plain,*/*',
      'Cache-Control': 'no-cache',
    },
  });
  if (!response.ok) throw new Error(`Feed fetch failed: ${response.status} ${response.statusText}`);

  const text = await response.text();
  const inventory = parseCSV(text);

  await chrome.storage.local.set({
    [STORAGE_KEY]: inventory,
    [TS_KEY]: Date.now(),
  });

  return inventory;
}

async function getInventory() {
  const cached = await loadFromCache();
  if (cached) return cached;
  return fetchAndCacheInventory(true);
}

async function loadFromCache() {
  const result = await chrome.storage.local.get([STORAGE_KEY, TS_KEY]);
  const inv = result[STORAGE_KEY];
  const ts  = result[TS_KEY];
  if (inv && ts && (Date.now() - ts) < CACHE_TTL_MS) return inv;
  return null;
}

/**
 * parseCSV
 *
 * Handles:
 *  • Standard comma-delimited rows with optional quoted fields
 *  • Pipe-delimited ( | ) multi-value columns (Images, Features)
 *  • CRLF and LF line endings
 *  • UTF-8 BOM stripping
 *
 * Expected header columns (case-insensitive, order flexible):
 *   VIN, Stock, StockNumber, Year, Make, Model, Trim, Price, Mileage,
 *   ExteriorColor, InteriorColor, Engine, Transmission, FuelType,
 *   BodyStyle, VehicleType, Images, Features, Description
 */
function parseCSV(raw) {
  // Strip BOM
  const text = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;

  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse header row into lowercase key map
  const headers = splitCSVLine(lines[0]).map(h => h.trim().toLowerCase());

  const col = name => {
    const aliases = COLUMN_ALIASES[name] || [name];
    for (const a of aliases) {
      const idx = headers.indexOf(a.toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const inventory = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells = splitCSVLine(line);

    const get = name => {
      const idx = col(name);
      return idx !== -1 ? (cells[idx] || '').trim() : '';
    };

    const vin = get('vin');
    if (!vin) continue;

    // Price: prefer Price column, fall back to MSRP
    const priceRaw = get('price') || get('msrp');

    // Engine: prefer full Engine string, fall back to displacement + cylinders
    const engineRaw = get('engine') ||
      [get('enginedisplacement'), get('enginecylinderct') ? get('enginecylinderct') + '-cyl' : '']
        .filter(Boolean).join(' ');

    const vehicle = {
      vin,
      stockNumber:    get('stocknumber'),
      year:           get('year'),
      make:           get('make'),
      model:          get('model'),
      trim:           get('series'),          // "Series" = trim level in this feed
      trimDetail:     get('seriesdetail'),
      condition:      get('newused'),          // "U" or "N"
      price:          priceRaw,
      msrp:           get('msrp'),
      mileage:        get('odometer'),
      exteriorColor:  get('colour'),
      interiorColor:  get('interiorcolor'),
      engine:         engineRaw,
      engineDisp:     get('enginedisplacement'),
      engineCyl:      get('enginecylinderct'),
      transmission:   get('transmission'),
      drivetrain:     get('drivetraindesc'),
      fuelType:       get('fuel'),
      bodyStyle:      get('body'),
      cityMpg:        get('citympg'),
      hwyMpg:         get('highwaympg'),
      dealerName:     get('dealername'),
      dealerCity:     get('dealercity'),
      dealerRegion:   get('dealerregion'),
      daysOnLot:      get('age'),
      certified:      get('certified'),
      // Pipe-delimited multi-value columns
      images:         parsePipeList(get('photos')),
      features:       parsePipeList(get('features')),
      description:    get('description'),
    };

    inventory.push(vehicle);
  }

  return inventory;
}

/**
 * Tokenizes a single CSV line respecting RFC-4180 quoting.
 * Fields may be enclosed in double-quotes and contain commas/newlines.
 */
function splitCSVLine(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } // escaped quote
        else { inQuotes = false; }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
  }
  fields.push(cur);
  return fields;
}

function parsePipeList(value) {
  if (!value) return [];
  return value.split('|').map(s => s.trim()).filter(Boolean);
}

// Column name aliases — primary names match the AutoHive/GitHub feed exactly
// (case-insensitive lookup is applied at parse time)
const COLUMN_ALIASES = {
  vin:               ['vin'],
  stocknumber:       ['stock #', 'stock#', 'stock', 'stocknumber', 'stock_number'],
  newused:           ['new/used', 'newused', 'condition', 'type'],
  year:              ['year', 'modelyear', 'model_year'],
  make:              ['make'],
  model:             ['model'],
  series:            ['series', 'trim', 'trimlevel', 'series detail'],
  seriesdetail:      ['series detail', 'seriesdetail'],
  body:              ['body', 'bodystyle', 'body_style', 'body style'],
  transmission:      ['transmission', 'trans'],
  odometer:          ['odometer', 'mileage', 'miles'],
  enginecylinderct:  ['engine cylinder ct', 'enginecylinderct', 'cylinders'],
  enginedisplacement:['engine displacement', 'enginedisplacement', 'displacement'],
  drivetraindesc:    ['drivetrain desc', 'drivetraindesc', 'drivetrain'],
  colour:            ['colour', 'color', 'exteriorcolor', 'exterior color', 'extcolor'],
  interiorcolor:     ['interior color', 'interiorcolor', 'interior_color'],
  price:             ['price', 'listprice', 'sellingprice', 'internet price'],
  msrp:              ['msrp'],
  certified:         ['certified'],
  description:       ['description', 'comments', 'notes'],
  features:          ['features', 'options', 'equipment'],
  citympg:           ['city mpg', 'citympg', 'city'],
  highwaympg:        ['highway mpg', 'highwaympg', 'hwy mpg', 'highway'],
  photos:            ['photos', 'images', 'imageurls', 'image_urls', 'photourl'],
  dealername:        ['dealer name', 'dealername'],
  engine:            ['engine', 'enginedescription', 'engine description'],
  fuel:              ['fuel', 'fueltype', 'fuel_type', 'fuel type'],
  age:               ['age', 'days on lot', 'daysonlot'],
  dealercity:        ['dealer city', 'dealercity'],
  dealerregion:      ['dealer region', 'dealerregion', 'state'],
};

// ─── Vehicle status management ───────────────────────────────────────────────

async function setVehicleStatus(vin, status) {
  const result = await chrome.storage.local.get(STATUS_KEY);
  const statuses = result[STATUS_KEY] || {};
  statuses[vin] = status;
  await chrome.storage.local.set({ [STATUS_KEY]: statuses });
}

// ─── Tab orchestration & queue ────────────────────────────────────────────────

/**
 * Opens a Facebook Marketplace create-item tab with the vehicle stored as
 * pending context. Content script reads this context on load.
 */
async function openVehicleTab(vehicle) {
  await chrome.storage.local.set({ [PENDING_KEY]: vehicle });
  const tab = await chrome.tabs.create({ url: FB_CREATE_URL, active: true });
  return tab.id;
}

/**
 * Sends the pending vehicle object to the content script in a specific tab.
 * Called when content.js signals CONTENT_READY.
 */
async function injectPendingVehicle(tabId) {
  if (!tabId) return;
  const result = await chrome.storage.local.get(PENDING_KEY);
  const vehicle = result[PENDING_KEY];
  if (!vehicle) return;

  await chrome.tabs.sendMessage(tabId, {
    type: 'LOAD_VEHICLE',
    vehicle,
  });
}

/**
 * Bulk queue: stores VINs and kicks off the first tab.
 * Advances automatically when content script signals QUEUE_NEXT.
 */
async function startBulkQueue(vins) {
  if (!vins?.length) return;

  const inv = await getInventory();
  const statusResult = await chrome.storage.local.get(STATUS_KEY);
  const statuses = statusResult[STATUS_KEY] || {};

  // Only queue vehicles not already marked active
  const eligibleVins = vins.filter(v => statuses[v] !== 'active');

  await chrome.storage.local.set({ [QUEUE_KEY]: eligibleVins });
  await advanceQueue();
}

async function advanceQueue() {
  const result = await chrome.storage.local.get([QUEUE_KEY, STORAGE_KEY]);
  const queue = result[QUEUE_KEY] || [];
  const inventory = result[STORAGE_KEY] || [];

  if (!queue.length) {
    await chrome.storage.local.remove(QUEUE_KEY);
    return;
  }

  const [nextVin, ...remaining] = queue;
  const vehicle = inventory.find(v => v.vin === nextVin);

  if (!vehicle) {
    // Skip unknown VIN and advance
    await chrome.storage.local.set({ [QUEUE_KEY]: remaining });
    return advanceQueue();
  }

  await chrome.storage.local.set({ [QUEUE_KEY]: remaining });
  await openVehicleTab(vehicle);
}

// Listen for tabs navigating away from the create page — signal queue advance
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url) return;

  const wasOnCreatePage = await chrome.storage.local.get('ht_active_tab_' + tabId);

  if (wasOnCreatePage[`ht_active_tab_${tabId}`]) {
    // Tab that was on create page navigated away — treat as completion signal
    if (!tab.url.includes('/marketplace/create/item')) {
      await chrome.storage.local.remove(`ht_active_tab_${tabId}`);
      // Small breathing room before advancing
      setTimeout(() => advanceQueue(), 2000);
    }
  }

  if (tab.url.includes('/marketplace/create/item')) {
    await chrome.storage.local.set({ [`ht_active_tab_${tabId}`]: true });
  }
});
