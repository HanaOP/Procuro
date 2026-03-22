const { PurchaseRequest, DepartmentBudget } = require('../db');
const { Op } = require('sequelize');
const { estimateRequestPricing } = require('../utils/pricingEstimator');

let userSessions = {};

function isResetCommand(text) {
  const normalized = (text || '').toLowerCase().trim();
  return /^(clear|reset|restart|start over|new request|new requisition|cancel)$/i.test(normalized)
    || /\b(clear chat|new request|start a new request|start over|reset this request)\b/i.test(normalized);
}

function hasSwitchIntent(text) {
  const normalized = (text || '').toLowerCase();
  return /(need|buy|request|want|get|instead|never mind|change)/.test(normalized);
}

function createFreshSession(department) {
  return {
    department,
    awaiting_item_details: false
  };
}

function extractQuantityFromText(text) {
  const numericMatch = text.match(/\b\d+\b/);
  if (numericMatch) {
    return parseInt(numericMatch[0], 10);
  }

  const quantityWords = [
    ['twenty', 20],
    ['nineteen', 19],
    ['eighteen', 18],
    ['seventeen', 17],
    ['sixteen', 16],
    ['fifteen', 15],
    ['fourteen', 14],
    ['thirteen', 13],
    ['twelve', 12],
    ['eleven', 11],
    ['ten', 10],
    ['nine', 9],
    ['eight', 8],
    ['seven', 7],
    ['six', 6],
    ['five', 5],
    ['four', 4],
    ['three', 3],
    ['two', 2],
    ['one', 1]
  ];

  for (const [word, value] of quantityWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(text)) {
      return value;
    }
  }

  if (/\bcouple\b/i.test(text)) {
    return 2;
  }

  if (/\b(single|a|an)\b/i.test(text)) {
    return 1;
  }

  return null;
}

function inferItemName(text) {
  const itemMatchers = [
    { pattern: /\b(table\s+lamp|desk\s+lamp|lamps?)\b/i, name: 'Lamp' },
    { pattern: /\blaptops?\b/i, name: 'Laptop' },
    { pattern: /\bprinters?\b/i, name: 'Printer' },
    { pattern: /\bchairs?\b/i, name: 'Chair' },
    { pattern: /\bmonitors?\b/i, name: 'Monitor' },
    { pattern: /\bkeyboards?\b/i, name: 'Keyboard' },
    { pattern: /\bmice\b/i, name: 'Mouse' },
    { pattern: /\bmouse\b/i, name: 'Mouse' },
    { pattern: /\bdesks?\b/i, name: 'Desk' },
    { pattern: /\btables?\b/i, name: 'Table' },
    { pattern: /\bprojectors?\b/i, name: 'Projector' }
  ];

  const matched = itemMatchers.find((item) => item.pattern.test(text));
  return matched ? matched.name : null;
}

function inferCategoryFromItemName(itemName) {
  if (!itemName) return null;

  const normalized = itemName.toLowerCase();

  if (/(laptop|printer|monitor|keyboard|mouse|projector|server|router)/.test(normalized)) {
    return 'IT';
  }

  if (/(chair|desk|table|cabinet|sofa)/.test(normalized)) {
    return 'FURNITURE';
  }

  if (/(lamp|light)/.test(normalized)) {
    return 'OFFICE';
  }

  return 'OFFICE';
}

function getProductSpecPrompt(itemName) {
  if (!itemName) {
    return 'Please provide product specifications (brand, model, and key requirements).';
  }

  const normalized = itemName.toLowerCase();

  if (normalized.includes('laptop')) {
    return 'Please share laptop specifications: brand/model, processor, RAM, storage, and preferred screen size.';
  }

  if (normalized.includes('printer')) {
    return 'Please share printer specifications: brand/model, type (laser/inkjet), color or mono, and required print volume.';
  }

  if (normalized.includes('chair') || normalized.includes('desk') || normalized.includes('table')) {
    return 'Please share furniture preferences in simple terms: size, color/style, and where it will be used (for example: work desk, meeting room, reception).';
  }

  if (normalized.includes('lamp')) {
    return 'Please share lamp preferences: type (desk/table), size, color, and brightness preference (for example: warm light or bright white).';
  }

  return 'Please provide product specifications (brand/model and key technical requirements).';
}

