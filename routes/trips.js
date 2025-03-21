const express = require('express');
const router = express.Router();
const pool = require('../config/config'); // Use pool for database connection
const firestoreDb = require('../config/FirebaseConfig').db;

// POST endpoint to create a new trip
router.post('/trips', async (req, res) => {
    console.log('Request Body:', req.body);

    const {
        customerId,
        driverId,
        requestDate,
        currentDate,
        pickUpLocation,
        dropOffLocation,
        statuses,
        customer_rating,
        customer_feedback,
        duration_minutes,
        vehicle_type,
        distance_traveled,
        cancellation_reason,
        cancel_by,
        pickupTime,
        dropOffTime,
        pickUpCoordinates,
        dropOffCoordinates,
        payment_status
    } = req.body.tripData;

    console.log('Extracted Data:', {
        customerId,
        driverId,
        requestDate,
        currentDate,
        pickUpLocation,
        dropOffLocation,
        statuses,
        customer_rating,
        customer_feedback,
        duration_minutes,
        vehicle_type,
        distance_traveled,
        cancellation_reason,
        cancel_by,
        pickupTime,
        dropOffTime,
        pickUpCoordinates,
        dropOffCoordinates,
        payment_status
    });

    // Ensure required fields are present
    if (!customerId || !driverId || !pickUpCoordinates || !dropOffCoordinates) {
        return res.status(400).json({ error: "Required fields are missing" });
    }

    const { latitude: pickUpLatitude, longitude: pickUpLongitude } = pickUpCoordinates || {};
    const { latitude: dropOffLatitude, longitude: dropOffLongitude } = dropOffCoordinates || {};

    if (!pickUpLatitude || !pickUpLongitude || !dropOffLatitude || !dropOffLongitude) {
        return res.status(400).json({ error: "Pickup or drop-off coordinates are missing" });
    }

    // SQL query for inserting trip data with payment_status = 'pending'
    const sql = `
        INSERT INTO trips (
            customerId, driverId, requestDate, currentDate, pickUpLocation, dropOffLocation, statuses,
            customer_rating, customer_feedback, duration_minutes, vehicle_type, distance_traveled, 
            cancellation_reason, cancel_by, pickupTime, dropOffTime, pickUpLatitude, pickUpLongitude, 
            dropOffLatitude, dropOffLongitude, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        // Get a connection from the pool
        const connection = await pool.getConnection();

        // Execute the query
        const [result] = await connection.execute(sql, [
            customerId, driverId, requestDate, currentDate, pickUpLocation, dropOffLocation, statuses,
            customer_rating, customer_feedback, duration_minutes, vehicle_type, distance_traveled,
            cancellation_reason, cancel_by, pickupTime, dropOffTime,
            pickUpLatitude, pickUpLongitude, // Insert latitudes and longitudes as DOUBLE values
            dropOffLatitude, dropOffLongitude,
            payment_status
        ]);

        connection.release(); // Release the connection back to the pool

        const tripId = result.insertId; // Get the inserted trip ID
        console.log("Trip inserted into MySQL with ID:", tripId);

        // Step 2: Respond back with success message and tripId
        return res.status(200).json({ message: "Trip data saved successfully", tripId: tripId });
    } catch (err) {
        console.error("Error saving trip data:", err);
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
                u_cl.profile_picture AS driverPhoto,
                u_cl.gender AS driverGender,
                d.id AS userId,
                d.id_copy AS driverIdCopy,
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

// Endpoint to fetch the latest pending trip for a specific driver
router.get('/driverTrips', async (req, res) => {
    const { driverId } = req.query; // Use query parameters instead of route params

    console.log('Fetching trips for driverId:', driverId);

    // Validate driverId
    if (!driverId) {
        return res.status(400).json({ message: 'Driver ID is required' });
    }

    const sql = `
      SELECT * FROM trips 
      WHERE driverId = ? AND statuses = 'pending'
      ORDER BY currentDate DESC LIMIT 1
    `;

    try {
        const startTime = Date.now(); // Log query start time
        const [rows] = await pool.query(sql, [driverId]);
        console.log(`Query executed in ${Date.now() - startTime} ms`);

        if (rows.length > 0) {
            res.json({ trips: rows }); // Return the latest trip as an array
        } else {
            res.status(404).json({ message: 'No pending trips found' });
        }
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// Endpoint to update the trip status
router.put('/trips/:tripId/status', async (req, res) => {
    const { tripId } = req.params;
    const { status, cancellation_reason, cancel_by, distance_traveled } = req.body;
    // Before updating, check if the trip exists
    const [tripExists] = await pool.query('SELECT * FROM trips WHERE id = ?', [tripId]);

    if (!tripExists.length) {
        return res.status(404).json({ message: 'Trip not found' });
    }

    // Proceed with updating if the trip exists

    console.log('Request Bodyrrrrrrrrrrrrrrrrrrrrr:', req.body, tripId);
    if (!status) {
        return res.status(400).json({ message: 'Status is required' });
    }

    try {
        let sql;
        const params = [status, tripId];

        if (status === 'started') {
            sql = `
                UPDATE trips
                SET statuses = ?, pickupTime = NOW()
                WHERE id = ?
            `;
        } else if (status === 'ended') {
            sql = `
                UPDATE trips
                SET statuses = ?, dropOffTime = NOW(), 
                    duration_minutes = TIMESTAMPDIFF(MINUTE, pickupTime, NOW()), 
                    distance_traveled = ? 
                WHERE id = ?
            `;
            params.push(distance_traveled);
        } else if (status === 'canceled') {
            sql = `
                UPDATE trips
                SET statuses = ?, cancellation_reason = ?, cancel_by = ? 
                WHERE id = ${tripId}
            `;
            params.push(cancellation_reason, cancel_by, tripId); // Correct order
        }
        
        else if (status === 'accepted') {
            // If trip is accepted, update status to 'accepted'
            sql = `
                UPDATE trips
                SET statuses = ?
                WHERE id = ?
            `;
        } else if (status === 'declined') {
            // If trip is declined, update status to 'declined'
            sql = `
                UPDATE trips
                SET statuses = ?, cancellation_reason = ?, cancel_by = ? 
                WHERE id = ?
            `;
            params.push(cancellation_reason, cancel_by);
        } else {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const [result] = await pool.query(sql, params);

        if (result.affectedRows > 0) {
            res.json({ message: 'Trip status updated successfully' });
        } else {
            res.status(404).json({ message: 'Trip not found' });
        }
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Endpoint to fetch the latest trip status for a specific user
router.get('/trips/statuses/:userId', async (req, res) => {
    const { user_id } = req.params;

    if (!user_id) {
        return res.status(400).json({ error: "User ID is required" });
    }

    const sql = `
        SELECT id, statuses, currentDate
        FROM trips
        WHERE customerId = ?
        ORDER BY currentDate DESC
        LIMIT 1
    `;

    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.execute(sql, [user_id, user_id]);
        connection.release();

        if (rows.length === 0) {
            return res.status(404).json({ message: "No trips found for this user" });
        }

        return res.status(200).json({ latestTrip: rows[0] });
    } catch (err) {
        console.error("Error fetching latest trip status:", err);
        return res.status(500).json({ error: "An error occurred while retrieving the latest trip status" });
    }
});





module.exports = router;
