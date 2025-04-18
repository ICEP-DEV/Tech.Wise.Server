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

// Endpoint to fetch trips by user_id and status
router.get('/tripHistory/:userId', async (req, res) => {
    const userId = req.params.userId;
    const status = req.query.status;
  
    let query = `
      SELECT * FROM trips
      WHERE customerId = ?
    `;
    const queryParams = [userId];
  
    if (status) {
      query += ` AND statuses = ?`;  // Correct column name
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
    const { user_id, state, onlineDuration, last_online_timestamp } = req.body;
  
    if (!user_id || !state) {
      return res.status(400).json({ message: 'User ID and state are required' });
    }
  
    try {
      // Get today's date at 00:00:00
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
  
      const todayStartSQL = todayStart.toISOString().slice(0, 19).replace('T', ' ');
  
      // Sum all online time for today
      const timeQuery = `
      SELECT SUM(session_time) AS totalOnlineTime

        FROM driver_log
        WHERE users_id = ? AND log_date >= ?
      `;
  
      const [timeResult] = await pool.query(timeQuery, [user_id, todayStartSQL]);
      const totalOnlineToday = timeResult[0].totalOnlineTime || 0;
  
      const MAX_SECONDS_PER_DAY = 43200; // 12 hours in seconds
  
      if (state === 'online' && totalOnlineToday >= MAX_SECONDS_PER_DAY) {
        return res.status(403).json({ message: 'You have reached the 12-hour daily work limit.' });
      }
  
      // Only allow transition if it differs from current
      const checkQuery = 'SELECT state FROM driver WHERE users_id = ?';
      const [rows] = await pool.query(checkQuery, [user_id]);
  
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Driver not found' });
      }
  
      const currentState = rows[0].state;
  
      if (currentState === state) {
        return res.status(200).json({ message: 'State is already set to the requested value' });
      }
  
      // Update driver state
      const updateQuery = `
        UPDATE driver 
        SET state = ?, 
            online_time = ?, 
            last_online_timestamp = COALESCE(?, NOW()) 
        WHERE users_id = ?
      `;
  
      const [updateResult] = await pool.query(updateQuery, [state, onlineDuration, last_online_timestamp, user_id]);
  
      // Optional: Log this session to a new `driver_log` table (see next section)
      if (state === 'offline') {
        const logInsert = `
          INSERT INTO driver_log (users_id, log_date, session_time)
          VALUES (?, NOW(), ?)
        `;
        await pool.query(logInsert, [user_id, onlineDuration]);
      }
  
      return res.status(200).json({ message: 'Status updated successfully' });
    } catch (error) {
      console.error('Error executing query:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  
  

 
  // Get driver state and online_time
  router.get('/getDriverState', async (req, res, next) => {
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
    // GET /getDriverSessionTime?userId=123
router.get('/getDriverLog', async (req, res) => {
    const userId = req.query.userId;
  
    if (!userId) return res.status(400).json({ error: "User ID is required" });
  
    try {
      const connection = await pool.getConnection(); // Get connection from pool
  
      const [rows] = await connection.query(
        `SELECT session_time, log_date FROM driver_log WHERE users_id = ? ORDER BY log_date DESC LIMIT 10`,
        [userId]
      );
  
      connection.release(); // Don't forget to release the connection back to the pool
  
      // Optional: Calculate total session time
      const totalSessionTime = rows.reduce((acc, log) => acc + log.session_time, 0);
  
      res.json({ logs: rows, totalSessionTime });
    } catch (error) {
      console.error("Error fetching session time:", error);
      res.status(500).json({ error: "Failed to fetch session time" });
    }
  });

 
// Route to get Driver Trips based on status
router.get('/getDriverTrips', async (req, res, next) => {
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
  






module.exports = router;