function getMinimumSpecRules(itemName) {
  const normalized = (itemName || '').toLowerCase();

  if (normalized.includes('laptop')) {
    return [
      { label: 'brand or model', pattern: /(brand|model|dell|hp|lenovo|asus|acer|apple|macbook)/i },
      { label: 'processor', pattern: /(processor|cpu|intel|amd|ryzen|i3|i5|i7|i9)/i },
      { label: 'ram', pattern: /(ram|\b\d+\s?gb\s?ram\b)/i },
      { label: 'storage', pattern: /(ssd|hdd|storage|\b\d+\s?(gb|tb)\b)/i }
    ];
  }

  if (normalized.includes('printer')) {
    return [
      { label: 'brand or model', pattern: /(brand|model|hp|canon|epson|brother|xerox)/i },
      { label: 'printer type', pattern: /(laser|inkjet|dot matrix|thermal|multifunction|all-in-one)/i },
      { label: 'color requirement', pattern: /(color|colour|mono|monochrome|black\s?and\s?white)/i }
    ];
  }

  if (normalized.includes('chair')) {
    return [
      { label: 'chair type or use case', pattern: /(office|ergonomic|visitor|executive|mesh|revolving|meeting|reception|work\s?from\s?home|task\s?chair)/i },
      { label: 'color or style preference', pattern: /(color|colour|white|black|grey|gray|brown|blue|red|style|modern|classic|simple)/i }
    ];
  }

  if (normalized.includes('desk') || normalized.includes('table')) {
    return [
      { label: 'size', pattern: /(dimension|size|small|medium|large|compact|\b\d+\s?(cm|mm|inch|ft|feet)\b)/i },
      { label: 'color or style preference', pattern: /(color|colour|white|black|grey|gray|brown|blue|red|style|modern|classic|minimal)/i }
    ];
  }

  if (normalized.includes('lamp')) {
    return [
      { label: 'lamp type', pattern: /(lamp|light|desk\s?lamp|table\s?lamp|study\s?lamp|bedside)/i },
      { label: 'size or color preference', pattern: /(size|small|medium|large|compact|color|colour|white|black|grey|gray|blue|warm|bright)/i }
    ];
  }

  return [
    { label: 'brand or model', pattern: /(brand|model)/i },
    { label: 'key technical requirement', pattern: /(spec|specification|feature|requirement|capacity|size|rating)/i }
  ];
}

function getMissingMinimumSpecs(itemName, itemDetails) {
  const details = (itemDetails || '').trim();
  const rules = getMinimumSpecRules(itemName);

  return rules
    .filter((rule) => !rule.pattern.test(details))
    .map((rule) => rule.label);
}

function mergeSpecs(existingSpecs, incomingText) {
  const existing = (existingSpecs || '').trim();
  const incoming = (incomingText || '').trim();

  if (!existing) return incoming;
  if (!incoming) return existing;

  if (existing.toLowerCase().includes(incoming.toLowerCase())) {
    return existing;
  }

  return `${existing}; ${incoming}`;
}

function extractProductSpecsFromText(text) {
  const trimmed = text.trim();
  if (trimmed.length < 8) return null;

  const hasSpecKeywords = /(spec|specification|brand|model|ram|ssd|hdd|gb|tb|inch|i3|i5|i7|ryzen|dpi|ppm|wireless|ergonomic|dimensions?|size|small|medium|large|compact|color|colour|style|modern|classic|warm|bright|meeting|reception|desk|table|lamp)/i.test(trimmed);
  return hasSpecKeywords ? trimmed : null;
}

