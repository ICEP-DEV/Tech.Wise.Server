const express = require('express');
const router = express.Router();
const pool = require('../config/config'); // Use pool for database connection

// Endpoint to count approved drivers
router.get('/approved_drivers', async (req, res) => {
  const query = `SELECT COUNT(*) AS count FROM driver WHERE status = 'approved'`;

  try {
    const startTime = Date.now();
    const [rows] = await pool.query(query);
    console.log(`✅ Count of approved drivers fetched in ${Date.now() - startTime} ms`);

    res.json({ count: rows[0].count });
  } catch (error) {
    console.error('❌ Error counting approved drivers:', error);
    res.status(500).json({ message: 'Internal server error while counting approved drivers' });
  }
});

// Endpoint to count customers
router.get('/count_customers', async (req, res) => {
  const query = `SELECT COUNT(*) AS count FROM users WHERE role = 'customer'`;

  try {
    const [rows] = await pool.query(query);
    res.json({ count: rows[0].count });
  } catch (error) {
    console.error('Error counting customers:', error);
    res.status(500).json({ message: 'Internal server error while counting customers' });
  }
});

// Endpoint to count drivers
router.get('/count_drivers', async (req, res) => {
  const query = `SELECT COUNT(*) AS count FROM users WHERE role = 'driver'`;

  try {
    const [rows] = await pool.query(query);
    res.json({ count: rows[0].count });
  } catch (error) {
    console.error('Error counting drivers:', error);
    res.status(500).json({ message: 'Internal server error while counting drivers' });
  }
});

// Endpoint to count all trips
router.get('/count_trips', async (req, res) => {
  const query = `SELECT COUNT(*) AS count FROM trips`;

  try {
    const [rows] = await pool.query(query);
    res.json({ count: rows[0].count });
  } catch (error) {
    console.error('❌ Error fetching trip count:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = router;
