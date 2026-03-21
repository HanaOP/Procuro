const { PurchaseRequest, DepartmentBudget } = require('../db');
const { Op } = require('sequelize');

let userSessions = {};

async function chatHandler(req, res) {
  try {
    const message = req.body.message;

    const user_id = req.user?.user_id || 1;
    const role = req.user?.role || 'EMPLOYEE';

    if (role !== 'EMPLOYEE') {
      return res.json({ reply: 'Only employees allowed' });
    }

    // Initialize session
    if (!userSessions[user_id]) {
      userSessions[user_id] = {};
    }

    let session = userSessions[user_id];
    const msg = message.toLowerCase();

    /* =========================
       🔥 SMART EXTRACTION
    ========================= */

    // Quantity
    if (!session.quantity) {
      const q = msg.match(/\b\d+\b/);
      if (q) session.quantity = parseInt(q[0]);
    }

    // Price
    if (!session.estimated_unit_price) {
      const p = msg.match(/\b\d{3,}\b/);
      if (p) session.estimated_unit_price = parseFloat(p[0]);
    }

    // Date (FIXED)
    if (!session.required_by) {
      const d = msg.match(/\d{4}-\d{2}-\d{2}/);
      if (d) {
        const parsedDate = new Date(d[0]);
        if (!isNaN(parsedDate.getTime())) {
          session.required_by = parsedDate;
        }
      }
    }

    // Item
    if (!session.item_name) {
      if (msg.includes("laptop")) session.item_name = "Laptop";
      else if (msg.includes("chair")) session.item_name = "Chair";
      else if (msg.includes("printer")) session.item_name = "Printer";
    }

    // Category
    if (!session.category) {
      if (msg.includes("it")) session.category = "IT";
      else if (msg.includes("office")) session.category = "OFFICE";
      else if (msg.includes("furniture")) session.category = "FURNITURE";
    }

    // Priority
    if (!session.priority) {
      if (msg.includes("high")) session.priority = "HIGH";
      else if (msg.includes("medium")) session.priority = "MEDIUM";
      else if (msg.includes("low")) session.priority = "LOW";
    }

    // Department
    if (!session.department) {
      if (msg.includes("it")) session.department = "IT";
      else if (msg.includes("hr")) session.department = "HR";
      else if (msg.includes("finance")) session.department = "FINANCE";
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

    if (!session.estimated_unit_price) {
      return res.json({ reply: "Estimated price per unit?" });
    }

    if (!session.category) {
      return res.json({ reply: "Enter category (IT / OFFICE / FURNITURE)" });
    }

    if (!session.required_by) {
      return res.json({ reply: "Enter date (YYYY-MM-DD)" });
    }

    if (!session.delivery_location) {
      return res.json({ reply: "Delivery location?" });
    }

    if (!session.priority) {
      return res.json({ reply: "Priority? (LOW / MEDIUM / HIGH)" });
    }

    if (!session.department) {
      return res.json({ reply: "Which department?" });
    }

    /* =========================
       🔥 SAFETY CHECK
    ========================= */

    if (
      !session.item_name ||
      !session.quantity ||
      !session.estimated_unit_price ||
      !session.category ||
      !session.required_by ||
      !session.delivery_location ||
      !session.priority ||
      !session.department
    ) {
      return res.json({ reply: "Missing required details. Please restart." });
    }

    console.log("SESSION DATA:", session);

    /* =========================
       🔥 FINAL SAVE
    ========================= */

    const total_amount =
      session.quantity * session.estimated_unit_price;

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
      item_details: '',
      quantity: session.quantity,
      estimated_unit_price: session.estimated_unit_price,
      category: session.category,
      required_by: new Date(session.required_by), // ✅ FIXED
      delivery_location: session.delivery_location,
      priority: session.priority,
      total_amount,
      status: 'PENDING_MANAGER'
    });

    // Clear session
    delete userSessions[user_id];

    return res.json({
      reply: "✅ Request submitted successfully!",
      request: pr
    });

  } catch (err) {
    console.error("🔥 FULL ERROR:", err);

    return res.json({
      reply: "Server error occurred",
      error: err.message
    });
  }
}

module.exports = { chatHandler };