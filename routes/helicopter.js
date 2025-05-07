const express = require('express');
const router = express.Router();
const pool = require('../config/config');
const bodyParser = require('body-parser');
const cors = require('cors');

// POST endpoint to receive helicopter quote request
router.post('/quote', (req, res) => {
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
  
    // ✅ Log incoming request body
    console.log("📥 New Quote Request Received:");
    console.log("flightDate:", flightDate);
    console.log("numberOfPassengers:", numberOfPassengers);
    console.log("passengerWeights:", passengerWeights);
    console.log("luggageWeight:", luggageWeight);
    console.log("departurePoint:", departurePoint);
    console.log("destination:", destination);
    console.log("isReturnFlight:", isReturnFlight);
    console.log("waitingTime:", waitingTime);
  
    // ✅ Validation
    if (!flightDate || !numberOfPassengers || !departurePoint || !destination) {
      console.warn("⚠️ Missing required fields");
      return res.status(400).json({ error: "Required fields are missing" });
    }
  
    const query = `
      INSERT INTO helicopter_quotes
      (flightDate, numberOfPassengers, passengerWeights, luggageWeight, departurePoint, destination, isReturnFlight, waitingTime)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
  
    const queryValues = [
      flightDate,
      numberOfPassengers,
      passengerWeights || null,
      luggageWeight || null,
      departurePoint,
      destination,
      isReturnFlight || null,
      waitingTime || null
    ];
  
    // ✅ Log the query and values
    console.log("📝 Executing Query:", query);
    console.log("📦 With Values:", queryValues);
  
    pool.query(query, queryValues, (err, results) => {
      if (err) {
        console.error("❌ Insert error:", err);
        return res.status(500).json({ error: "Database error" });
      }
  
      console.log("✅ Quote inserted successfully with ID:", results.insertId);
      res.status(200).json({ message: "Quote submitted successfully", id: results.insertId });
    });
  });
  

  module.exports = router;
  