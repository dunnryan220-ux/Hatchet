/**
 * Hatchett Torque — AI Copywriting Engine (aiCopywriter.js)
 *
 * Generates conversion-optimized Facebook Marketplace listing copy.
 * Loaded as a content script dependency so it is available globally
 * on the Facebook create-item page, and also importable from dashboard.js.
 *
 * Primary export: window.HatchettCopywriter (content-script context)
 *                 export default HatchettCopywriter (module context)
 */

const HatchettCopywriter = (() => {

  // ─── Headline hook pools ────────────────────────────────────────────────────

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

  const EMOJI_MAP = {
    price:     '💰',
    fire:      '🔥',
    target:    '🎯',
    star:      '⭐',
    check:     '✅',
    speed:     '⚡',
    diamond:   '💎',
    car:       '🚗',
    shield:    '🛡️',
    phone:     '📱',
    calendar:  '📅',
    wrench:    '🔧',
    key:       '🗝️',
    money:     '💵',
    lock:      '🔒',
  };

  // ─── Transmission normalizer ─────────────────────────────────────────────────

  function normalizeTransmission(raw) {
    if (!raw) return null;
    const lower = raw.toLowerCase();
    if (lower.includes('auto'))   return 'Automatic Transmission';
    if (lower.includes('manual') || lower.includes('stick') || lower.includes('6-speed') || lower.includes('mt')) return 'Manual / 6-Speed';
    if (lower.includes('cvt'))    return 'CVT';
    if (lower.includes('dct') || lower.includes('dual')) return 'Dual-Clutch (DCT)';
    return raw;
  }

  // ─── Feature highlighter ─────────────────────────────────────────────────────

  const PREMIUM_FEATURE_KEYWORDS = [
    'leather', 'sunroof', 'moonroof', 'navigation', 'nav', 'bose', 'harman',
    'jbl', 'heated seat', 'cooled seat', 'ventilated', 'remote start', 'blind spot',
    'lane assist', 'adaptive cruise', 'apple carplay', 'carplay', 'android auto',
    'panoramic', '360', 'wireless charge', 'head-up', 'hud', 'night vision',
    'massage', '4wd', 'awd', 'all-wheel', 'four-wheel', 'tow', 'trailer',
  ];

  function extractPremiumFeatures(features) {
    if (!features?.length) return [];
    return features.filter(f =>
      PREMIUM_FEATURE_KEYWORDS.some(kw => f.toLowerCase().includes(kw))
    ).slice(0, 6);
  }

  // ─── Random utility ──────────────────────────────────────────────────────────

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ─── Price formatter ─────────────────────────────────────────────────────────

  function formatPrice(raw) {
    const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
    if (isNaN(n)) return raw || 'Call for Price';
    return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function formatMileage(raw) {
    const n = parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
    if (isNaN(n)) return raw || 'Ask Us';
    return n.toLocaleString('en-US') + ' miles';
  }

  // ─── CTA pool ────────────────────────────────────────────────────────────────

  const CTAS = [
    `${EMOJI_MAP.phone} Message us RIGHT NOW to lock in your test drive before this unit hits our main showroom floor. Financing available for all credit profiles — we work with everyone.`,
    `${EMOJI_MAP.calendar} Don't scroll past this. Message us today to schedule a same-day walkthrough. We offer flexible financing — approvals in minutes, not days.`,
    `${EMOJI_MAP.key} This one's ready to roll today. Message us directly to reserve it — we'll hold it for 24 hours on a deposit. Financing for all credit types available.`,
    `${EMOJI_MAP.money} Ready to deal right now. Message us to get pre-approved and get the keys in your hand this week. Trade-ins welcome at top dollar.`,
    `${EMOJI_MAP.phone} Serious buyers — message us now. We move fast, we deal fair, and we'll get you financed even if you've been turned down elsewhere. First come, first served.`,
  ];

  // ─── Main generator ──────────────────────────────────────────────────────────

  /**
   * generateDescription
   *
   * @param {object} vehicle — parsed vehicle object from CSV engine
   * @param {object} [opts]
   * @param {string} [opts.hookStyle] — 'price'|'condition'|'urgency'|'auto'
   * @returns {string} Full formatted listing description
   */
  function generateDescription(vehicle, opts = {}) {
    const { year, make, model, trim, price, mileage, exteriorColor,
            interiorColor, engine, transmission, fuelType, bodyStyle,
            features, vin, stockNumber } = vehicle;

    const hookStyle = opts.hookStyle || pick(['price', 'condition', 'urgency']);

    // ── Headline ──────────────────────────────────────────────────────────────
    let hookPool;
    let hookEmoji;
    switch (hookStyle) {
      case 'price':
        hookPool = PRICE_HOOKS;
        hookEmoji = EMOJI_MAP.target;
        break;
      case 'condition':
        hookPool = CONDITION_HOOKS;
        hookEmoji = EMOJI_MAP.diamond;
        break;
      default:
        hookPool = URGENCY_HOOKS;
        hookEmoji = EMOJI_MAP.fire;
    }

    const hook = pick(hookPool);
    const headline = `${hookEmoji} ${year} ${make} ${model}${trim ? ' ' + trim : ''} — ${hook}`;

    // ── Opening punch ─────────────────────────────────────────────────────────
    const colorStr   = exteriorColor ? `${exteriorColor} exterior` : '';
    const intStr     = interiorColor ? `, ${interiorColor} interior` : '';
    const colorLine  = (colorStr || intStr) ? `${colorStr}${intStr}.` : '';

    const openingLines = [
      `Here is a razor-clean ${year} ${make} ${model} that is priced to sell fast and built to impress.`,
      `Meet one of the sharpest ${year} ${make} ${model}s you will find anywhere at this price point.`,
      `Stop scrolling — this ${year} ${make} ${model} checks every box and then some.`,
    ];
    const opening = `${pick(openingLines)}${colorLine ? ' ' + colorLine : ''}`;

    // ── Core metrics block ───────────────────────────────────────────────────
    const metricLines = [
      `${EMOJI_MAP.speed} Mileage: ${formatMileage(mileage)}`,
      price   ? `${EMOJI_MAP.money} Listed At: ${formatPrice(price)} — No Games, No Hidden Fees`  : null,
      engine  ? `${EMOJI_MAP.wrench} Engine: ${engine}`                                             : null,
      transmission ? `${EMOJI_MAP.check} Transmission: ${normalizeTransmission(transmission)}`     : null,
      fuelType     ? `${EMOJI_MAP.check} Fuel Type: ${fuelType}`                                    : null,
      bodyStyle    ? `${EMOJI_MAP.car} Body Style: ${bodyStyle}`                                     : null,
    ].filter(Boolean).join('\n');

    // ── Premium features block ───────────────────────────────────────────────
    const premiumFeats = extractPremiumFeatures(features);
    let featuresBlock = '';
    if (premiumFeats.length) {
      featuresBlock = `\n${EMOJI_MAP.star} Highlights You'll Love:\n`
        + premiumFeats.map(f => `  ${EMOJI_MAP.check} ${f}`).join('\n');
    } else if (features?.length) {
      // Fall back to first 4 features if no "premium" detected
      featuresBlock = `\n${EMOJI_MAP.star} Equipped With:\n`
        + features.slice(0, 4).map(f => `  ${EMOJI_MAP.check} ${f}`).join('\n');
    }

    // ── Transparency block ───────────────────────────────────────────────────
    const transparencyLines = [
      `${EMOJI_MAP.shield} We believe in radical transparency — what you see is what you get, period.`,
      `${EMOJI_MAP.shield} No bait-and-switch. The price is the price, and the car is exactly as described.`,
      `${EMOJI_MAP.shield} We stand behind every vehicle we sell. Carfax available on request.`,
    ];
    const transparency = pick(transparencyLines);

    // ── Stock/VIN reference ──────────────────────────────────────────────────
    const refLine = [
      stockNumber ? `Stock #: ${stockNumber}` : null,
      vin         ? `VIN: ${vin}`             : null,
    ].filter(Boolean).join('  |  ');

    // ── CTA ──────────────────────────────────────────────────────────────────
    const cta = pick(CTAS);

    // ── Assemble ─────────────────────────────────────────────────────────────
    const parts = [
      headline,
      '',
      opening,
      '',
      '— Key Numbers —',
      metricLines,
      featuresBlock,
      '',
      transparency,
      '',
      '— Act Now —',
      cta,
      '',
      refLine ? `📋 ${refLine}` : null,
    ].filter(p => p !== null);

    return parts.join('\n');
  }

  /**
   * generateTitle
   * Short listing title suitable for the FB Marketplace title field (max ~100 chars).
   */
  function generateTitle(vehicle) {
    const { year, make, model, trim, price, mileage } = vehicle;
    const priceStr    = price    ? ` — ${formatPrice(price)}`          : '';
    const mileageStr  = mileage  ? ` | ${formatMileage(mileage)}`      : '';
    const trimStr     = trim     ? ` ${trim}`                           : '';
    const candidate   = `${year} ${make} ${model}${trimStr}${priceStr}${mileageStr}`;
    return candidate.length <= 100 ? candidate : `${year} ${make} ${model}${trimStr}${priceStr}`;
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  return {
    generateDescription,
    generateTitle,
    formatPrice,
    formatMileage,
    normalizeTransmission,
  };

})();

// Expose globally for content-script access (loaded before content.js)
if (typeof window !== 'undefined') {
  window.HatchettCopywriter = HatchettCopywriter;
}
