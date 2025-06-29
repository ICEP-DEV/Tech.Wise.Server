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