function buildValidatedDate(year, month, day) {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);

  const parsed = new Date(y, m - 1, d);
  if (
    parsed.getFullYear() !== y ||
    parsed.getMonth() !== m - 1 ||
    parsed.getDate() !== d
  ) {
    return null;
  }

  return parsed;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = startOfDay(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isAtLeastTwoDaysFromNow(date) {
  if (!date) return false;
  const minAllowedDate = addDays(new Date(), 2);
  return startOfDay(date) >= minAllowedDate;
}

function parseRelativeWeekday(baseDate, targetWeekday, mode) {
  const currentWeekday = baseDate.getDay();
  let diff = (targetWeekday - currentWeekday + 7) % 7;

  if (mode === 'next') {
    if (diff === 0) diff = 7;
    return addDays(baseDate, diff);
  }

  // mode === 'this'
  return addDays(baseDate, diff);
}

function extractNaturalDateFromText(text) {
  const today = startOfDay(new Date());
  const normalized = text.toLowerCase();

  if (/\bday after tomorrow\b/.test(normalized)) return addDays(today, 2);
  if (/\btomorrow\b/.test(normalized)) return addDays(today, 1);
  if (/\btoday\b/.test(normalized)) return today;

  const weekdays = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };

  const nextWeekdayMatch = normalized.match(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (nextWeekdayMatch) {
    return parseRelativeWeekday(today, weekdays[nextWeekdayMatch[1]], 'next');
  }

  const thisWeekdayMatch = normalized.match(/\bthis\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (thisWeekdayMatch) {
    return parseRelativeWeekday(today, weekdays[thisWeekdayMatch[1]], 'this');
  }

  const plainWeekdayMatch = normalized.match(/\b(on\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (plainWeekdayMatch) {
    return parseRelativeWeekday(today, weekdays[plainWeekdayMatch[2]], 'this');
  }

  return null;
}

function extractDateFromText(text) {
  const naturalDate = extractNaturalDateFromText(text);
  if (naturalDate) return naturalDate;

  const ymd = text.match(/\b(\d{4})[-\/]?(\d{2})[-\/]?(\d{2})\b/);
  if (ymd) {
    const parsed = buildValidatedDate(ymd[1], ymd[2], ymd[3]);
    if (parsed) return parsed;
  }

  const dmy = text.match(/\b(\d{2})[-\/](\d{2})[-\/](\d{4})\b/);
  if (dmy) {
    const parsed = buildValidatedDate(dmy[3], dmy[2], dmy[1]);
    if (parsed) return parsed;
  }

  return null;
}

async function chatHandler(req, res) {
  let session;
  try {
    const message = (req.body.message || '').trim();
    const msg = message.toLowerCase();

    if (!message) {
      return res.json({ reply: 'Please type your request message to continue.' });
    }

    const user_id = req.user?.user_id || 1;
    const role = req.user?.role || 'EMPLOYEE';
    const userDepartment = req.user?.department || 'IT';

    if (role !== 'EMPLOYEE') {
      return res.json({ reply: 'Only employees allowed' });
    }

    if (isResetCommand(msg)) {
      userSessions[user_id] = createFreshSession(userDepartment);
      return res.json({
        reply: 'Started a new request. What item do you need now?'
      });
    }

    // Initialize session
    if (!userSessions[user_id]) {
      userSessions[user_id] = createFreshSession(userDepartment);
    }

    // Auto-set department from user's registered department
    if (!userSessions[user_id].department) {
      userSessions[user_id].department = userDepartment;
    }

    session = userSessions[user_id];

    const detectedItemInMessage = inferItemName(msg);
    const switchedToDifferentItem =
      !!session.item_name &&
      !!detectedItemInMessage &&
      detectedItemInMessage.toLowerCase() !== String(session.item_name).toLowerCase() &&
      hasSwitchIntent(msg);

    if (switchedToDifferentItem) {
      const nextSession = createFreshSession(userDepartment);
      nextSession.item_name = detectedItemInMessage;
      nextSession.category = inferCategoryFromItemName(detectedItemInMessage);

      const quantity = extractQuantityFromText(msg);
      if (quantity) nextSession.quantity = quantity;

      const parsedDate = extractDateFromText(msg);
      if (parsedDate) nextSession.required_by = parsedDate;

      const detectedSpecs = extractProductSpecsFromText(message);
      if (detectedSpecs) nextSession.item_details = detectedSpecs;

      userSessions[user_id] = nextSession;
      session = nextSession;

      if (!session.item_details) {
        session.awaiting_item_details = true;
        return res.json({
          reply: `No problem, I started a new request for ${session.item_name}. ${getProductSpecPrompt(session.item_name)}`
        });
      }
    }

    if (session.awaiting_item_details) {
      const incomingSpecs = message.trim();
      if (!incomingSpecs) {
        return res.json({ reply: "Please provide product specifications to continue." });
      }

      const previousSpecs = session.item_details || '';
      const missingBefore = getMissingMinimumSpecs(session.item_name, previousSpecs);
      const mergedSpecs = mergeSpecs(previousSpecs, incomingSpecs);
      const missingSpecs = getMissingMinimumSpecs(session.item_name, mergedSpecs);

      // Accept short messages if they contribute required specification fields
      // (for example: just a brand name like "Dell").
      const contributedNewInfo =
        mergedSpecs !== previousSpecs || missingSpecs.length < missingBefore.length;

      if (!contributedNewInfo) {
        return res.json({ reply: "Please provide a bit more detail about the product specifications." });
      }

      session.item_details = mergedSpecs;

      if (missingSpecs.length > 0) {
        return res.json({
          reply: `Please also provide: ${missingSpecs.join(', ')}.`
        });
      }

      session.awaiting_item_details = false;
    }

    /* =========================
       🔥 SMART EXTRACTION
    ========================= */

    // Quantity
    if (!session.quantity) {
      const quantity = extractQuantityFromText(msg);
      if (quantity) session.quantity = quantity;
    }

    // Date
    if (!session.required_by) {
      const parsedDate = extractDateFromText(msg);
      if (parsedDate) session.required_by = parsedDate;
    }

    // Item
    if (!session.item_name) {
      const detectedItem = inferItemName(msg);
      if (detectedItem) session.item_name = detectedItem;
    }

    // Product specifications
    if (!session.item_details) {
      const detectedSpecs = extractProductSpecsFromText(message);
      if (detectedSpecs) session.item_details = detectedSpecs;
    }

    // Category is auto-derived from item name
    if (!session.category) {
      session.category = inferCategoryFromItemName(session.item_name);
    }

    // Delivery Location
    if (!session.delivery_location && msg.includes("deliver")) {
      const parts = message.split("to");
      if (parts.length > 1) {
        session.delivery_location = parts[1].trim();
      }
    }

    /* =========================
       🔥 ASK MISSING FIELDS
    ========================= */

    if (!session.item_name) {
      return res.json({ reply: "What item do you need?" });
    }

    if (!session.quantity) {
      return res.json({ reply: "How many units?" });
    }

    if (!session.item_details) {
      session.awaiting_item_details = true;
      return res.json({ reply: getProductSpecPrompt(session.item_name) });
    }

    const missingSpecs = getMissingMinimumSpecs(session.item_name, session.item_details);
    if (missingSpecs.length > 0) {
      session.awaiting_item_details = true;
      return res.json({
        reply: `Please provide the minimum specifications for ${session.item_name}: ${missingSpecs.join(', ')}.`
      });
    }

    if (!session.required_by) {
      return res.json({
        reply: 'By what delivery date do you need this? Please share a date (YYYY-MM-DD or next monday).'
      });
    }

    if (!isAtLeastTwoDaysFromNow(session.required_by)) {
      return res.json({
        reply: "Required date must be at least 2 days from today. Please provide a later date."
      });
    }

    /* =========================
       🔥 SAFETY CHECK
    ========================= */

    if (
      !session.item_name ||
      !session.quantity ||
      !session.item_details ||
      !session.category ||
      !session.required_by
    ) {
      return res.json({ reply: "Missing required details. Please restart." });
    }

    console.log("SESSION DATA:", session);

    /* =========================
       🔥 FINAL SAVE
    ========================= */

    const pricing = estimateRequestPricing({
      itemName: session.item_name,
      itemDetails: session.item_details,
      category: session.category,
      quantity: session.quantity
    });
    session.estimated_unit_price = pricing.estimatedUnitPrice;
    const total_amount = pricing.estimatedTotal;

    const budget = await DepartmentBudget.findOne({
      where: {
        department: { [Op.iLike]: session.department }
      }
    });

    if (!budget) {
      return res.json({ reply: "No budget found for this department." });
    }

    if (total_amount > parseFloat(budget.remaining_amount)) {
      return res.json({
        reply: `Budget exceeded. Remaining: ${budget.remaining_amount}`
      });
    }

    const pr = await PurchaseRequest.create({
      employee_id: user_id,
      department: session.department,
      item_name: session.item_name,
      item_details: session.item_details,
      quantity: session.quantity,
      estimated_unit_price: session.estimated_unit_price,
      category: session.category,
      required_by: new Date(session.required_by),
      delivery_location: session.delivery_location || null,
      priority: 'MEDIUM',
      total_amount,
      status: 'PENDING_MANAGER'
    });

    // Clear session
    delete userSessions[user_id];

    return res.json({
      reply: `✅ Request submitted successfully! Estimated unit price: Rs ${pricing.estimatedUnitPrice.toLocaleString('en-IN')}. Estimated total: Rs ${pricing.estimatedTotal.toLocaleString('en-IN')}.`,
      request: pr
    });

  } catch (err) {
    console.error("🔥 FULL ERROR:", err);
    console.error("Stack:", err.stack);
    console.error("Session data at error:", session);

    return res.json({
      reply: `Server error occurred: ${err.message}`,
      error: err.message,
      details: err.stack
    });
  }

}

module.exports = { chatHandler };