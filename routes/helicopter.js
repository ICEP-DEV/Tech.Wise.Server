const express = require('express');
const router = express.Router();
const pool = require('../config/config');
const bodyParser = require('body-parser');
const cors = require('cors');

// POST endpoint to receive helicopter quote request
router.post("/api/quote", (req, res) => {
    const {
      flightDate,
      numberOfPassengers,
      passengerWeights,
      luggageWeight,
      departurePoint,
      destination,
      isReturnFlight,
      waitingTime
    } = req.body;
  
    if (!flightDate || !numberOfPassengers || !departurePoint || !destination) {
      return res.status(400).json({ error: "Required fields are missing" });
    }
  
    const query = `
      INSERT INTO helicopter_quotes
      (flightDate, numberOfPassengers, passengerWeights, luggageWeight, departurePoint, destination, isReturnFlight, waitingTime)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
  
    pool.query(
      query,
      [
        flightDate,
        numberOfPassengers,
        passengerWeights || null,
        luggageWeight || null,
        departurePoint,
        destination,
        isReturnFlight || null,
        waitingTime || null
      ],
      (err, results) => {
        if (err) {
          console.error("Insert error:", err);
          return res.status(500).json({ error: "Database error" });
        }
  
        res.status(200).json({ message: "Quote submitted successfully", id: results.insertId });
      }
    );
  });

  module.exports = router;
  