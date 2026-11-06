require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool, initDB } = require('./db');
const { HfInference } = require('@huggingface/inference');

const app = express();
const port = process.env.PORT || 3000;

// Built-in Hugging Face Token fallback so zero extra setup is needed
const hfToken = process.env.HF_TOKEN || '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';
const hf = new HfInference(hfToken);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'connected', db: 'PostgreSQL Render Singapore', ai: 'HuggingFace Ready' });
  } catch (err) {
    res.status(500).json({ status: 'offline', error: err.message });
  }
});

// Full State Sync Endpoint
app.get('/api/state', async (req, res) => {
  try {
    const invRes = await pool.query('SELECT * FROM inventory ORDER BY sku ASC');
    const ordRes = await pool.query('SELECT * FROM orders ORDER BY order_date DESC');
    const movRes = await pool.query('SELECT * FROM movements ORDER BY timestamp DESC');

    const orders = ordRes.rows.map(r => ({
      orderId: r.order_id,
      customer: r.customer,
      destination: r.destination,
      date: r.order_date,
      status: r.status,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items
    }));

    const movements = movRes.rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      type: r.movement_type,
      sku: r.sku,
      qtyChange: r.qty_change,
      prevStock: r.prev_stock,
      newStock: r.new_stock,
      user: r.responsible_operator,
      reference: r.reference_docket
    }));

    res.json({
      inventory: invRes.rows,
      orders,
      movements
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upsert Inventory Item
app.post('/api/inventory', async (req, res) => {
  const { sku, name, category, quantity, location, status, supplier } = req.body;
  try {
    const query = `
      INSERT INTO inventory (sku, name, category, quantity, location, status, supplier)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (sku) DO UPDATE 
      SET name = EXCLUDED.name, category = EXCLUDED.category, quantity = EXCLUDED.quantity, 
          location = EXCLUDED.location, status = EXCLUDED.status, supplier = EXCLUDED.supplier
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [sku, name, category, quantity, location, status, supplier]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Inventory Item
app.delete('/api/inventory/:sku', async (req, res) => {
  try {
    await pool.query('DELETE FROM inventory WHERE sku = $1', [req.params.sku]);
    res.json({ deleted: req.params.sku });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Order Status & Items
app.post('/api/orders', async (req, res) => {
  const { orderId, customer, destination, date, status, items } = req.body;
  try {
    const query = `
      INSERT INTO orders (order_id, customer, destination, order_date, status, items)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (order_id) DO UPDATE
      SET status = EXCLUDED.status, items = EXCLUDED.items
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [orderId, customer, destination, date, status, JSON.stringify(items)]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Record Movement Entry
app.post('/api/movements', async (req, res) => {
  const { id, timestamp, type, sku, qtyChange, prevStock, newStock, user, reference } = req.body;
  try {
    const query = `
      INSERT INTO movements (id, timestamp, movement_type, sku, qty_change, prev_stock, new_stock, responsible_operator, reference_docket)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO NOTHING
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [id, timestamp, type, sku, qtyChange, prevStock, newStock, user, reference]);
    res.status(201).json(rows[0] || { status: 'logged' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Hugging Face AI Logistics Copilot Endpoint
app.post('/api/ai-assistant', async (req, res) => {
  const { prompt, context } = req.body;
  try {
    const systemPrompt = `You are the Vanguard Logistics Yard (VLY) AI Copilot. You assist warehouse operators with inventory counts, low-stock alerts, bay coordinates, and order picking.
Current Live Warehouse Snapshot: ${JSON.stringify(context || {})}
Answer concisely, accurately, and professionally in 1 to 3 short sentences.`;

    const response = await hf.chatCompletion({
      model: 'Qwen/Qwen2.5-72B-Instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 160
    });

    res.json({ reply: response.choices[0].message.content });
  } catch (err) {
    // Fallback if 72B model is busy
    try {
      const backup = await hf.chatCompletion({
        model: 'mistralai/Mistral-7B-Instruct-v0.3',
        messages: [
          { role: 'user', content: `Context: ${JSON.stringify(context || {})}. Question: ${prompt}. Reply briefly as a warehouse AI:` }
        ],
        max_tokens: 120
      });
      res.json({ reply: backup.choices[0].message.content });
    } catch (fallbackErr) {
      res.status(500).json({ error: 'AI Service temporarily unreachable.', details: fallbackErr.message });
    }
  }
});

// Root & Fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'vanguard-terminal.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'vanguard-terminal.html'));
});

app.listen(port, async () => {
  await initDB();
  console.log(`VLY Full-Stack Terminal Server running on port ${port}`);
});
