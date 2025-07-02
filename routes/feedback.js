const express = require('express');
const router = express.Router();
const pool = require('../config/config'); // Use pool for database connection

// Submit rating and feedback
router.post('/ride/rating', async (req, res) => {
  const { tripId, userId, rating, feedback = '', role } = req.body;

  try {
    // 1. Conditionally update the correct rating column in trips table
    if (role === 'customer') {
      await pool.query(
        `UPDATE trips SET driver_ratings = ? WHERE id = ?`,
        [rating, tripId]
      );
    } else if (role === 'driver') {
      await pool.query(
        `UPDATE trips SET customer_rating = ? WHERE id = ?`,
        [rating, tripId]
      );
    } else {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    // 2. Insert feedback into the feedback table
    await pool.query(
      `INSERT INTO feedback (userId, content, rating, role, createdAt)
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, feedback.trim(), rating, role]
    );

    res.status(200).json({ message: 'Rating and feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting rating and feedback:', error);
    res.status(500).json({ error: 'Failed to submit rating and feedback' });
  }
});

module.exports = router;
