const express = require('express');
const router = express.Router();
const pool = require('../config/config'); // Use pool for database connection
const firestoreDb = require('../config/FirebaseConfig').db;

// POST endpoint to insert a new trip (based on the /recipient endpoint structure)
router.post('/trips', async (req, res) => {
    console.log('Request Body:', req.body); // Log the incoming request body

    const {
        customerId, driverId, requestDate, currentDate, pickUpLocation, dropOffLocation, statuses,
        rating, feedback, duration_minutes, vehicle_type, distance_traveled, cancellation_reason,
        cancel_by, pickupTime, dropOffTime, pickUpCoordinates, dropOffCoordinates
    } = req.body;

    // Check for required fields
    if (!customerId || !driverId || !requestDate || !currentDate || !pickUpLocation || !dropOffLocation || !vehicle_type || !distance_traveled) {
        return res.status(400).json({ error: "Required fields are missing" });
    }

    // Prepare SQL query to insert trip data into MySQL
    const sql = `
        INSERT INTO trip (
            customerId, driverId, requestDate, currentDate, pickUpLocation, dropOffLocation, statuses,
            customer_rating, customer_feedback, duration_minutes, vehicle_type, distance_traveled, cancellation_reason,
            cancel_by, pickupTime, dropOffTime, pickUpLatitude, pickUpLongitude, dropOffLatitude, dropOffLongitude
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Coordinates as DOUBLE values for MySQL
    const pickUpLatitude = pickUpCoordinates.latitude;
    const pickUpLongitude = pickUpCoordinates.longitude;
    const dropOffLatitude = dropOffCoordinates.latitude;
    const dropOffLongitude = dropOffCoordinates.longitude;

    try {
        const startTime = Date.now(); // Log start time
        const [result] = await pool.query(sql, [
            customerId, driverId, requestDate, currentDate, pickUpLocation, dropOffLocation, statuses,
            rating, feedback, duration_minutes, vehicle_type, distance_traveled, cancellation_reason,
            cancel_by, pickupTime, dropOffTime, pickUpLatitude, pickUpLongitude, dropOffLatitude, dropOffLongitude
        ]);
        console.log(`Query executed in ${Date.now() - startTime} ms`);

        const tripId = result.insertId; // Get the inserted trip ID
        if (!tripId) {
            console.error("Trip ID not generated after insertion");
            return res.status(500).json({ error: "Failed to generate trip ID after insertion" });
        }

        // Emit an event to notify drivers/customers
        const io = req.app.get('io');
        io.emit('newTrip', { tripId, customerId, driverId, pickUpLocation, dropOffLocation });

        return res.status(200).json({ message: "Trip data saved successfully", tripId: tripId });
    } catch (error) {
        console.error("Error saving trip data:", error);
        return res.status(500).json({ error: "An error occurred while saving trip data" });
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
router.get('/api/car-listings', async (req, res) => {
    try {
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
                COALESCE(AVG(t.driver_ratings), 0) AS driverRating  
            FROM vehicle v
            JOIN car_listing cl ON v.id = cl.class
            JOIN users u_cl ON cl.userId = u_cl.id
            JOIN driver d ON cl.userId = d.users_id
            LEFT JOIN trip t ON d.id = t.driverId  
            WHERE d.state = 'online' AND d.status = 'approved'
            GROUP BY v.id, cl.id, u_cl.id, d.id;
        `;

        const [results] = await pool.query(sql);
        res.json(results);
    } catch (error) {
        console.error('Error fetching car listings:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// Endpoint to fetch trips for a specific driver
router.get('/driverTrips', async (req, res) => {
    const { driverId } = req.query; // Use query parameters instead of route params

    console.log('Fetching trips for driverId:', driverId);

    // Validate driverId
    if (!driverId) {
        return res.status(400).json({ message: 'Driver ID is required' });
    }

    const sql = `
      SELECT * FROM trips 
      WHERE driverId = ? AND status = 'pending'
    `;

    try {
        const startTime = Date.now(); // Log query start time
        const [rows] = await pool.query(sql, [driverId]); 
        console.log(`Query executed in ${Date.now() - startTime} ms`);

        if (rows.length > 0) {
            res.json({ trips: rows }); // Return trips as an array
        } else {
            res.status(404).json({ message: 'No pending trips found' });
        }
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
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
