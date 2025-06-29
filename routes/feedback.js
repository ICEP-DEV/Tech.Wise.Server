const express = require('express');
const router = express.Router();
const pool = require('../config/config'); // Use pool for database connection

// routes/feedback.js
router.get('/feedback/recent-with-user', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        f.id, f.userId, f.content, f.rating, f.role, f.createdAt,
        u.name, u.email
      FROM feedback f
      LEFT JOIN users u ON f.userId = u.id
      ORDER BY f.createdAt DESC
      LIMIT 10
    `);
    res.json(rows); // array of recent feedback with user details
  } catch (error) {
    console.error("❌ Error fetching recent feedback:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
module.exports = router;
