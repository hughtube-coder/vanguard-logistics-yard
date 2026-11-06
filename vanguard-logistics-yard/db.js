const { Pool } = require('pg');

// Automatically uses Render Internal URL in production or falls back to External Singapore DB URL
const connectionString = process.env.DATABASE_URL || 'postgresql://vanguard_admin:xThBynTjLcipMDWqv5HutShp3f7xmh2K@dpg-dbmups67bikc73c297qg-a.singapore-postgres.render.com/vanguard_yard';

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

const initialInventory = [
  { sku: "VLY-HW-101", name: "High-Tensile Structural I-Beams (Grade A)", category: "Structural Hardware", quantity: 24, location: "BAY-A-01", status: "In Stock", supplier: "Apex Industrial Parts" },
  { sku: "VLY-EQ-204", name: "Hydraulic Rough-Terrain Yard Stacker", category: "Heavy Equipment", quantity: 3, location: "BAY-E-02", status: "Low Stock", supplier: "Titan Cargo Lines" },
  { sku: "VLY-PKG-305", name: "Heavy Polyethylene Pallet Wrap (Rolls)", category: "Freight Supplies", quantity: 320, location: "BAY-P-11", status: "In Stock", supplier: "PacEuro Packaging" },
  { sku: "VLY-EL-409", name: "Industrial Ruggedized RFID Scanner Hub", category: "Electronics", quantity: 4, location: "BAY-T-04", status: "Low Stock", supplier: "Global Tech Supply Co." },
  { sku: "VLY-HW-115", name: "Reinforced Dock Leveler Steel Chocks", category: "Structural Hardware", quantity: 0, location: "BAY-A-09", status: "Out of Stock", supplier: "Apex Industrial Parts" },
  { sku: "VLY-PKG-312", name: "Weatherproof Container Cargo Seals", category: "Freight Supplies", quantity: 510, location: "BAY-P-02", status: "In Stock", supplier: "PacEuro Packaging" },
  { sku: "VLY-EQ-210", name: "Electric Tugger Tow Tractor (Model TX)", category: "Heavy Equipment", quantity: 2, location: "BAY-E-08", status: "Low Stock", supplier: "Titan Cargo Lines" }
];

const initialOrders = [
  {
    orderId: "VLY-ORD-9021",
    customer: "Metro Rail Fabrication Yard",
    date: "2026-09-24",
    status: "Picking",
    destination: "Outbound Freight Dock 2",
    items: [
      { sku: "VLY-EL-409", name: "Industrial Ruggedized RFID Scanner Hub", qty: 2, picked: true, location: "BAY-T-04" },
      { sku: "VLY-HW-101", name: "High-Tensile Structural I-Beams (Grade A)", qty: 6, picked: false, location: "BAY-A-01" }
    ]
  },
  {
    orderId: "VLY-ORD-9022",
    customer: "Pacific Bridge Construction Works",
    date: "2026-09-24",
    status: "Pending",
    destination: "Staging Bay 14",
    items: [
      { sku: "VLY-PKG-305", name: "Heavy Polyethylene Pallet Wrap (Rolls)", qty: 40, picked: false, location: "BAY-P-11" },
      { sku: "VLY-PKG-312", name: "Weatherproof Container Cargo Seals", qty: 100, picked: false, location: "BAY-P-02" }
    ]
  },
  {
    orderId: "VLY-ORD-8980",
    customer: "Keystone Rail Assembly Depot",
    date: "2026-09-23",
    status: "Completed",
    destination: "Flatbed Rail Car 09",
    items: [
      { sku: "VLY-HW-101", name: "High-Tensile Structural I-Beams (Grade A)", qty: 12, picked: true, location: "BAY-A-01" }
    ]
  }
];

const initialMovements = [
  { id: "MV-7740", timestamp: "2026-09-24 10:30", type: "Received", sku: "VLY-PKG-305", qtyChange: "+150", prevStock: 170, newStock: 320, user: "A. Canlas", reference: "BOL-VLY-4902" },
  { id: "MV-7739", timestamp: "2026-09-24 09:10", type: "Released", sku: "VLY-HW-101", qtyChange: "-12", prevStock: 36, newStock: 24, user: "D. Gonzales", reference: "VLY-ORD-8980" },
  { id: "MV-7738", timestamp: "2026-09-23 15:40", type: "Adjusted", sku: "VLY-HW-115", qtyChange: "-2", prevStock: 2, newStock: 0, user: "L. Gatdula", reference: "Safety Defect Scrap" },
  { id: "MV-7737", timestamp: "2026-09-23 11:20", type: "Transferred", sku: "VLY-EQ-204", qtyChange: "0", prevStock: 3, newStock: 3, user: "R. Pantaleon", reference: "Relocated BAY-B-01 -> BAY-E-02" }
];

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        sku VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        location VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        supplier VARCHAR(255) NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        order_id VARCHAR(50) PRIMARY KEY,
        customer VARCHAR(255) NOT NULL,
        destination VARCHAR(100) NOT NULL,
        order_date VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        items JSONB NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS movements (
        id VARCHAR(50) PRIMARY KEY,
        timestamp VARCHAR(50) NOT NULL,
        movement_type VARCHAR(50) NOT NULL,
        sku VARCHAR(50) NOT NULL,
        qty_change VARCHAR(20) NOT NULL,
        prev_stock INT NOT NULL,
        new_stock INT NOT NULL,
        responsible_operator VARCHAR(100) NOT NULL,
        reference_docket VARCHAR(255) NOT NULL
      );
    `);

    // Auto-seed Inventory if empty
    const invCount = await pool.query('SELECT COUNT(*) FROM inventory');
    if (parseInt(invCount.rows[0].count, 10) === 0) {
      for (const item of initialInventory) {
        await pool.query(
          'INSERT INTO inventory (sku, name, category, quantity, location, status, supplier) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [item.sku, item.name, item.category, item.quantity, item.location, item.status, item.supplier]
        );
      }
      console.log('✓ Seeded default inventory into PostgreSQL.');
    }

    // Auto-seed Orders if empty
    const ordCount = await pool.query('SELECT COUNT(*) FROM orders');
    if (parseInt(ordCount.rows[0].count, 10) === 0) {
      for (const ord of initialOrders) {
        await pool.query(
          'INSERT INTO orders (order_id, customer, destination, order_date, status, items) VALUES ($1, $2, $3, $4, $5, $6)',
          [ord.orderId, ord.customer, ord.destination, ord.date, ord.status, JSON.stringify(ord.items)]
        );
      }
      console.log('✓ Seeded default orders into PostgreSQL.');
    }

    // Auto-seed Movements if empty
    const movCount = await pool.query('SELECT COUNT(*) FROM movements');
    if (parseInt(movCount.rows[0].count, 10) === 0) {
      for (const mov of initialMovements) {
        await pool.query(
          'INSERT INTO movements (id, timestamp, movement_type, sku, qty_change, prev_stock, new_stock, responsible_operator, reference_docket) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [mov.id, mov.timestamp, mov.type, mov.sku, mov.qtyChange, mov.prevStock, mov.newStock, mov.user, mov.reference]
        );
      }
      console.log('✓ Seeded default movements into PostgreSQL.');
    }

    console.log('✓ PostgreSQL tables verified and ready on Render Singapore cluster.');
  } catch (err) {
    console.error('Database initialization warning (Running with fallback capability):', err.message);
  }
}

module.exports = { pool, initDB };
