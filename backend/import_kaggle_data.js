/**
 * import_kaggle_data.js — FIXED VERSION (uses raw SQL, bypasses Sequelize ORM issues)
 */

const fs        = require('fs');
const path      = require('path');
const { parse } = require('csv-parse/sync');
const bcrypt    = require('bcryptjs');
const { Sequelize } = require('sequelize');

const CSV_PATH = process.argv[3] || path.join(__dirname, 'spend_analysis_dataset.csv');

const sequelize = new Sequelize('erp_procuro', 'postgres', 'hana123', {
  host: 'localhost',
  dialect: 'postgres',
  port: 5433,        // ← add this line
  logging: false,
});

const BUYER_DEPARTMENT_MAP = {
  'Kelly Joseph':      'Engineering',
  'Luis Holland':      'Engineering',
  'Cynthia Jenkins':   'Engineering',
  'Aaron Hopkins':     'Engineering',
  'Jasmine Mcgee':     'IT',
  'Walter Pena':       'IT',
  'Barry Johnson':     'IT',
  'Nicole Clay':       'IT',
  'Dawn Padilla':      'Operations',
  'Stephanie Bennett': 'Operations',
  'Lisa Parks':        'Operations',
  'Rebecca Bell':      'Operations',
  'Todd James':        'Administration',
  'Kayla Hanson':      'Administration',
  'Amy Warner':        'Administration',
  'Melissa Mckee':     'Administration',
  'Laura White':       'HR',
  'Jessica Hodges':    'HR',
  'Kevin Adams':       'HR',
  'Noah Long':         'HR',
};

function priorityFromRow(category, unitPrice) {
  const price = parseFloat(unitPrice);
  if (category === 'Software' || price > 500) return 'HIGH';
  if (price > 100) return 'MEDIUM';
  return 'LOW';
}

function requiredByDate(purchaseDate, category) {
  const leadDays = { 'Electronics': 14, 'Software': 7, 'Furniture': 21, 'Stationery': 5, 'Office Supplies': 5, 'Accessories': 10 };
  const d = new Date(purchaseDate);
  d.setDate(d.getDate() + (leadDays[category] || 10));
  return d.toISOString().split('T')[0];
}

function emailFromName(name) {
  return name.toLowerCase().replace(/\s+/g, '.') + '@procuro.internal';
}

async function main() {
  await sequelize.authenticate();
  console.log('✅ Connected to PostgreSQL\n');

  // Check what tables exist
  const [tables] = await sequelize.query(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `);
  console.log('📋 Tables found:', tables.map(t => t.tablename).join(', '), '\n');

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const raw  = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
  console.log(`📄 ${rows.length} rows loaded from CSV\n`);

  const passwordHash = await bcrypt.hash('Import@1234', 10);
  const userMap = {};

  console.log('👤 Creating users...\n');

  for (const [buyerName, department] of Object.entries(BUYER_DEPARTMENT_MAP)) {
    const email = emailFromName(buyerName);

    // Check if user exists using raw SQL
    const [existing] = await sequelize.query(
      `SELECT user_id FROM "USERS" WHERE email = :email`,
      { replacements: { email }, type: sequelize.QueryTypes.SELECT }
    );

    if (!existing) {
      const [result] = await sequelize.query(
        `INSERT INTO "USERS" (name, email, password_hash, role, department, status, is_verified, created_at)
         VALUES (:name, :email, :password_hash, :role, :department, :status, :is_verified, NOW())
         RETURNING user_id`,
        {
          replacements: {
            name: buyerName, email, password_hash: passwordHash,
            role: 'EMPLOYEE', department, status: 'ACTIVE', is_verified: true
          },
          type: sequelize.QueryTypes.INSERT
        }
      );
      userMap[buyerName] = result[0].user_id;
      console.log(`  ✚ ${buyerName.padEnd(20)} → ${department} (id: ${result[0].user_id})`);
    } else {
      userMap[buyerName] = existing.user_id;
      console.log(`  ⏭  ${buyerName.padEnd(20)} → already exists (id: ${existing.user_id})`);
    }
  }

  console.log(`\n✅ ${Object.keys(userMap).length} users ready\n`);
  console.log('📦 Inserting purchase requests...\n');

  let inserted = 0, skipped = 0, failed = 0;

  for (const row of rows) {
    const buyerName  = row.Buyer;
    const employeeId = userMap[buyerName];
    if (!employeeId) { skipped++; continue; }

    const department = BUYER_DEPARTMENT_MAP[buyerName];
    const purchaseDate = new Date(row.PurchaseDate).toISOString();

    // Duplicate check
    const [dup] = await sequelize.query(
      `SELECT pr_id FROM "PURCHASE_REQUESTS" WHERE employee_id = :eid AND item_name = :item AND created_at::date = :dt`,
      {
        replacements: { eid: employeeId, item: row.ItemName, dt: row.PurchaseDate },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (dup) { skipped++; continue; }

    try {
      await sequelize.query(
        `INSERT INTO "PURCHASE_REQUESTS"
          (employee_id, department, item_name, item_details, quantity, estimated_unit_price,
           category, required_by, delivery_location, priority, total_amount, status, is_draft, created_at)
         VALUES
          (:employee_id, :department, :item_name, :item_details, :quantity, :estimated_unit_price,
           :category, :required_by, :delivery_location, :priority, :total_amount, :status, :is_draft, :created_at)`,
        {
          replacements: {
            employee_id:          employeeId,
            department,
            item_name:            row.ItemName,
            item_details:         `Supplier: ${row.Supplier}`,
            quantity:             parseInt(row.Quantity, 10),
            estimated_unit_price: parseFloat(row.UnitPrice),
            category:             row.Category,
            required_by:          requiredByDate(row.PurchaseDate, row.Category),
            delivery_location:    'Main Office',
            priority:             priorityFromRow(row.Category, row.UnitPrice),
            total_amount:         parseFloat(row.TotalCost),
            status:               'COMPLETED',
            is_draft:             false,
            created_at:           purchaseDate,
          },
          type: sequelize.QueryTypes.INSERT
        }
      );
      inserted++;
      process.stdout.write(`\r  Inserted: ${inserted} | Skipped: ${skipped} | Failed: ${failed}`);
    } catch (err) {
      failed++;
      console.error(`\n  ❌ ${row.TransactionID}: ${err.message}`);
    }
  }

  console.log('\n\n─────────────────────────────────────────────');
  console.log('🎉 Import Complete!');
  console.log(`   ✅ Inserted : ${inserted}`);
  console.log(`   ⏭  Skipped  : ${skipped}`);
  console.log(`   ❌ Failed   : ${failed}`);
  console.log('─────────────────────────────────────────────\n');

  // Verify
  const [[prCount]] = await sequelize.query(`SELECT COUNT(*) as count FROM "PURCHASE_REQUESTS"`);
  const [[uCount]]  = await sequelize.query(`SELECT COUNT(*) as count FROM "USERS"`);
  console.log(`🔍 Verification:`);
  console.log(`   PURCHASE_REQUESTS: ${prCount.count} rows`);
  console.log(`   USERS:             ${uCount.count} rows\n`);

  await sequelize.close();
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});