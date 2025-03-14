const express = require('express');
const router = express.Router();
const pool = require('../config/config'); // Use pool for database connection
const firestoreDb = require('../config/FirebaseConfig').db;

// POST endpoint to create a new trip
router.post('/trips', async (req, res) => {
    console.log('Request Body:', req.body);

    const {
        customerId, driverId, requestDate, currentDate, pickUpLocation, dropOffLocation, statuses,
        customer_rating, customer_feedback, duration_minutes, vehicle_type, distance_traveled,
        cancellation_reason, cancel_by, pickupTime, dropOffTime, pickUpCoordinates, dropOffCoordinates, 
        payment_status
    } = req.body;

    // Ensure required fields are present
    if (!customerId || !driverId || !pickUpCoordinates || !dropOffCoordinates) {
        return res.status(400).json({ error: "Required fields are missing" });
    }

    // Extract latitude and longitude from request body
    const { latitude: pickUpLatitude, longitude: pickUpLongitude } = pickUpCoordinates;
    const { latitude: dropOffLatitude, longitude: dropOffLongitude } = dropOffCoordinates;

    // SQL query for inserting trip data
    const sql = `
    INSERT INTO trips (
        customerId, driverId, requestDate, currentDate, pickUpLocation, dropOffLocation, statuses,
        customer_rating, customer_feedback, duration_minutes_pick_desti, vehicle_type, distance_traveled, 
        cancellation_reason, cancel_by, pickupTime, dropOffTime, pickUpLatitude, pickUpLongitude, 
        dropOffLatitude, dropOffLongitude, payment_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const connection = await pool.getConnection();
        try {
            const [result] = await connection.query(sql, [
                customerId, driverId, requestDate, currentDate, pickUpLocation, dropOffLocation, statuses,
                customer_rating, customer_feedback, duration_minutes, vehicle_type, distance_traveled, 
                cancellation_reason, cancel_by, pickupTime, dropOffTime, pickUpLatitude, pickUpLongitude, 
                dropOffLatitude, dropOffLongitude, payment_status
            ]);

            const tripId = result.insertId;
            console.log("Trip inserted into MySQL with ID:", tripId);

            return res.status(200).json({ message: "Trip data saved successfully", tripId });

        } finally {
            connection.release(); // Always release the connection
        }
    } catch (err) {
        console.error("Database Error:", err);
        return res.status(500).json({ error: "Database error, please try again" });
    }
});
// Endpoint to fetch trips by user_id and status
router.get('/tripHistory/:userId', (req, res) => {
    const userId = req.params.userId;

    // SQL query to fetch trips from the database
    const query = `
      SELECT * FROM trips
      WHERE customerId = ?
    `;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Database Connection Error:', err);
            return res.status(500).send('Error fetching trips');
        }

        connection.query(query, [userId], (err, results) => {
            connection.release(); // Release connection back to the pool

            if (err) {
                console.error('Error fetching trips:', err);
                return res.status(500).send('Error fetching trips');
            }

            res.json(results);  // Return the fetched trips
        });
    });
});

// Endpoint to update real-time location in Firestore
router.post('/trips/update-location', async (req, res) => {
    const { tripId, latitude, longitude, timestamp } = req.body;

    if (!tripId || !latitude || !longitude || !timestamp) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const tripRef = firestoreDb.collection('trips').doc(`${tripId}`);
        
        // Push the new location update to the 'route' array
        await tripRef.update({
            route: firestoreDb.FieldValue.arrayUnion({
                latitude,
                longitude,
                timestamp
            })
        });

        console.log(`Updated trip ${tripId} with new location`);
        res.status(200).json({ message: "Location updated successfully" });
    } catch (error) {
        console.error("Error updating location:", error);
        res.status(500).json({ error: "Error updating location in Firestore" });
    }
});

// Car listing data
router.get('/api/car-listings', (req, res) => {
    const sql = `
        SELECT 
            v.id AS id,
            v.name AS name,
            v.image AS image,
            v.costPerKm AS costPerKm,
            v.status AS status,
            v.description AS description,
            cl.id AS carListingId,
            cl.car_make AS carMake,
            cl.car_model AS carModel,
            cl.car_year AS carYear,
            cl.number_of_seats AS numberOfSeats,
            cl.car_colour AS carColour,
            cl.car_image AS carImage,
            cl.license_plate AS licensePlate,
            cl.class AS class,
            u_cl.id AS driverId,
            u_cl.name AS driverName,
            u_cl.email AS driverEmail,
            u_cl.phoneNumber AS driverPhoneNumber,
            u_cl.address AS driverAddress,
            u_cl.lastName AS userLastName,
            u_cl.current_address AS driverCurrentAddress,
            d.id AS userId,
            d.photo AS driverPhoto,
            d.id_copy AS driverIdCopy,
            d.gender AS driverGender,
            d.police_clearance AS driverPoliceClearance,
            d.pdp AS driverPdp,
            d.status AS driverStatus,
            d.state AS driverState,
            COALESCE(AVG(t.driver_ratings), 0) AS driverRating  -- Calculate average driver rating
        FROM vehicle v
        JOIN car_listing cl ON v.id = cl.class
        JOIN users u_cl ON cl.userId = u_cl.id
        JOIN driver d ON cl.userId = d.users_id
        LEFT JOIN trip t ON d.id = t.driverId  -- Join with trip table
        WHERE d.state = 'online' AND d.status = 'approved'
        GROUP BY v.id, cl.id, u_cl.id, d.id;
    `;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Database Connection Error:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        connection.query(sql, (err, results) => {
            connection.release(); // Release connection back to the pool

            if (err) {
                console.error('Error fetching car listings:', err);
                return res.status(500).json({ message: 'Internal server error' });
            }

            res.json(results);
        });
    });
});
// Endpoint to fetch trips for a specific driver
router.get('/driverTrips/:driverId', (req, res) => {
    const driverId = req.params.driverId;

    // SQL query to fetch pending trips from the trips table
    const query = `
        SELECT * FROM trips
        WHERE driverId = ? AND status = 'pending'
        LIMIT 10; -- Optionally limit the number of trips for performance
    `;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Database Connection Error:', err);
            return res.status(500).send({ message: 'Error fetching trips' });
        }

        // Set a timeout for the query to avoid hanging
        connection.query({ sql: query, timeout: 10000 }, [driverId], (err, results) => {
            connection.release();

            if (err) {
                console.error('Error with query:', err);
                return res.status(500).send({ message: 'Error with database query', error: err });
            }

            // Check if no trips are found
            if (results.length === 0) {
                return res.status(404).send({ message: 'No pending trips found' });
            }

            // Send the list of pending trips as the response
            res.json(results);
        });
    });
});

// Update trip status when a driver accepts or declines
router.put('/trips/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, cancellation_reason, cancel_by } = req.body;
  
    // Ensure only valid statuses are accepted
    const validStatuses = ['pending', 'completed', 'cancelled', 'accepted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }
  
    // Prepare SQL query to update trip status and other details
    const sql = `
      UPDATE trips 
      SET statuses = ?, cancellation_reason = ?, cancel_by = ? 
      WHERE id = ?
    `;
  
    db.query(sql, [status, cancellation_reason, cancel_by, id], (err, result) => {
      if (err) {
        console.error("Error updating trip status:", err);
        return res.status(500).json({ error: "Error updating trip status" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Trip not found" });
      }
  
      // Emit event to notify users about the status change
      const io = req.app.get('io');
      io.emit('tripStatusUpdated', { tripId: id, status });
  
      res.status(200).json({ message: `Trip status updated to ${status}`, tripId: id });
    });
  });
  
module.exports = router;
