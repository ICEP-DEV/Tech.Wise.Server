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

// Updated Endpoint to fetch all trips by status and driverId
router.get('/allTrips', async (req, res) => {
    const status = req.query.status;
    const driverId = req.query.driverId;

    let query = `SELECT * FROM trips`;
    const queryParams = [];

    // Build WHERE clause
    if (status && driverId) {
        query += ` WHERE statuses = ? AND driverId = ?`;
        queryParams.push(status, driverId);
    } else if (status) {
        query += ` WHERE statuses = ?`;
        queryParams.push(status);
    } else if (driverId) {
        query += ` WHERE driverId = ?`;
        queryParams.push(driverId);
    }

    try {
        const [rows] = await pool.query(query, queryParams);
        console.log("Fetched Trips with Filters");
        res.json(rows);
    } catch (error) {
        console.error('Error fetching trips:', error);
        res.status(500).send('Error fetching trips');
    }
});

// Endpoint to fetch trips by custoer or driver id and status
router.get('/tripHistory/:userId', async (req, res) => {
    const userId = req.params.userId;
    const status = req.query.status;

    let query = `
    SELECT * FROM trips
    WHERE (customerId = ? OR driverId = ?)
  `;
    const queryParams = [userId, userId];

    if (status) {
        query += ` AND statuses = ?`;
        queryParams.push(status);
    }

    try {
        const [rows] = await pool.query(query, queryParams);

        console.log("Fetched Trips for userId:", userId);
        console.log("Status filter:", status);
        console.log("Results:", rows);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching trips:', error);
        res.status(500).send('Error fetching trips');
    }
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

    // console.log('Fetching trips for driverId:', driverId);

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

    console.log('Request Body:', req.body);
    console.log('Request Params:', req.params);

    try {
        // Check if the trip exists before updating
        const [tripExists] = await pool.query('SELECT * FROM trips WHERE id = ?', [tripId]);
        console.log('tripExists:', tripExists);

        if (!tripExists.length) {
            return res.status(404).json({ message: 'Trip not found' });
        }

        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }

        let sql;
        let params = [status, tripId]; // Default params for status update

        if (status === 'on-going') {
            sql = `UPDATE trips SET statuses = ?, pickupTime = NOW() WHERE id = ?`;

        } else if (status === 'completed') {
            sql = `
                UPDATE trips
                SET statuses = ?, dropOffTime = NOW(), 
                    duration_minutes = TIMESTAMPDIFF(MINUTE, pickupTime, NOW()), 
                    distance_traveled = ? 
                WHERE id = ?
            `;
            params = [status, distance_traveled, tripId]; // Correct order of parameters

        } else if (status === 'canceled') {
            sql = `UPDATE trips SET statuses = ?, cancellation_reason = ?, cancel_by = ? WHERE id = ?`;
            params = [status, cancellation_reason, cancel_by, tripId];

        } else if (status === 'accepted') {
            sql = `UPDATE trips SET statuses = ? WHERE id = ?`;

        } else if (status === 'declined') {
            sql = `UPDATE trips SET statuses = ?, cancellation_reason = ?, cancel_by = ? WHERE id = ?`;
            params = [status, cancellation_reason, cancel_by, tripId];

        } else {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Execute the query
        const [result] = await pool.query(sql, params);

        if (result.affectedRows > 0) {
            res.json({ message: 'Trip status updated successfully' });
        } else {
            res.status(404).json({ message: 'Trip not found or status unchanged' });
        }
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// Endpoint to fetch the latest trip status for a specific user
router.get('/trips/statuses/:user_id', async (req, res) => {
    // console.log('Fetching latest trip status for user:', req.params);
    const { user_id } = req.params;

    if (!user_id) {
        return res.status(400).json({ error: "User ID is required" });
    }

    const sql = `
        SELECT id, statuses, currentDate
        FROM trips
        WHERE customerId = ? OR driverId = ?
        ORDER BY currentDate DESC
        LIMIT 1
    `;

    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.execute(sql, [user_id, user_id]); // Fixed: Pass only one parameter
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

//Endpoint to store messages
router.post("/messages", async (req, res) => {
    const { senderId, receiverId, messages, tripId } = req.body;

    // Log the request body for debugging
    console.log("Request Body:", req.body);

    // Check for required fields
    if (!senderId || !receiverId || !messages || !tripId) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if 'messages' is an array and contains at least one message
    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ message: "Messages should be an array and contain at least one message" });
    }

    try {
        // Convert the messages array into a JSON string
        const conversationString = JSON.stringify(messages);

        // Insert the conversation into the database
        const sql = `INSERT INTO messages (sender_id, receiver_id, message, timestamp, trip_id) VALUES (?, ?, ?, NOW(), ?)`;
        await pool.query(sql, [senderId, receiverId, conversationString, tripId]);

        res.status(201).json({ message: "Conversation stored successfully" });
    } catch (error) {
        console.error("Error saving messages:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Put method to update driver state
router.put('/updateDriverState', async (req, res) => {
    const { user_id, state } = req.body;

    if (!user_id || !state) {
        return res.status(400).json({ message: 'User ID and state are required' });
    }

    try {
        // 1. Get current driver state
        const [driverRows] = await pool.query(
            'SELECT state, online_time, last_online_timestamp FROM driver WHERE users_id = ?',
            [user_id]
        );

        if (driverRows.length === 0) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        const { state: currentState, online_time, last_online_timestamp } = driverRows[0];

        // 2. Prevent redundant state changes
        if (currentState === state) {
            return res.status(200).json({ message: 'Already in requested state' });
        }

        let sessionSeconds = 0; // Default value for sessionSeconds

        // 3. Handle state transition
        if (state === 'online') {
            if (online_time >= 43200) {
                return res.status(403).json({ message: '12-hour daily limit reached' });
            }

            // Update only the timestamp
            const [updateResult] = await pool.query(
                'UPDATE driver SET state = ?, last_online_timestamp = NOW() WHERE users_id = ?',
                [state, user_id]
            );
            console.log('Update Result:', updateResult);
        }
        else if (state === 'offline') {
            if (last_online_timestamp) {
                sessionSeconds = Math.floor(
                    (Date.now() - new Date(last_online_timestamp).getTime()) / 1000
                );
                console.log('Last Online:', last_online_timestamp);
                console.log('Session Duration (seconds):', sessionSeconds);
            }

            // Update online_time and log session
            await pool.query(
                'UPDATE driver SET state = ?, online_time = online_time + ? WHERE users_id = ?',
                [state, sessionSeconds, user_id]
            );

            await pool.query(
                'INSERT INTO driver_log (users_id, session_time) VALUES (?, ?)',
                [user_id, sessionSeconds]
            );
        }

        return res.status(200).json({
            message: 'Status updated',
            newState: state,
            online_time: state === 'offline' ? online_time + sessionSeconds : online_time
        });

    } catch (error) {
        console.error('Error details:', error.message);
        console.error('Error stack trace:', error.stack);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});


// new==========
// Update driver state with check
router.put('/driver/updateStatus', async (req, res) => {
    const { userId, state } = req.body;

    if (!userId || !state) {
        return res.status(400).json({ message: 'Required fields are missing' });
    }

    try {
        // Check current state first
        const [rows] = await pool.query(`SELECT state FROM driver WHERE users_id = ?`, [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        const currentState = rows[0].state;

        if (currentState === 'online') {
            console.log('Driver is already online');
            return res.status(200).json({ message: 'Already online', alreadyOnline: true });
        }

        // If not online, update the state
        const [result] = await pool.query(
            `UPDATE driver SET state = ? WHERE users_id = ?`,
            [state, userId]
        );

        if (result.affectedRows > 0) {
            console.log('Driver state updated to online');
            return res.status(200).json({ message: 'Driver state updated to online', alreadyOnline: false });
        } else {
            return res.status(404).json({ message: 'Driver not found' });
        }
    } catch (error) {
        console.error('Error updating driver state:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
// Endpoint to start a driver session
router.post('/driver/startSession', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
    }

    try {
        // Insert with current date for created_at, start_time is still set manually
        const [rows] = await pool.query(
            'INSERT INTO driver_sessions (user_id, start_time, created_at) VALUES (?, ?, ?)',
            [userId, new Date(), new Date()] // Setting both start_time and created_at to now
        );

        const session_id = rows.insertId;

        if (!session_id) {
            return res.status(500).json({ error: 'No session_id generated.' });
        }

        res.status(200).json({
            message: 'Session started successfully',
            session_id: session_id
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to start session.' });
    }
});


// Endpoint to fetch total_seconds by user_id for today (sum of all sessions)
router.get('/driver/totalWorkedToday/:user_id', async (req, res) => {
    const { user_id } = req.params;

    if (!user_id) {
        return res.status(400).json({ error: 'User ID is required.' });
    }

    try {
        const [rows] = await pool.query(
            `SELECT COALESCE(SUM(total_seconds), 0) AS totalSeconds
             FROM driver_sessions
             WHERE user_id = ? AND DATE(start_time) = CURDATE()`,
            [user_id]
        );

        const totalSeconds = rows.length > 0 ? rows[0].totalSeconds : 0;

        res.status(200).json({
            totalSeconds
        });

    } catch (err) {
        console.error('Error fetching total_seconds for user today:', err);
        res.status(500).json({ error: 'Failed to fetch total_seconds.' });
    }
});

// Endpoint to fetch remaining time for a driver today
router.get('/driver/remainingTime/:userId', async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
    }

    try {
        const [rows] = await pool.query(
            SELECT COALESCE(SUM(total_seconds), 0) AS totalWorkedToday
             FROM driver_sessions
             WHERE user_id = ? AND DATE(start_time) = CURDATE(),
            [userId]
        );

        const totalWorkedToday = rows.length > 0 ? rows[0].totalWorkedToday : 0;
        const remainingSeconds = 43200 - totalWorkedToday; // 12 hours in seconds

        res.status(200).json({
            remainingSeconds: remainingSeconds < 0 ? 0 : remainingSeconds
        });

    } catch (err) {
        console.error('Error fetching remaining time:', err);
        res.status(500).json({ error: 'Failed to fetch remaining time.' });
    }
});
// Endpoint to end a driver sessions
router.put('/endDriverSession', async (req, res) => {
    const { session_id, end_time } = req.body;
    try {
        const [result] = await pool.query(
            `UPDATE driver_sessions
             SET end_time = ?,
                 total_seconds = TIMESTAMPDIFF(SECOND, start_time, ?)
             WHERE id = ? AND end_time IS NULL`,
            [end_time, end_time, session_id]
        );
        res.json({ message: "end_time updated", affectedRows: result.affectedRows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update driver session." });
    }
});


// Get driver state and online_time
router.get('/getDriverState', async (req, res) => {
    const userId = req.query.userId;
    console.log('Fetching driver state for userId:', userId);

    if (!userId || userId.trim() === '') {
        return res.status(400).json({ message: 'User ID is required and cannot be empty' });
    }

    const timeout = setTimeout(() => {
        console.log('Request to get driver state timed out');
        return res.status(504).send('Gateway Timeout');
    }, 15000); // 15 seconds

    try {
        const query = 'SELECT state, online_time FROM driver WHERE users_id = ?';
        const [result] = await pool.query(query, [userId]);

        clearTimeout(timeout);

        if (result.length === 0) {
            console.log(`Driver with userId ${userId} not found.`);
            return res.status(404).json({ message: 'Driver not found' });
        }

        const { state, online_time } = result[0];
        return res.json({ state, online_time });
    } catch (err) {
        clearTimeout(timeout);
        console.error(`Error fetching driver state for userId ${userId}:`, err);
        return res.status(500).json({ message: 'Failed to fetch driver state', error: err.message });
    }
});



// Route to get Driver Trips based on status
router.get('/getDriverTrips', async (req, res) => {
    const userId = req.query.userId;
    console.log('Fetching driver trips for userId:', userId);

    // Validation check for userId
    if (!userId || userId.trim() === '') {
        return res.status(400).json({ message: 'User ID is required and cannot be empty' });
    }

    // Set a timeout for the query to avoid hanging requests
    const timeout = setTimeout(() => {
        console.log('Request to get driver trips timed out');
        return res.status(504).send('Gateway Timeout');
    }, 15000); // 15 seconds

    try {
        // Query to fetch trips based on status
        const query = 'SELECT * FROM trips WHERE statuses IN (?, ?) AND driverId = ?';
        const [result] = await pool.query(query, ['accepted', 'declined', userId]);

        clearTimeout(timeout); // Clear timeout if the query is successful

        // Check if trips are found
        if (result.length === 0) {
            console.log(`No trips found for driver with userId ${userId}`);
            return res.status(404).json({ message: 'No trips found for this driver' });
        }

        // Calculate average driver rating
        const ratings = result.map(trip => trip.driver_ratings);
        const averageRating = ratings.reduce((sum, rating) => sum + parseFloat(rating), 0) / ratings.length;
        const formattedRating = averageRating.toFixed(1); // Format to 1 decimal place

        // Return the trips with the formatted driver rating
        return res.json({
            trips: result,
            ratings: `${formattedRating}/5`
        });
    } catch (err) {
        clearTimeout(timeout); // Clear timeout on error
        console.error(`Error fetching trips for driver with userId ${userId}:`, err);
        return res.status(500).json({ message: 'Failed to fetch trips', error: err.message });
    }
});

// GET trips and payments stats for driver by driverId and user_id
router.get('/driver/stats/:user_id', async (req, res) => {
    const { user_id } = req.params;

    try {
        const [rows] = await pool.query(`
            SELECT 
                t.id AS tripId,
                t.statuses,
                t.driver_ratings,
                t.requestDate,
                p.amount,
                p.payment_status
            FROM trips t
            LEFT JOIN payment p ON t.id = p.tripId
            WHERE t.driverId = ?
        `, [user_id]);

        res.json(rows);
    } catch (err) {
        console.error('Error fetching driver stats:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});


//endpoint to fetch all trips






module.exports = router;
