const express = require('express');
const router = express.Router();
const pool = require('../config/config'); // Use pool for database connection

// routes/feedback.js
// Submit customer rating and feedback
router.post('/ride/rating', async (req, res) => {
  const { tripId, userId, rating, feedback = '', role } = req.body;

  try {
    // 1. Update customer_rating in the trips table
    await pool.query(
      `UPDATE trips SET customer_rating = ? WHERE id = ?`,
      [rating, tripId]
    );

    // 2. Insert feedback record (content can be empty or null)
    await pool.query(
      `INSERT INTO feedback (userId, content, rating, role, createdAt)
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, feedback || null, rating, role]
    );

    res.status(200).json({ message: 'Rating and feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting rating and feedback:', error);
    res.status(500).json({ error: 'Failed to submit rating and feedback' });
  }
});
module.exports = router;
