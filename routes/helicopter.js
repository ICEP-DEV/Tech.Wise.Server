const express = require('express');
const router = express.Router();
const pool = require('../config/config');

// CREATE a new helicopter quote
router.post('/helicopter_quotes', async (req, res) => {
    const {
        user_id,
        flightDate,
        numberOfPassengers,
        passengerWeights,
        luggageWeight,
        departurePoint,
        destination,
        isReturnFlight,
        waitingTime
    } = req.body;

    if (!user_id || !flightDate || !numberOfPassengers || !departurePoint || !destination) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    const sql = `INSERT INTO helicopter_quotes (user_id, flightDate, numberOfPassengers, passengerWeights, luggageWeight, departurePoint, destination, isReturnFlight, waitingTime)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    try {
        const connection = await pool.getConnection();
        await connection.execute(sql, [
            user_id,
            flightDate,
            numberOfPassengers,
            passengerWeights,
            luggageWeight,
            departurePoint,
            destination,
            isReturnFlight,
            waitingTime
        ]);
        connection.release();

        res.status(201).json({ message: 'Quote request submitted successfully.' });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// READ all quotes for a specific user
router.get('/helicopter_quotes/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const connection = await pool.getConnection();
        const [results] = await connection.execute('SELECT * FROM helicopter_quotes WHERE user_id = ?', [userId]);
        connection.release();

        res.status(200).json(results);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// UPDATE a quote (only by the owner)
router.put('/helicopter_quotes/:quoteId', async (req, res) => {
    const { quoteId } = req.params;
    const {
        user_id,
        flightDate,
        numberOfPassengers,
        passengerWeights,
        luggageWeight,
        departurePoint,
        destination,
        isReturnFlight,
        waitingTime
    } = req.body;

    if (!user_id || !flightDate || !numberOfPassengers || !departurePoint || !destination) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    const sql = `UPDATE helicopter_quotes 
                 SET flightDate = ?, numberOfPassengers = ?, passengerWeights = ?, luggageWeight = ?, departurePoint = ?, destination = ?, isReturnFlight = ?, waitingTime = ?
                 WHERE id = ? AND user_id = ?`;

    try {
        const connection = await pool.getConnection();
        const [result] = await connection.execute(sql, [
            flightDate,
            numberOfPassengers,
            passengerWeights,
            luggageWeight,
            departurePoint,
            destination,
            isReturnFlight,
            waitingTime,
            quoteId,
            user_id
        ]);
        connection.release();

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Quote not found or not authorized.' });
        }

        res.status(200).json({ message: 'Quote updated successfully.' });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// UPDATE the status of a quote (e.g., to "Cancelled") by owner
router.put('/helicopter_quotes/:quoteId', async (req, res) => {
    const { quoteId } = req.params;
    const { user_id, status } = req.body;

    console.log(`Updating quote ${quoteId} for user ${user_id} with status ${status}`);
    // if (!user_id || !status) {

    //     return res.status(400).json({ message: 'Missing user_id or status.', quoteId, user_id, status });
    // }

    try {
        const connection = await pool.getConnection();
        const [result] = await connection.execute(
            'UPDATE helicopter_quotes SET status = ? WHERE id = ? AND user_id = ?',
            [status, quoteId, user_id]
        );
        connection.release();

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Quote not found or not authorized.' });
        }

        res.status(200).json({ message: `Quote status updated to "${status}".` });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});


module.exports = router;
