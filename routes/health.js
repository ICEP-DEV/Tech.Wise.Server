const express = require('express');
const pool = require('../config'); // Import MySQL connection pool
const router = express.Router();

router.get('/health', async (req, res) => {
    try {
        // Run a simple query to check if the database is reachable
        const [rows] = await pool.query('SELECT 1');
        res.json({ status: '✅ Database Connected', result: rows });
    } catch (error) {
        console.error('❌ Database Health Check Failed:', error);
        res.status(500).json({ status: '❌ Database Connection Error', error: error.message });
    }
});

module.exports = router;
