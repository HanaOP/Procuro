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

  // Generic premium terms.
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

  return Math.min(multiplier, 2.5);
}

function estimateRequestPricing({ itemName, itemDetails, category, quantity }) {
  const parsedQuantity = parseInt(quantity, 10);
  const safeQuantity = Number.isNaN(parsedQuantity) || parsedQuantity < 1 ? 1 : parsedQuantity;
  const basePrice = getBasePrice(itemName, category);
  const multiplier = getSpecMultiplier(itemName, itemDetails);
  const estimatedUnitPrice = roundToTwo(basePrice * multiplier);
  const estimatedTotal = roundToTwo(estimatedUnitPrice * safeQuantity);

  return {
    estimatedUnitPrice,
    estimatedTotal,
    basePrice,
    multiplier
  };
}

module.exports = { estimateRequestPricing };