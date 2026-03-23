const SERP_API_URL = 'https://serpapi.com/search.json';
const DUMMY_JSON_URL = 'https://dummyjson.com/products/search';
const USD_TO_INR = parseFloat(process.env.USD_TO_INR || '83');

function roundToTwo(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getBasePrice(itemName = '', category = '') {
  const normalizedItem = String(itemName).toLowerCase();
  const normalizedCategory = String(category).toLowerCase();

  const baseByItem = [
    { test: /(laptop|notebook|macbook)/, value: 55000 },
    { test: /(printer)/, value: 18000 },
    { test: /(chair)/, value: 6000 },
    { test: /(monitor|display)/, value: 12000 },
    { test: /(keyboard)/, value: 1200 },
    { test: /(mouse)/, value: 700 },
    { test: /(desk)/, value: 10000 },
    // Keep specific table-lamp rule above generic table rule.
    { test: /(table\s+lamp|desk\s+lamp|study\s+lamp|bedside\s+lamp)/, value: 1800 },
    { test: /(table)/, value: 8500 },
    { test: /(lamp|light)/, value: 2500 },
    { test: /(projector)/, value: 45000 },
    { test: /(server)/, value: 150000 },
    { test: /(router|switch)/, value: 9000 }
  ];

  const matchedItem = baseByItem.find((item) => item.test.test(normalizedItem));
  if (matchedItem) return matchedItem.value;

  if (/(it|hardware|software|electronics)/.test(normalizedCategory)) return 15000;
  if (/(furniture)/.test(normalizedCategory)) return 7000;
  if (/(office|supplies)/.test(normalizedCategory)) return 3000;

  return 5000;
}

function getSpecMultiplier(itemName = '', itemDetails = '') {
  const normalizedItem = String(itemName).toLowerCase();
  const details = String(itemDetails).toLowerCase();
  let multiplier = 1;

  if (/(premium|enterprise|industrial|heavy duty)/.test(details)) multiplier += 0.15;
  if (/(wireless|bluetooth|smart)/.test(details)) multiplier += 0.08;

  if (/(laptop|notebook|macbook)/.test(normalizedItem)) {
    const ramMatch = details.match(/(\d+)\s?gb\s?ram/);
    const ram = ramMatch ? parseInt(ramMatch[1], 10) : 0;
    if (ram >= 32) multiplier += 0.35;
    else if (ram >= 16) multiplier += 0.2;
    else if (ram >= 8) multiplier += 0.1;

    if (/(i9|ryzen\s?9)/.test(details)) multiplier += 0.4;
    else if (/(i7|ryzen\s?7)/.test(details)) multiplier += 0.25;
    else if (/(i5|ryzen\s?5)/.test(details)) multiplier += 0.12;

    if (/(1\s?tb|2\s?tb|\d\s?tb|nvme)/.test(details)) multiplier += 0.2;
    else if (/(512\s?gb\s?ssd)/.test(details)) multiplier += 0.1;

    if (/(apple|macbook)/.test(details)) multiplier += 0.35;
  }

  if (/printer/.test(normalizedItem)) {
    if (/(laser)/.test(details)) multiplier += 0.15;
    if (/(color|colour)/.test(details)) multiplier += 0.2;
    if (/(multifunction|all-in-one)/.test(details)) multiplier += 0.25;
    if (/(ppm\s?(\d+)|\b\d+\s?ppm\b)/.test(details)) multiplier += 0.08;
  }

  if (/(chair|desk|table)/.test(normalizedItem)) {
    if (/(ergonomic)/.test(details)) multiplier += 0.2;
    if (/(wood|teak|oak)/.test(details)) multiplier += 0.12;
    if (/(steel|metal)/.test(details)) multiplier += 0.1;
    if (/(leather)/.test(details)) multiplier += 0.1;
  }

  if (/(lamp|light)/.test(normalizedItem)) {
    if (/(led)/.test(details)) multiplier += 0.05;
    if (/(dimmable|adjustable|touch|usb)/.test(details)) multiplier += 0.08;
    if (/(smart|wifi|bluetooth)/.test(details)) multiplier += 0.12;
    if (/(industrial|designer|premium)/.test(details)) multiplier += 0.15;
  }

  return Math.min(multiplier, 2.5);
}

function parsePriceValue(input) {
  if (typeof input === 'number' && Number.isFinite(input) && input > 0) {
    return input;
  }

  if (!input) return null;
  const cleaned = String(input).replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const value = parseFloat(cleaned);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function normalizeTokens(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function buildSpecTokens(itemName, itemDetails) {
  const allTokens = [...normalizeTokens(itemName), ...normalizeTokens(itemDetails)];
  const ignored = new Set(['with', 'and', 'for', 'the', 'this', 'that', 'need', 'want', 'item']);
  return Array.from(new Set(allTokens.filter((token) => !ignored.has(token))));
}

function scoreTitleAgainstSpecs(title, specTokens) {
  if (!title || specTokens.length === 0) return 0;
  const normalizedTitle = String(title).toLowerCase();
  let score = 0;
  for (const token of specTokens) {
    if (normalizedTitle.includes(token)) {
      score += 1;
    }
  }
  return score;
}

function buildSearchQuery(itemName, itemDetails) {
  const item = String(itemName || '').trim();
  const details = String(itemDetails || '').trim();
  if (!details) return item;
  const detailTokens = normalizeTokens(details).slice(0, 6).join(' ');
  return `${item} ${detailTokens}`.trim();
}

function calculateRobustAverage(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length <= 2) {
    return sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  }

  const trimCount = Math.max(1, Math.floor(sorted.length * 0.2));
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
  const safe = trimmed.length ? trimmed : sorted;
  return safe.reduce((sum, value) => sum + value, 0) / safe.length;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Procuro-Pricing/1.0',
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

async function fetchSerpApiPriceSamples(query, specTokens) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      engine: 'google_shopping',
      q: query,
      gl: 'in',
      hl: 'en',
      api_key: apiKey
    });

    const data = await fetchJson(`${SERP_API_URL}?${params.toString()}`);
    const results = Array.isArray(data.shopping_results) ? data.shopping_results : [];

    const weighted = results
      .map((item) => {
        const title = item.title || '';
        const raw = item.extracted_price ?? item.price;
        const value = parsePriceValue(raw);
        if (!value) return null;

        return {
          value,
          score: scoreTitleAgainstSpecs(title, specTokens)
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return weighted.map((entry) => entry.value);
  } catch (error) {
    return [];
  }
}

async function fetchDummyJsonPriceSamples(query, specTokens) {
  try {
    const params = new URLSearchParams({ q: query });
    const data = await fetchJson(`${DUMMY_JSON_URL}?${params.toString()}`);
    const products = Array.isArray(data.products) ? data.products : [];

    const weighted = products
      .map((product) => {
        const title = product.title || '';
        const usdPrice = parsePriceValue(product.price);
        if (!usdPrice) return null;

        return {
          value: usdPrice * USD_TO_INR,
          score: scoreTitleAgainstSpecs(title, specTokens)
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return weighted.map((entry) => entry.value);
  } catch (error) {
    return [];
  }
}

function applyMarketAdjustment(marketAverage, multiplier) {
  const boundedMultiplier = Math.max(0.85, Math.min(multiplier, 1.25));
  return marketAverage * boundedMultiplier;
}

async function estimateRequestPricing({ itemName, itemDetails, category, quantity }) {
  const parsedQuantity = parseInt(quantity, 10);
  const safeQuantity = Number.isNaN(parsedQuantity) || parsedQuantity < 1 ? 1 : parsedQuantity;
  const basePrice = getBasePrice(itemName, category);
  const multiplier = getSpecMultiplier(itemName, itemDetails);

  const specTokens = buildSpecTokens(itemName, itemDetails);
  const query = buildSearchQuery(itemName, itemDetails);

  let source = 'heuristic';
  let marketSamples = [];

  if (query) {
    const liveSamples = await fetchSerpApiPriceSamples(query, specTokens);
    if (liveSamples.length >= 3) {
      marketSamples = liveSamples;
      source = 'market_live';
    } else {
      const catalogSamples = await fetchDummyJsonPriceSamples(query, specTokens);
      if (catalogSamples.length >= 2) {
        marketSamples = catalogSamples;
        source = 'market_catalog';
      }
    }
  }

  const marketAverage = calculateRobustAverage(marketSamples);
  const estimatedUnitPrice = roundToTwo(
    marketAverage ? applyMarketAdjustment(marketAverage, multiplier) : basePrice * multiplier
  );
  const estimatedTotal = roundToTwo(estimatedUnitPrice * safeQuantity);

  return {
    estimatedUnitPrice,
    estimatedTotal,
    basePrice,
    multiplier,
    source,
    sampleCount: marketSamples.length,
    marketAverage: marketAverage ? roundToTwo(marketAverage) : null
  };
}

module.exports = { estimateRequestPricing };