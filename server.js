const express = require("express");
const mysql = require('mysql');
const cors = require('cors');
const nodemailer = require('nodemailer');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');

const cookieParser = require('cookie-parser');
const session = require('express-session');
const bodyParser = require('body-parser');
const https = require('https');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
// Create the HTTP server
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:3000'],
        //  origin: "*",
        methods: ["POST", "GET", "PUT", "DELETE", "PATCH"],
    }
});

// Socket connection and room setup
io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Here, assume that a 'joinRoom' event is emitted from the client with their customerId or driverId
    socket.on('joinRoom', (userId) => {
        const roomName = `customer_${userId}`;
        socket.join(roomName);
        console.log(`User with ID ${userId} joined room: ${roomName}`);
    });

    socket.on('acceptTrip', (tripId) => {
        io.emit('tripAccepted', { tripId });
    });

    socket.on('tripCancelled', (tripId) => {
        io.emit('tripCancelled', { tripId });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });

    socket.on('error', (error) => {
        console.error('Socket connection error:', error);
    });
});

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ["POST", "GET", "PUT", "DELETE", "PATCH"],
    credentials: true
}));
app.use(express.json());
app.use(express.static('public'));
app.use(cookieParser());
app.use(bodyParser.json());

app.use(session({
    secret: 'secrete',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24
    }
}))

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "nthome_db"
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to database: ', err);
        return;
    }
    console.log('Connected to the database');
});

app.get('/user', (req, res) => {
    if (req.session.userId && req.session.role && req.session.username && req.session.email) {
        // Log the email
        console.log(`User email: ${req.session.email}`);

        // Respond with user session data
        return res.json({ valid: true, userId: req.session.userId, role: req.session.role, username: req.session.username, email: req.session.email });
    } else {
        return res.json({ valid: false });
    }
});

//signup for all users
app.post('/signup', (req, res) => {
    const checkEmailQuery = "SELECT * FROM users WHERE email = ?";
    const insertUserQuery = "INSERT INTO users (name, email, password, role, gender) VALUES (?, ?, ?, ?, ?)";
    const values = [
        req.body.name,
        req.body.email,
        req.body.password,
        req.body.role,
        req.body.gender  // Add gender to the values array
    ];

    // Check if the email already exists
    db.query(checkEmailQuery, [req.body.email], (err, result) => {
        if (err) {
            console.error("Error occurred during signup:", err);
            return res.status(500).json({ error: "An error occurred during signup" });
        }

        if (result.length > 0) {
            // Email already exists, return a message to the user
            return res.status(400).json({ error: "Email already exists. Please use a different email address." });
        }

        // If the email doesn't exist, proceed with signup
        db.query(insertUserQuery, values, (err, result) => {
            if (err) {
                console.error("Error occurred during signup:", err);
                return res.status(500).json({ error: "An error occurred during signup" });
            }
            return res.status(200).json({ message: "Signup successful", result });
        });
    });
});


// Set up Multer middleware to handle file uploads:
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        return cb(null, './public/documents') // Specify the directory where uploaded files will be stored
    },
    filename: function (req, file, cb) {
        return cb(null, `${file.originalname}`) // Specify the name of the uploaded file
    }
});

const upload = multer({ storage });
//inserting driver details
app.post('/driver_details', upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'id_copy', maxCount: 1 },
    { name: 'police_clearance', maxCount: 1 },
    { name: 'pdp', maxCount: 1 },
    { name: 'car_inspection', maxCount: 1 }  // Added car_inspection field
]), (req, res) => {
    console.log("Request Body:", req.body);

    const { gender, userId, payment_url } = req.body;
    const { photo, id_copy, police_clearance, pdp, car_inspection } = req.files;

    // SQL query to insert the data into the database

    // Add logic for inserting car_inspection into the database

    
    const query = `
        INSERT INTO driver (users_id, gender, URL_payment, photo, id_copy, police_clearance, pdp, car_inspection)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [
        userId,
        gender,
        payment_url,
        photo[0].filename,
        id_copy[0].filename,
        police_clearance[0].filename,
        pdp[0].filename,
        car_inspection[0].filename   // Insert car_inspection file
    ], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Error saving driver documents.' });
        } else {
            res.json({ message: 'Driver documents uploaded successfully.' });
        }
    });
});


// getting driver details
// Endpoint to fetch driver details by user ID
app.get('/more_details/user', (req, res) => {
    const userId = req.query.userId;

    if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
    }
    // Construct SQL SELECT query
    const sql = "SELECT * FROM driver WHERE users_id = ?";

    // Execute the SQL query
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Error fetching driver details by user ID:", err);
            return res.status(500).json({ error: "An error occurred while fetching driver details" });
        }

        // Check if driver details for the user exist
        if (results.length === 0) {
            return res.status(404).json({ message: "Driver details not found for the user" });
        }

        // Driver details found, return the data
        return res.status(200).json({ driver: results }); // <-- Changed key to 'driver'
    });
});

// Endpoint to fetch driver documents
app.get('/driver_documents/:id', (req, res) => {
    const driverId = req.params.id;

    // Query the database to fetch documents for the specified driver
    const sql = "SELECT * FROM driver WHERE users_id = ?";
    db.query(sql, [driverId], (err, results) => {
        if (err) {
            console.error("Error fetching driver documents:", err);
            return res.status(500).json({ error: "An error occurred while fetching documents" });
        }
        // Check if any documents were found
        if (results.length === 0) {
            return res.status(404).json({ message: "No documents found for the specified driver" });
        }
        // Send the fetched documents back to the client
        return res.status(200).json(results);
    });
});

// Endpoint to update driver documents
app.put('/driver_documents/:id', upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'id_copy', maxCount: 1 },
    { name: 'police_clearance', maxCount: 1 },
    { name: 'pdp', maxCount: 1 }
]), (req, res) => {
    const driverId = req.params.id;

    // Log the request body and files to inspect the data
    console.log("Request Body:", req.body);
    console.log("Uploaded Files:", req.files);

    // Extract the necessary fields from the request body
    const { payment_url } = req.body;

    // Extract the uploaded files from req.files
    const { photo, id_copy, police_clearance, pdp } = req.files;

    // Create an array of fields to update, only including those that were provided in the request
    const updates = [];
    if (photo) updates.push(`photo = '${photo[0].filename}'`);
    if (id_copy) updates.push(`id_copy = '${id_copy[0].filename}'`);
    if (police_clearance) updates.push(`police_clearance = '${police_clearance[0].filename}'`);
    if (pdp) updates.push(`pdp = '${pdp[0].filename}'`);
    if (payment_url) updates.push(`URL_payment = '${payment_url}'`);

    // If there are no updates to be made, return an error
    if (updates.length === 0) {
        return res.status(400).json({ error: "No valid fields provided for update" });
    }

    // Construct the SQL UPDATE query
    const sql = `UPDATE driver SET ${updates.join(', ')} WHERE users_id = ?`;

    // Execute the SQL query
    db.query(sql, [driverId], (err, result) => {
        if (err) {
            console.error("Error occurred during document update:", err);
            return res.status(500).json({ error: "An error occurred during the document update" });
        }

        // If no rows were affected, the driver ID might be incorrect
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Driver not found or no changes made" });
        }

        return res.status(200).json({ message: "Driver documents updated successfully", result });
    });
});



// Endpoint to insert car listing
app.post('/car_listing', upload.single('carImage'), (req, res) => {
    // Extract car details from the request body
    const { carMake, carModel, carYear, carSeats, carColor, licensePlate, userId } = req.body;

    // Get the file path of the uploaded image
    const imageName = req.file ? req.file.filename : '';

    // Validate the incoming data
    if (!carMake || !carModel || !carYear || !carSeats || !carColor || !licensePlate || !imageName) {
        return res.status(400).json({ error: "All car details are required" });
    }

    // Construct SQL INSERT query
    const sql = "INSERT INTO car_listing (car_make, car_model, car_year, number_of_seats, car_colour, car_image, license_plate, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    const values = [carMake, carModel, carYear, carSeats, carColor, imageName, licensePlate, userId];

    // Execute the SQL query
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error inserting car details:", err);
            return res.status(500).json({ error: "An error occurred while saving car details" });
        }
        return res.status(200).json({ message: "Car details saved successfully" });
    });
});

// Endpoint to get car listing by userId
app.get('/car_listing/user', (req, res) => {
    const userId = req.query.userId; // Check if userId is received properly

    console.log('Received userId:', userId); // Add this log to verify
    if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
    }

    const sql = "SELECT * FROM car_listing WHERE userId = ?";
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Error fetching car details by user ID:", err);
            return res.status(500).json({ error: "An error occurred while fetching car details" });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "Car listings not found for the user" });
        }

        return res.status(200).json({ carListings: results });
    });
});


//endpoint to update car listing
app.put('/car_listing/:id', upload.single('carImage'), (req, res) => {
    const carId = req.params.id;
    const { carMake, carModel, carYear, carSeats, carColor, licensePlate } = req.body;
    
    // Log received data for debugging
    console.log('Received car ID:', carId);
    console.log('Request body:', req.body);
    console.log('Uploaded file:', req.file); // Log uploaded file info

    // SQL update query
    const sql = `
        UPDATE car_listing
        SET car_make = ?, car_model = ?, car_year = ?, number_of_seats = ?, car_colour = ?, license_plate = ?
        WHERE userId = ?;
    `;

    // Log SQL query and parameters
    console.log('SQL Query:', sql);
    console.log('Parameters:', [carMake, carModel, carYear, carSeats, carColor, licensePlate, carId]);

    db.query(sql, [carMake, carModel, carYear, carSeats, carColor, licensePlate, carId], (err, result) => {
        if (err) {
            console.error('Error updating car details:', err);
            return res.status(500).json({ error: 'An error occurred while updating car details' });
        }
        console.log('Update result:', result);
        res.status(200).json({ message: 'Car details updated successfully' });
    });
});


// Multer configuration for profile pictures
const profilePictureStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/profile_pictures'); // Directory for profile pictures
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname); // Extract the file extension
        const basename = path.basename(file.originalname, ext); // Extract the filename without extension
        cb(null, `${basename}-${Date.now()}${ext}`); // Create a unique filename
    }
});

const uploadProfilePicture = multer({ storage: profilePictureStorage });

// Endpoint to update profile picture
app.put('/update-profile-picture/:userId', uploadProfilePicture.single('profilePicture'), (req, res) => {
    const userId = req.params.userId;
    const profilePicture = req.file ? req.file.filename : null;

    if (!profilePicture) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // SQL query to update the user's profile picture in the database
    const sql = `UPDATE users SET profile_picture = ? WHERE id = ?`;
    db.query(sql, [profilePicture, userId], (err, result) => {
        if (err) {
            console.error('Error updating profile picture:', err);
            return res.status(500).json({ error: 'An error occurred while updating the profile picture' });
        }
        res.status(200).json({ message: 'Profile picture updated successfully' });
    });
});
//user_id selection
app.post('/driver_log', (req, res) => {
    const sql = "SELECT id FROM users WHERE email = ?";
    db.query(sql, [req.body.email], (err, result) => {
        if (err) {
            console.error("Error executing SQL query:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
        if (result.length > 0) {
            return res.json({ driver_log: true, userId: result[0].id });
        } else {
            return res.json({ driver_log: false, message: "Invalid email" });
        }
    });
});



// login for all users
app.post('/login', (req, res) => {
    const { email, password } = req.body;
  
    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
  
    const sql = "SELECT id, role, name, email FROM users WHERE email = ? AND password = ?";
    db.query(sql, [email, password], (err, result) => {
      if (err) {
        console.error("Error executing SQL query:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
  
      if (result.length > 0) {
        req.session.username = result[0].name; // Store the username in session
        req.session.userId = result[0].id; // Store the user ID in session
        req.session.role = result[0].role; // Store the user role in session
        req.session.email = result[0].email; // Store the user email in session
        return res.json({ login: true, message: "Login successful" });
      } else {
        return res.status(401).json({ login: false, message: "Invalid email or password" });
      }
    });
  });
  
//get user info
app.get('/userInfo/:id', (req, res) => {
    const sql = "SELECT * FROM users WHERE id = ?";
    const id = req.params.id;
    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error("Error executing SQL query:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.json(results);
    });
});


app.get('/logout', (req, res) => {
    // Clear session data
    req.session.destroy(err => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).json({ error: "Failed to logout" });
        }

        // Remove cookies
        res.clearCookie('connect.sid'); // Assuming 'connect.sid' is the default session cookie name

        // Respond with success message
        return res.status(200).json({ message: "Logout successful" });
    });
});

const sendApprovalEmail = (driverEmail) => {
    const mailOptions = {
        from: 'jntokozo195@gmail.com',
        to: driverEmail,
        subject: 'Driver Status Approved',
        text: 'Congratulations! Your driver status has been approved. You can start accepting ridez.'
    };

    return transporter.sendMail(mailOptions);
};

app.put('/edit_driver/:id', (req, res) => {
    const driverId = req.params.id;
    const { name, lastName, email, phoneNumber, address, state, role, status, class: carClass } = req.body;

    // Start a transaction
    db.beginTransaction(err => {
        if (err) {
            console.error("Error beginning transaction:", err);
            return res.status(500).json({ message: "Internal server error" });
        }

        // Update driver information
        const updateDriverSQL = `UPDATE driver SET state = ?, status = ? WHERE users_id = ?`;
        db.query(updateDriverSQL, [state, status, driverId], (err, result) => {
            if (err) {
                db.rollback(() => {
                    console.error("Error updating driver information:", err);
                    return res.status(500).json({ message: "Internal server error" });
                });
                return;
            }

            // Update car listing information
            const updateCarListingSQL = `UPDATE car_listing SET class = ? WHERE userId = ?`;
            db.query(updateCarListingSQL, [carClass, driverId], (err, result) => {
                if (err) {
                    db.rollback(() => {
                        console.error("Error updating car listing information:", err);
                        return res.status(500).json({ message: "Internal server error" });
                    });
                    return;
                }

                // Commit the transaction
                db.commit(err => {
                    if (err) {
                        db.rollback(() => {
                            console.error("Error committing transaction:", err);
                            return res.status(500).json({ message: "Internal server error" });
                        });
                        return;
                    }

                    // Send an email if status is 'approved'
                    if (status === 'approved') {
                        sendApprovalEmail(email)
                            .then(() => {
                                res.json({ message: "Driver and car listing updated successfully, email sent" });
                            })
                            .catch(error => {
                                console.error("Error sending email:", error);
                                res.json({ message: "Driver and car listing updated successfully, but failed to send email" });
                            });
                    } else {
                        res.json({ message: "Driver and car listing updated successfully" });
                    }
                });
            });
        });
    });
});

//FETCH CAR LISTINGS
app.get('/carListings', (req, res) => {
    const fetchCarListingsSQL = 'SELECT * FROM car_listing'; // Modify this query based on your schema

    db.query(fetchCarListingsSQL, (err, results) => {
        if (err) {
            console.error("Error fetching car listings:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
        res.json(results);
    });
});


// Edit customer endpoint
app.put('/edit_customer/:id', (req, res) => {
    const { name, lastName, email,  phoneNumber, address } = req.body;
    const userId = req.params.id;

    const sql = "UPDATE users SET `name` = ?, `lastName` = ?, `email` = ?,  `phoneNumber` = ?, `address` = ? WHERE `id` = ?";
    const values = [name, lastName, email,  phoneNumber, address, userId]; // Include userId as the last parameter

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error executing SQL query:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found or not updated" });
        }
        return res.json({ message: "Updated successfully" });
    });
});

//updating current address
app.put('/updateCurrentAddress/:id', (req, res) => {
    const { currentAddress } = req.body;
    const driverId = req.params.id;

    const sql = "UPDATE driver SET current_address = ? WHERE id = ?";
    const values = [currentAddress, driverId];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error updating current address:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
        return res.json({ message: "Current address updated successfully" });
    });
});
//car listing data
app.get('/api/car-listings', (req, res) => {
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
            d.id AS  userId,
            d.photo AS driverPhoto,
            d.id_copy AS driverIdCopy,
            d.gender AS driverGender,
            d.police_clearance AS driverPoliceClearance,
            d.pdp AS driverPdp,
            d.status AS driverStatus,
            d.state AS driverState
        FROM vehicle v
        JOIN car_listing cl ON v.id = cl.class
        JOIN users u_cl ON cl.userId = u_cl.id
        JOIN driver d ON cl.userId = d.users_id
        WHERE d.state = 'online' AND d.status = 'approved'
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching car listings:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        // console.log('Car listings retrieved from database:', results); // Log the results
        res.json(results);
    });
});

// Endpoint to handle trip creation
app.post('/api/trips', (req, res) => {
    console.log('Request Body:', req.body); // Log the incoming request body

    const {
        customerId, driverId, requestDate, currentDate, pickUpLocation, dropOffLocation, statuses,
        rating, feedback, duration_minutes, vehicle_type, distance_traveled, cancellation_reason,
        cancel_by, pickupTime, dropOffTime,pickUpCoordinates,dropOffCoordinates
    } = req.body;

    // Check for required fields
    if (!customerId || !driverId || !requestDate || !currentDate || !pickUpLocation || !dropOffLocation || !vehicle_type || !distance_traveled) {
        return res.status(400).json({ error: "Required fields are missing" });
    }

    // Prepare SQL query to insert trip data into the database
    const sql = `
        INSERT INTO trip (
            customerId, driverId, requestDate, currentDate, pickUpLocation, dropOffLocation, statuses,
            customer_rating, customer_feedback, duration_minutes, vehicle_type, distance_traveled, cancellation_reason,
            cancel_by, pickupTime, dropOffTime, pickUpCoordinates, dropOffCoordinates
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    // Ensure that pickUpCoordinates and dropOffCoordinates are passed as valid JSON objects
    const pickUpCoordinatesJson = JSON.stringify(pickUpCoordinates); // Convert coordinates to JSON string
    const dropOffCoordinatesJson = JSON.stringify(dropOffCoordinates); // Convert coordinates to JSON string

    // Execute the SQL query with data from req.body
    db.query(sql, [
        customerId, driverId, requestDate, currentDate, pickUpLocation, dropOffLocation, statuses,
        rating, feedback, duration_minutes, vehicle_type, distance_traveled, cancellation_reason,
        cancel_by, pickupTime, dropOffTime, pickUpCoordinatesJson, dropOffCoordinatesJson
    ], (err, result) => {
        if (err) {
            console.error("Error saving trip data:", err);
            return res.status(500).json({ error: "An error occurred while saving trip data" });
        }
        
        const tripId = result.insertId; // Get the inserted trip ID
        if (!tripId) {
            console.error("Trip ID not generated after insertion");
            return res.status(500).json({ error: "Failed to generate trip ID after insertion" });
        }

        // Return the tripId in the response
        return res.status(200).json({ message: "Trip data saved successfully", tripId: tripId });
    });
});


// fetching the drivers 
app.get('/viewDrivers', (req, res) => {
    const sql = `
        SELECT u.*, d.status, d.state
        FROM users u
        JOIN driver d ON u.id = d.users_id
        WHERE u.role = 'driver'
    `;
    console.log(sql);
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error executing SQL query:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
        // console.log("Fetched data:", results);
        res.json(results);
    });
});

//delete customers
app.delete('/delete_customer/:id', (req, res) => {
    const { id } = req.params;
 
    // Define SQL queries for deleting records from related tables
    const deleteFeedbackSQL = "DELETE FROM feedback WHERE userId = ?";
    const deletePaymentSQL = "DELETE FROM payment WHERE tripId IN (SELECT id FROM trip WHERE customerId = ?)";
    const deleteTripSQL = "DELETE FROM trip WHERE customerId = ?";
    const deleteDisabilitySQL = "DELETE FROM disability WHERE user_id = ?";
    const deleteUserSQL = "DELETE FROM users WHERE id = ?";

    // Start deletion process
    db.query(deleteFeedbackSQL, [id], (err) => {
        if (err) {
            console.error("Error deleting from feedback:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
        console.log("Deleted from feedback");

        db.query(deletePaymentSQL, [id], (err) => {
            if (err) {
                console.error("Error deleting from payment:", err);
                return res.status(500).json({ message: "Internal server error" });
            }
            console.log("Deleted from payment");

            db.query(deleteTripSQL, [id], (err) => {
                if (err) {
                    console.error("Error deleting from trip:", err);
                    return res.status(500).json({ message: "Internal server error" });
                }
                console.log("Deleted from trip");

                db.query(deleteDisabilitySQL, [id], (err) => {
                    if (err) {
                        console.error("Error deleting from disability:", err);
                        return res.status(500).json({ message: "Internal server error" });
                    }
                    console.log("Deleted from disability");

                    db.query(deleteUserSQL, [id], (err, result) => {
                        if (err) {
                            console.error("Error deleting user:", err);
                            return res.status(500).json({ message: "Internal server error" });
                        }
                        if (result.affectedRows === 0) {
                            return res.status(404).json({ message: "User not found or not deleted" });
                        }
                        return res.json({ message: "User and related records deleted successfully" });
                    });
                });
            });
        });
    });
});

// delete driver and related records
app.delete('/delete_driver/:id', (req, res) => {
    const { id } = req.params;

    // Define SQL queries for deleting records from related tables
    const deletePaymentSQL = `
        DELETE payment FROM payment
        JOIN trip ON payment.tripId = trip.id
        WHERE trip.driverId = ?
    `;
    const deleteTripSQL = "DELETE FROM trip WHERE driverId = ?";
    const deleteCarListingSQL = "DELETE FROM car_listing WHERE userId = ?";
    const deleteDriverSQL = "DELETE FROM driver WHERE users_id = ?";
    const deleteSubscriptionsSQL = "DELETE FROM subscriptions WHERE user_id = ?";
    const deleteUserSQL = "DELETE FROM users WHERE id = ?";

    // Start the deletion process
    db.query(deletePaymentSQL, [id], (err) => {
        if (err) {
            console.error("Error deleting from payment:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
        console.log("Deleted from payment");

        db.query(deleteTripSQL, [id], (err) => {
            if (err) {
                console.error("Error deleting from trip:", err);
                return res.status(500).json({ message: "Internal server error" });
            }
            console.log("Deleted from trip");

            db.query(deleteCarListingSQL, [id], (err) => {
                if (err) {
                    console.error("Error deleting from car_listing:", err);
                    return res.status(500).json({ message: "Internal server error" });
                }
                console.log("Deleted from car_listing");

                db.query(deleteDriverSQL, [id], (err) => {
                    if (err) {
                        console.error("Error deleting from driver:", err);
                        return res.status(500).json({ message: "Internal server error" });
                    }
                    console.log("Deleted from driver");

                    db.query(deleteSubscriptionsSQL, [id], (err) => {
                        if (err) {
                            console.error("Error deleting from subscriptions:", err);
                            return res.status(500).json({ message: "Internal server error" });
                        }
                        console.log("Deleted from subscriptions");

                        db.query(deleteUserSQL, [id], (err, result) => {
                            if (err) {
                                console.error("Error deleting user:", err);
                                return res.status(500).json({ message: "Internal server error" });
                            }
                            if (result.affectedRows === 0) {
                                return res.status(404).json({ message: "User not found or not deleted" });
                            }
                            return res.json({ message: "User and related records deleted successfully" });
                        });
                    });
                });
            });
        });
    });
});



// Update driver details
app.put('/driver_details', upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'id_copy', maxCount: 1 },
    { name: 'police_clearance', maxCount: 1 },
    { name: 'pdp', maxCount: 1 }
]), (req, res) => {
    // Log the request body to inspect what's being sent from the client side
    console.log("Request Body:", req.body);

    // Extract the necessary fields from the request body
    const { gender } = req.body;
    const userId = req.query.userId; // Extract user ID from URL params

    // Extract the uploaded files from req.files
    const { photo, id_copy, police_clearance, pdp } = req.files;

    // Log the userId to ensure it's being received correctly
    console.log("User ID:", userId);

    // Proceed with your database update operation
    const sql = `
        UPDATE driver 
        SET photo = ?, 
            id_copy = ?, 
            gender = ?, 
            police_clearance = ?, 
            pdp = ? 
        WHERE users_id = ?
    `;
    const values = [
        photo ? photo[0].filename : null, // Check if photo is uploaded
        id_copy ? id_copy[0].filename : null, // Check if id_copy is uploaded
        gender,
        police_clearance ? police_clearance[0].filename : null, // Check if police_clearance is uploaded
        pdp ? pdp[0].filename : null, // Check if pdp is uploaded
        userId
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error occurred during driver details update:", err);
            return res.status(500).json({ error: "An error occurred during driver details update" });
        }
        return res.status(200).json({ message: "Driver details updated successfully", result });
    });
});

////////////////////////////////admin apis////////////////////////////////
app.get('/viewCustomers', (req, res) => {
    const sql = "SELECT * FROM users WHERE role = 'customer'";
    console.log(sql); // Log the SQL query for debugging purposes

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error executing SQL query:", err);
            return res.status(500).json({ message: "Internal server error" });
        }

        console.log(results); // Log the results fetched from the database

        if (results.length === 0) {
            return res.status(404).json({ message: "No users found" });
        }

        return res.json(results); // Return all user data
    });
});
///////Trips endpoint api//////
app.get('/rideHistory/:id', (req, res) => {
    const sql = `
        SELECT 
            t.*, 
            u1.name AS customerName, 
            u2.name AS driverName
        FROM 
            trip t
        JOIN 
            users u1 ON t.customerId = u1.id
        JOIN 
            users u2 ON t.driverId = u2.id
        WHERE 
            t.customerId = ?
    `;
    const id = req.params.id;
    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error("Error executing SQL query:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "No trips found for this user" });
        }
        return res.json(results);
    });
});

///////Trips endpoint api//////
app.get('/driverHistory/:id', (req, res) => {
    const sql = `
        SELECT 
            t.*, 
            u1.name AS customerName, 
            u2.name AS driverName
        FROM 
            trip t
        JOIN 
            users u1 ON t.customerId = u1.id
        JOIN 
            users u2 ON t.driverId = u2.id
        WHERE 
            t.driverId = ?
    `;
    const id = req.params.id; // Corrected from req.params.userId
    console.log("Received request for ride history with driverId:", id); // Log the received id
    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error("Error executing SQL query:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
        if (results.length === 0) {
            console.log("No ride history found for driverId:", id); // Log if no results are found
            return res.status(404).json({ message: "User not found" });
        }
        console.log("Ride history results:", results); // Log the query results
        return res.json(results);
    });
});


// Endpoint to get all trips
app.get('/trips', (req, res) => {
    const sql = `
        SELECT 
            t.*, 
            u1.name AS customerName, 
            u2.name AS driverName
        FROM 
            trip t
        JOIN 
            users u1 ON t.customerId = u1.id
        JOIN 
            users u2 ON t.driverId = u2.id
    `;
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch trips' });
        }
        res.json(results);
    });
});

// Get the latest trip ID for a customer
app.get('/api/trips/latest/:customerId', (req, res) => {
    const { customerId } = req.params;
    const sql = `
      SELECT id, statuses, payment_status, driverId
      FROM trip 
      WHERE customerId = ? 
      ORDER BY requestDate DESC 
      LIMIT 1
    `;
    
    db.query(sql, [customerId], (err, result) => {
      if (err) {
        console.error("Error fetching latest trip:", err);
        return res.status(500).json({ error: "An error occurred while fetching the latest trip" });
      }
      
      if (result.length === 0) {
        return res.status(404).json({ error: "No trips found for the customer" });
      }
      
      return res.status(200).json(result[0]); // Return the trip details
    });
  });

  
  
  
// Endpoint to handle trip cancellation
app.patch('/api/trips/:tripId', (req, res) => {
    const { tripId } = req.params;
    const {
      customerId,
      currentDate,
      statuses,
      cancellation_reason,
      cancel_by,
      distance_travelled

    } = req.body;
  
    if (!tripId || !customerId || !currentDate || !statuses ||  !distance_travelled || !cancellation_reason || !cancel_by) {
      return res.status(400).json({ error: "Required fields are missing" });
    }
  
    const sql = "UPDATE trip SET statuses = ?, currentDate = ?, cancellation_reason = ?, cancel_by = ?,  distance_traveled = ? WHERE id = ? AND customerId = ?";
    
    db.query(sql, [statuses, currentDate, cancellation_reason, cancel_by,distance_travelled, tripId, customerId], (err, result) => {
      if (err) {
        console.error("Error updating trip data:", err);
        return res.status(500).json({ error: "An error occurred while updating trip data" });
      }
      return res.status(200).json({ message: "Trip data updated successfully" });
    });
  });
  

// Endpoint to handle trip cancellation
app.patch('/api/tripsDriver/:tripId', (req, res) => {
    const { tripId } = req.params;
    const {
      driverId,
      currentDate,
      statuses,
      cancellation_reason,
      cancel_by,
      distance_travelled
    } = req.body;
  
    // Ensure required fields are present
    if (!tripId || !driverId || !currentDate || !statuses || !distance_travelled || !cancellation_reason || !cancel_by) {
      return res.status(400).json({ error: "Required fields are missing" });
    }
   
    // SQL query to update the trip status
    const sql = "UPDATE trip SET statuses = ?, currentDate = ?, cancellation_reason = ?, cancel_by = ?, distance_traveled = ? WHERE id = ? AND driverId = ?";
  
    db.query(sql, [statuses, currentDate, cancellation_reason, cancel_by, distance_travelled, tripId, driverId], (err, result) => {
      if (err) {
        console.error("Error updating trip data:", err);
        return res.status(500).json({ error: "An error occurred while updating trip data" });
      }
  
      // If trip is cancelled, send cancellation message to the customer via socket
      if (statuses === 'cancelled') {
        // Query to fetch the customer ID for the trip
        const getCustomerSql = "SELECT customerId FROM trip WHERE id = ?";
        
        db.query(getCustomerSql, [tripId], (err, customerResult) => {
          if (err) {
            console.error("Error fetching customer ID:", err);
            return res.status(500).json({ error: "Error fetching customer ID" });
          }
  
          // Ensure a valid customer was found
          if (customerResult.length === 0) {
            return res.status(404).json({ error: "Customer not found for the given trip" });
          }
  
          const customerId = customerResult[0].customerId;
        });
      }
  
      return res.status(200).json({ message: "Trip data updated successfully" });
    });
  });
  
// Endpoint to get earnings

app.get('/earnings', (req, res) => {
    const sql = `
        SELECT 
            t.id AS rideId, 
            t.driverId AS driver_id, 
            t.vehicle_type AS rideType, 
            t.requestDate AS rideDate, 
            t.duration_minutes AS totalRide, 
            u1.name AS riderName, 
            u2.name AS driverName, 
            p.paymentType, 
            p.amount AS totalAmount
        FROM 
            trip t
        JOIN 
            users u1 ON t.customerId = u1.id
        JOIN 
            users u2 ON t.driverId = u2.id
        JOIN
            payment p ON t.id = p.tripId
       
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error executing SQL query:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
        res.json(results);
    });
});
// Endpoint to get driver earnings
app.get('/driverEarnings/:id', (req, res) => {
    const driverId = req.params.id;
    const sql = `
        SELECT 
            t.id AS rideId, 
            t.vehicle_type AS rideType, 
            t.requestDate AS rideDate, 
            t.duration_minutes AS totalRide, 
            u1.name AS riderName, 
            u2.name AS driverName, 
            p.paymentType, 
            p.amount AS totalAmount
        FROM 
            trip t
        JOIN 
            users u1 ON t.customerId = u1.id
        JOIN 
            users u2 ON t.driverId = u2.id
              JOIN
            payment p ON t.id = p.tripId
        WHERE
            t.driverId = ?
    `;
    db.query(sql, [driverId], (err, results) => {
        if (err) {
            console.error("Error executing SQL query:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
        res.json(results);
    });
});

//Endpoint to get vehicle types
app.get('/vehicles', (req, res) => {
    const query = 'SELECT * FROM vehicle';
    db.query(query, (error, results) => {
        if (error) {
            console.error('Error executing MySQL query:', error);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        res.json(results);
    });
});

// Edit vehicle endpoint
app.put('/edit_vehicle/:id', (req, res) => {
    const id = req.params.id;
    const { name, costPerKm, status, image } = req.body;

    const query = 'UPDATE vehicle SET name = ?, costPerKm = ?, status = ?, image = ? WHERE id = ?';
    db.query(query, [name, costPerKm, status, image, id], (error, results) => {
        if (error) {
            console.error('Error updating vehicle:', error);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        res.status(200).json({ message: 'Vehicle updated successfully' });
    });
});

// Delete vehicle endpoint
app.delete('/delete_vehicle/:id', (req, res) => {
    const id = req.params.id;

    const query = 'DELETE FROM vehicle WHERE id = ?';
    db.query(query, [id], (error, results) => {
        if (error) {
            console.error('Error deleting vehicle:', error);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        res.status(200).json({ message: 'Vehicle deleted successfully' });
    });
});

// Endpoint to add a vehicle type
app.post('/addVehicles', upload.single('image'), (req, res) => {
    const { name, costPerKm, status } = req.body;
    const imageName = req.file ? req.file.filename : '';

    // Validate the incoming data
    if (!name || !costPerKm || !status || !imageName) {
        return res.status(400).json({ error: "All vehicle details are required" });
    }

    const query = 'INSERT INTO vehicle (name, costPerKm, status, image) VALUES (?, ?, ?, ?)';
    const values = [name, costPerKm, status, imageName];

    db.query(query, values, (error, result) => {
        if (error) {
            console.error('Error adding vehicle:', error);
            return res.status(500).json({ error: 'An error occurred while saving vehicle details' });
        }
        return res.status(200).json({ message: 'Vehicle details saved successfully' });
    });
});
// Endpoint to handle contact form submissions
app.post('/contact', (req, res) => {
    const {email, subject, message, contact_date } = req.body;
    
    if (!subject || !message || !email) {
        return res.status(400).json({ error: "Subject and message are required" });
    }
    
    const sql = "INSERT INTO contact_support (email, subject, message, contact_date) VALUES (?, ?, ?, ?)";
    db.query(sql, [email, subject, message, contact_date], (err, result) => {
        if (err) {
            console.error("Error saving contact form data:", err);
            return res.status(500).json({ error: "An error occurred while saving contact form data" });
        }
        return res.status(200).json({ message: "Contact form submitted successfully" });
    });
});

// Route to fetch messages
app.get('/messages', (req, res) => {
    // Query to fetch messages from the contact_support table
    const sql = 'SELECT id, message FROM contact_support WHERE status = "unread"'; // Assuming 'status' column exists
  
    // Execute the query
    db.query(sql, (err, results) => {
      if (err) {
        console.error('Error fetching messages:', err);
        return res.status(500).json({ error: 'An unexpected error occurred' });
      }
  
      // If no errors, return the messages as JSON response
      res.json({ messages: results });
    });
  })

  // Endpoint to fetch messages
app.get('/messages/all', (req, res) => {
    const sql = 'SELECT * FROM contact_support'; // Assuming your table name is contact_support
  
    db.query(sql, (err, result) => {
      if (err) {
        console.error('Error fetching messages:', err);
        return res.status(500).json({ error: 'An error occurred while fetching messages' });
      }
      res.json({ messages: result }); // Assuming result is an array of messages
    });
  });
  
  // Route to mark message as read
app.put('/messages/:id', (req, res) => {
    const messageId = req.params.id;
    const status = req.body.status || 'read'; // Default to 'read' if no status provided
  
    const sql = 'UPDATE contact_support SET status = ? WHERE id = ?';
    db.query(sql, [status, messageId], (err, result) => {
      if (err) {
        console.error('Error marking message as read:', err);
        return res.status(500).json({ error: 'An unexpected error occurred' });
      }
      res.json({ message: 'Message updated successfully' });
    });
  });
  
  // Route to delete a message
  app.delete('/messages/:id', (req, res) => {
    const messageId = req.params.id;
    
    const sql = 'DELETE FROM contact_support WHERE id = ?';
    db.query(sql, [messageId], (err, result) => {
      if (err) {
        console.error('Error deleting message:', err);
        return res.status(500).json({ error: 'An unexpected error occurred' });
      }
      res.json({ message: 'Message deleted successfully' });
    });
  });
  
//////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/api/update_settings', (req, res) => {
    const query = 'SELECT * FROM site_settings'; // Adjust the query as needed
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching settings:', err);
            res.status(500).send('Error fetching settings');
            return;
        }
        res.json(results[0]);
    });
});


// Example backend route for updating settings using POST
app.post('/api/update_settings', (req, res) => {
    const {
        companyName,
        supportEmail,
        supportPhone,
        driverNotifications,
        riderNotifications,
        promoNotifications,
        baseFareBlack,
        baseFareX,
        perKMRateBlack,
        perKMRateX,
        perMonthRate,
        perWeekRate,
        workingHours,
        cancellationFee
    } = req.body;

    // Assuming you have an `id` for identifying the specific settings row to update
    // If not, adjust your logic accordingly (e.g., finding the settings by some identifier)
    const id = 1; // Example: assuming you want to update settings with id 1

    // Example SQL query to update settings based on `id`
    const query = `
        UPDATE site_settings
        SET 
            companyName = ?,
            supportEmail = ?,
            supportPhone = ?,
            driverNotifications = ?,
            riderNotifications = ?,
            promoNotifications = ?,
            baseFareBlack = ?,
            baseFareX = ?,
            perKMRateBlack = ?,
            perKMRateX = ?,
            perMonthRate = ?,
            perWeekRate = ?,
            workingHours = ?,
            cancellationFee = ?
        WHERE id = ?
    `;

    const values = [
        companyName,
        supportEmail,
        supportPhone,
        driverNotifications,
        riderNotifications,
        promoNotifications,
        baseFareBlack,
        baseFareX,
        perKMRateBlack,
        perKMRateX,
        perMonthRate,
        perWeekRate,
        workingHours,
        cancellationFee,
        id
    ];

    // Execute the query using your database connection (`db`)
    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Failed to update settings:', err);
            res.status(500).send('Failed to update settings');
            return;
        }
        res.status(200).send('Settings updated successfully');
    });
});
app.get('/user-trip-ratings-driver', (req, res) => {
    const sql = `
      SELECT 
          t.id AS trip_id,
          t.customerId, 
          t.driverId, 
          t.requestDate, 
          t.currentDate, 
          t.pickUpLocation, 
          t.dropOffLocation, 
          t.statuses, 
          t.customer_rating, 
          t.customer_feedback, 
          t.duration_minutes, 
          t.vehicle_type, 
          t.distance_traveled, 
          t.payment_status, 
          t.cancellation_reason, 
          t.driver_ratings, 
          t.driver_feedback,
          c.name AS customer_name,
          c.lastName AS customer_lastName,
          d.name AS driver_name,
          d.lastName AS driver_lastName
      FROM 
          trip t
      LEFT JOIN 
          users c ON t.customerId = c.id
      LEFT JOIN 
          users d ON t.driverId = d.id
      WHERE
          t.driver_ratings IS NOT NULL
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error executing SQL query:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
        return res.json(results);
    });
});
app.get('/user-trip-rating-customer', (req, res) => {
    const sql = `
      SELECT 
          u.id AS user_id, 
          u.name AS user_name, 
          u.email, 
          u.password, 
          u.role, 
          u.phoneNumber, 
          u.address, 
          u.lastName AS user_lastName,
          t.id AS trip_id,
          t.customerId, 
          t.driverId, 
          t.requestDate, 
          t.currentDate, 
          t.pickUpLocation, 
          t.dropOffLocation, 
          t.statuses, 
          t.customer_rating, 
          t.customer_feedback, 
          t.duration_minutes, 
          t.vehicle_type, 
          t.distance_traveled, 
          t.payment_status, 
          t.cancellation_reason, 
          t.driver_ratings, 
          t.driver_feedback,
          c.name AS customer_name,
          c.lastName AS customer_lastName,
          d.name AS driver_name,
          d.lastName AS driver_lastName
      FROM 
          users u
      LEFT JOIN 
          trip t ON u.id = t.driverId
      LEFT JOIN 
          users c ON t.customerId = c.id
      LEFT JOIN 
          users d ON t.driverId = d.id
      WHERE
          t.customer_rating IS NOT NULL
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error executing SQL query:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
        return res.json(results);
    });
});
//driver trip customer detail
app.get('/api/user-trip-details-pending', (req, res) => {
    console.log("Received request with driverId:", req.query.driverId);

    const sql = `
      SELECT 
          t.id AS trip_id,
          t.customerId, 
          t.driverId, 
          t.requestDate, 
          t.currentDate, 
          t.pickUpLocation, 
          t.dropOffLocation, 
          t.statuses, 
          t.customer_rating, 
          t.customer_feedback, 
          t.duration_minutes, 
          t.vehicle_type, 
          t.distance_traveled, 
          t.payment_status, 
          t.cancellation_reason, 
          t.driver_ratings, 
          t.driver_feedback,
          p.paymentType, 
          p.amount, 
          p.paymentDate,
          c.id AS customer_id,
          c.name AS customer_name,
          c.lastName AS customer_lastName,
          c.phoneNumber AS customer_phoneNumber,
          c.address AS customer_address,
          c.profile_picture AS profile_picture,
          c.email AS customer_email,
          d.name AS driver_name,
          d.lastName AS driver_lastName
      FROM 
          trip t
      LEFT JOIN 
          users c ON t.customerId = c.id
      LEFT JOIN 
          users d ON t.driverId = d.id
      LEFT JOIN 
          payment p ON t.id = p.tripId
      WHERE
          t.statuses IN ('pending', 'on-going') AND t.driverId = ?
    `;

    const driverId = req.query.driverId;

    db.query(sql, [driverId], (err, results) => {
        if (err) {
            console.error("Error executing SQL query:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
        console.log("SQL query results:", results);
        return res.json(results);
    });
});

// Update trip status and notify customer
app.post('/api/update-trip-status', (req, res) => {
    const { driverId, tripId } = req.body;

    // Update driver state to 'offline'
    const updateDriverStateSql = `
        UPDATE driver 
        SET state = 'offline' 
        WHERE users_id = ?`;

    // Update trip status to 'on-going'
    const updateTripStatusSql = `
        UPDATE trip 
        SET statuses = 'on-going' 
        WHERE id = ?`;

    db.query(updateDriverStateSql, [driverId], (err, driverResult) => {
        if (err) {
            console.error("Error updating driver state:", err);
            return res.status(500).json({ message: "Internal server error" });
        }

        db.query(updateTripStatusSql, [tripId], (err, tripResult) => {
            if (err) {
                console.error("Error updating trip status:", err);
                return res.status(500).json({ message: "Internal server error" });
            }

            // Query to get the customer ID for the trip
            const getCustomerSql = `
                SELECT customerId
                FROM trip 
                WHERE id = ?`;

            db.query(getCustomerSql, [tripId], (err, customerResult) => {
                if (err) {
                    console.error("Error fetching customer ID:", err);
                    return res.status(500).json({ message: "Internal server error" });
                }

                // Check if customerResult is empty
                if (customerResult.length === 0) {
                    console.error("No customer found for the trip ID");
                    return res.status(404).json({ message: "Customer not found for the given trip" });
                }

                const customerId = customerResult[0].customerId;

            

                return res.status(200).json({ message: "Driver state and trip status updated successfully" });
            });
        });
    });
});

// Add error handling to capture any uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('There was an uncaught error', err);
    process.exit(1); //mandatory (as per the Node.js docs)
});

// Update driver state to online and trip status to cancelled
app.post('/api/cancel-trip', (req, res) => {
    const { driverId, tripId } = req.body;

    // Update driver state to 'online'
    const updateDriverStateSql = `
        UPDATE driver 
        SET state = 'online' 
        WHERE users_id = ?`;

    // Update trip status to 'cancelled'
    const updateTripStatusSql = `
        UPDATE trip 
        SET statuses = 'cancelled' 
        WHERE id = ?`;

    db.query(updateDriverStateSql, [driverId], (err, driverResult) => {
        if (err) {
            console.error("Error updating driver state:", err);
            return res.status(500).json({ message: "Internal server error" });
        }

        db.query(updateTripStatusSql, [tripId], (err, tripResult) => {
            if (err) {
                console.error("Error updating trip status:", err);
                return res.status(500).json({ message: "Internal server error" });
            }

            return res.status(200).json({ message: "Driver state and trip status updated successfully" });
        });
    });
});


// Add a new payment
app.post('/api/payments', (req, res) => {
    const { tripId, amount, paymentType,paymentDate } = req.body;
    console.log('Received payment data:', req.body);
    // Check if required fields are provided
    if (!tripId || !amount || !paymentType  || !paymentDate) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    // SQL query to insert the payment
    const sql = `
        INSERT INTO payment (tripId, amount, paymentType, paymentDate)
        VALUES (?, ?, ?, ?)
    `;

    // Execute the query
    db.query(sql, [tripId, amount, paymentType, paymentDate], (err, results) => {
        if (err) {
            console.error("Error executing SQL query:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
        res.status(201).json({ message: "Payment created successfully", paymentId: results.insertId });
    });
});
// Endpoint to submit feedback
// app.post('/api/feedback', (req, res) => {
//     const { userId, content, rating, role } = req.body;
  
//     console.log('Received feedback data:', { userId, content, rating, role });
  
//     // Check if required fields are provided
//     if (!userId || !content || !rating || !role) {
//       return res.status(400).json({ message: 'Missing required fields' });
//     }
  
//     // SQL query to insert the feedback
//     const sql = `
//       INSERT INTO feedback (userId, content, rating, role)
//       VALUES (?, ?, ?, ?)
//     `;
  
//     // Execute the query
//     db.query(sql, [userId, content, rating, role], (err, results) => {
//       if (err) {
//         console.error('Error executing SQL query:', err);
//         return res.status(500).json({ message: 'Internal server error' });
//       }
//       res.status(201).json({ message: 'Feedback submitted successfully', feedbackId: results.insertId });
//     });
//   });
// Endpoint to fetch feedback
app.get('/api/feedback', (req, res) => {
    const sql = 'SELECT * FROM feedback';
    db.query(sql, (err, results) => {
      if (err) {
        console.error('Error fetching feedback:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.status(200).json(results);
    });
  });

// Endpoint to send notifications
// app.post('/api/notifications', async (req, res) => {
//     const { to, message } = req.body;
    
//     console.log('Received notification request:', req.body);

//     try {
//         const query = to === 'driver' 
//             ? 'SELECT email FROM users WHERE role = "driver"' 
//             : 'SELECT email FROM users WHERE role = "customer"';
        
//         db.query(query, async (err, rows) => {
//             if (err) {
//                 console.error('Error fetching emails:', err);
//                 return res.status(500).send('Error fetching emails');
//             }

//             const emails = rows.map(row => row.email);
//             console.log('Fetched emails:', emails);

//             // Send email to each recipient
//             const transporter = nodemailer.createTransport({
//                 service: 'Gmail',
//                 auth: {
//                     user: 'nomfundothe97@gmail.com',
//                     pass: 'Nomfundo@75'
//                 }
//             });

//             const mailOptions = {
//                 from: 'nomfundothe97@gmail.com',
//                 to: emails,
//                 subject: 'Notification from Admin',
//                 text: message
//             };

//             transporter.sendMail(mailOptions, (error, info) => {
//                 if (error) {
//                     console.error('Error sending notifications:', error);
//                     return res.status(500).send('Error sending notifications');
//                 } else {
//                     console.log('Email sent: ' + info.response);
//                     return res.status(200).send('Notifications sent successfully');
//                 }
//             });
//         });
//     } catch (error) {
//         console.error('Error in try-catch block:', error);
//         res.status(500).send('Error sending notifications');
//     }
// });


// Create a plan
// Create a plan
const createPlan = (name, interval, amount) => {
    return new Promise((resolve, reject) => {
      const params = JSON.stringify({
        name,
        interval,
        amount
      });
  
      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/plan',
        method: 'POST',
        headers: {
          Authorization: 'Bearer sk_test_ba4382c256544e703a5e664af13f87cbd8fb885c',
          'Content-Type': 'application/json'
        }
      };
  
      const req = https.request(options, res => {
        let data = '';
  
        res.on('data', (chunk) => {
          data += chunk;
        });
  
        res.on('end', () => {
          console.log('Create Plan Response:', data);  // Log the response data
          const planResponse = JSON.parse(data);
          if (planResponse.status) {
            resolve(planResponse.data.plan_code);
          } else {
            reject('Failed to create plan');
          }
        });
      }).on('error', error => {
        reject(error);
      });
  
      console.log('Create Plan Request Params:', params);  // Log the request parameters
      req.write(params);
      req.end();
    });
  };
  
  // Initialize a transaction
  const initializeTransaction = (planCode, email, amount) => {
    return new Promise((resolve, reject) => {
      const params = JSON.stringify({
        email,
        amount,
        plan: planCode,
        callback_url: 'http://localhost:3000/verify'  // Set the URL where you want to redirect after success
      });
  
      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/transaction/initialize',
        method: 'POST',
        headers: {
          Authorization: 'Bearer sk_test_ba4382c256544e703a5e664af13f87cbd8fb885c',
          'Content-Type': 'application/json'
        }
      };
  
      const req = https.request(options, res => {
        let data = '';
  
        res.on('data', (chunk) => {
          data += chunk;
        });
  
        res.on('end', () => {
          console.log('Initialize Transaction Response:', data);  // Log the response data
          const response = JSON.parse(data);
          if (response.status) {
            resolve(response.data.authorization_url);  // Return the authorization URL
          } else {
            reject('Failed to initialize transaction');
          }
        });
      }).on('error', error => {
        reject(error);
      });
  
      console.log('Initialize Transaction Request Params:', params);  // Log the request parameters
      req.write(params);
      req.end();
    });
  };
  


app.get('/api/verify/:reference', async (req, res) => {
    const reference = req.params.reference;
    const userId = req.query.userId; // Access userId from query parameters
  
    // Log received request data
    console.log('Received Verification Request:', { reference, userId });
  
    if (!reference || !userId) {
      return res.status(400).json({ error: 'Reference and userId are required' });
    }
  
    try {
      // Function to verify transaction with Paystack
      const verifyTransaction = (reference) => {
        return new Promise((resolve, reject) => {
          const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: `/transaction/verify/${reference}`,
            method: 'GET',
            headers: {
              Authorization: 'Bearer sk_test_ba4382c256544e703a5e664af13f87cbd8fb885c'
            }
          };
  
          const request = https.request(options, paystackRes => {
            let data = '';
  
            paystackRes.on('data', chunk => {
              data += chunk;
            });
  
            paystackRes.on('end', () => {
              try {
                const result = JSON.parse(data);
                resolve(result);
              } catch (error) {
                reject(new Error('Error parsing response'));
              }
            });
          });
  
          request.on('error', error => {
            reject(new Error('Request error'));
          });
  
          request.end();
        });
      };
  
      const result = await verifyTransaction(reference);
  
      if (result.status === true && result.message === 'Verification successful') {
        console.log('Verification Successful:', result);  // Log successful verification result
  
        const transactionData = result.data;
  
        // Extract relevant data
        const {
          status,
          amount,
          created_at,
          customer: { customer_code, id: customerId }, // Extract customer id as customerId
          plan: paystackPlanId,
          plan_object: { name: plan_name },
          reference: paystackSubscriptionId
        } = transactionData;
  
        // Divide the amount by 100
        const amountInUnits = amount / 100;
  
        // Insert or update the subscription table
        const insertQuery = `
          INSERT INTO subscriptions (statuses, plan_name, amount, created_at, user_id, paystack_subscription_id, verification_id, customer_code)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          statuses = VALUES(statuses),
          plan_name = VALUES(plan_name),
          amount = VALUES(amount),
          created_at = VALUES(created_at),
          paystack_subscription_id = VALUES(paystack_subscription_id),
          customer_code = VALUES(customer_code)
        `;
  
        const verification_id = customerId; // Use customerId as verification_id
  
        await new Promise((resolve, reject) => {
          db.query(insertQuery, [status ? 1 : 0, plan_name, amountInUnits, created_at, userId, paystackSubscriptionId, verification_id, customer_code], (err, results) => {
            if (err) {
              console.error('Error inserting data:', err);
              reject(new Error('Error inserting data'));
            } else {
              console.log('Data inserted successfully:', results);
              resolve();
            }
          });
        });
  
        res.json(result);
      } else {
        res.status(400).json({ error: 'Verification failed' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Something went wrong' });
    }
  });
  
  
  // Insert subscription into the database
// const createSubscriptionInDatabase = (subscriptionData, userId) => {
//   return new Promise((resolve, reject) => {
//     const { status, plan_name, amount, createdAt, subscription_code } = subscriptionData;

//     // Ensure amount is a valid number
//     if (amount == null || isNaN(amount)) {
//       return reject('Invalid amount value');
//     }

//     // Convert amount to correct units (divide by 100)
//     const convertedAmount = amount / 100;

//     // Log the values to debug
//     console.log('Inserting Subscription Data:', {
//       status,
//       plan_name,
//       convertedAmount,
//       createdAt,
//       userId,
//       subscription_code
//     });

//     const query = `INSERT INTO subscriptions (statuses, plan_name, amount, created_at, user_id, paystack_subscription_id) VALUES (?, ?, ?, ?, ?, ?)`;
//     const values = [status === 'active', plan_name, convertedAmount, createdAt, userId, subscription_code];

//     db.query(query, values, (error, results) => {
//       if (error) {
//         reject('Error inserting subscription into database: ' + error.message);
//       } else {
//         resolve(results.insertId);
//       }
//     });
//   });
// };

  // Handle subscription and redirect
  app.post('/api/subscribe', async (req, res) => {
    const { email, amount, name, interval, userId } = req.body;
    console.log('Received Request Data:', req.body);  // Log the request data
  
    try {
      const planCode = await createPlan(name, interval, amount);
      console.log('Created Plan Code:', planCode);  // Log the created plan code
      
      const authorizationUrl = await initializeTransaction(planCode, email, amount);
      console.log('Authorization URL:', authorizationUrl);  // Log the authorization URL
      
    //   const userId = userId; // Replace with actual userId from your authentication logic
  
    //   const subscriptionData = {
    //     status: 'active',
    //     plan_name: name,
    //     amount: amount,
    //     createdAt: new Date(),
    //     subscription_code: planCode
    //   };
  
    //   await createSubscriptionInDatabase(subscriptionData, userId);
    //   console.log('Subscription successfully inserted into the database');
  
      res.json({ authorization_url: authorizationUrl });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Something went wrong' });
    }
  });
  
  // List subscriptions
  app.get('/api/subscriptions', (req, res) => {
    // Query to fetch subscriptions and user emails
    const sql = `
        SELECT
            s.id,
            s.statuses,
            s.plan_name,
            s.amount,
            s.created_at,
            s.user_id,
            s.paystack_subscription_id,
            s.verification_id,
            s.customer_code,
            u.email AS user_email
        FROM
            subscriptions s
        JOIN
            users u ON s.user_id = u.id
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error executing SQL query:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        // console.log('Subscriptions data:', results); // Log the data
        res.status(200).json(results); // Send data to frontend
    });
});
  // List transactions
  const listTransactions = () => {
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transaction',
      method: 'GET',
      headers: {
        Authorization: 'Bearer sk_test_ba4382c256544e703a5e664af13f87cbd8fb885c',
        'Content-Type': 'application/json'
      }
    };
  
    const req = https.request(options, res => {
      let data = '';
  
      res.on('data', chunk => {
        data += chunk;
      });
  
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
        //   console.log('List Transactions Response:', parsedData);  // Log the response data
  
          const transactions = parsedData.data;
          console.log('Total Transactions:', transactions.length);  // Log the total number of transactions
  
          transactions.forEach(transaction => {
            // console.log('Transaction:', transaction);
          });
        } catch (error) {
          console.error('Error parsing response data:', error);
        }
      });
    });
  
    req.on('error', error => {
      console.error('Error fetching transactions:', error);
    });
  
    req.end();
  };
  
  // Call the function to list subscriptions and transactions
//   listSubscriptions();
  listTransactions();

  
  app.post('/api/feedback', (req, res) => {
    const { userId, content = '', rating, roles } = req.body; // Default content to empty string
  
    if (!rating || !userId || !roles) {
      return res.status(400).json({ message: 'Rating and userId are required' });
    }
  
    // Insert feedback into the database
    const sql = `
      INSERT INTO feedback (userId, content, rating, role)
      VALUES (?, ?, ?, ?)
    `;
  
    db.query(sql, [userId, content, rating, roles], (err, results) => {
      if (err) {
        console.error('Error executing SQL query:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.status(201).json({ message: 'Feedback submitted successfully', feedbackId: results.insertId });
    });
  });
  
  

  //customer trip history 
  app.get('/customerTripHistory/:userId', (req, res) => {
    const userId = req.params.userId;
  
    const sql = `
      SELECT t.*, p.amount
      FROM trip t
      LEFT JOIN payment p ON t.id = p.tripId
      WHERE t.customerId = ? OR t.driverId = ?
    `;
  
    db.query(sql, [userId, userId], (err, results) => {
      if (err) {
        console.error('Error fetching trip history:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
  
      if (results.length === 0) {
        return res.status(404).json({ message: 'No trip history found' });
      }
  
      res.status(200).json(results);
    });
  });
  
  
  ////fetch on-going trip
  app.get('/api/trips/ongoing/:customerId', (req, res) => {
    const customerId = req.params.customerId;
  
    const sql = 'SELECT * FROM trip WHERE customerId = ? AND statuses = "on-going"';
    db.query(sql, [customerId], (err, result) => {
      if (err) {
        console.error('Error fetching ongoing trip:', err);
        return res.status(500).json({ error: 'An error occurred fetching ongoing trip' });
      }
      if (result.length === 0) {
        return res.status(404).json({ error: 'No ongoing trip found' });
      }
      res.json(result[0]);
    });
  });
  
  // Endpoint to update payment status
app.post('/api/update-payment-status', (req, res) => {
    const tripId = req.body.tripId;
    const paymentStatus = req.body.payment_status;

    // Validate input
    if (!tripId || paymentStatus === undefined) {
        return res.status(400).json({ error: "Missing tripId or payment_status" });
    }

    // SQL query to update payment status
    const updateQuery = "UPDATE trip SET payment_status = ? WHERE id = ?";
    const values = [paymentStatus, tripId];

    // Perform the update query
    db.query(updateQuery, values, (err, result) => {
        if (err) {
            console.error("Error occurred during updating payment status:", err);
            return res.status(500).json({ error: "An error occurred while updating payment status" });
        }

        // Check if any rows were affected
        if (result.affectedRows > 0) {
            return res.status(200).json({ message: "Payment status updated successfully" });
        } else {
            return res.status(404).json({ error: "Trip not found" });
        }
    });
});

// Get payment URL for a specific driver
app.get('/api/drivers/:driverId/payment-url', (req, res) => {
    const { driverId } = req.params;
    console.log('Fetching payment URL for driver ID:', driverId); // Log the driverId

    const sql = `
      SELECT URL_payment
      FROM driver
      WHERE users_id = ?
    `;

    db.query(sql, [driverId], (err, result) => {
      if (err) {
        console.error("Error fetching payment URL:", err);
        return res.status(500).json({ error: "An error occurred while fetching the payment URL" });
      }

      if (result.length === 0) {
        console.log('No driver found with ID:', driverId); // Log if no driver is found
        return res.status(404).json({ error: "No driver found with the given ID" });
      }

      console.log('Payment URL found:', result[0].URL_payment); // Log the found URL
      return res.status(200).json(result[0]); // Return the payment URL
    });
});

  
// Endpoint to update payment reference and trip payment status
app.post('/api/payment-success', (req, res) => {
    const { tripId, reference } = req.body;
    
    if (!tripId || !reference) {
        return res.status(400).json({ error: "Missing tripId or reference" });
    }

    const updatePaymentSql = `
        UPDATE payment
        SET payment_reference = ?
        WHERE tripId = ?
    `;
    
    const updateTripSql = `
        UPDATE trip
        SET payment_status = 'Yes'
        WHERE id = ?
    `;

    db.query(updatePaymentSql, [reference, tripId], (err, result) => {
        if (err) {
            console.error("Error updating payment reference:", err);
            return res.status(500).json({ error: "An error occurred while updating the payment reference" });
        }

        db.query(updateTripSql, [tripId], (err, result) => {
            if (err) {
                console.error("Error updating trip payment status:", err);
                return res.status(500).json({ error: "An error occurred while updating the trip payment status" });
            }

            return res.status(200).json({ message: "Payment reference and trip payment status updated successfully" });
        });
    });
});

// Setup the nodemailer transporter (define it globally)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'jntokozo195@gmail.com',
        pass: 'kcdabumoyiwrbpyg' // Use your actual email password or an app-specific password
    }
});

///send email
app.post('/api/send-email', async (req, res) => {
    const { role, message } = req.body;

    // Validate input
    if (!role || !message) {
        return res.status(400).send({ message: 'Role and message are required' });
    }

    // Query to get emails based on role
    const query = 'SELECT email FROM users WHERE role = ?';
    db.query(query, [role], async (err, results) => {
        if (err) {
            console.error('Error fetching emails:', err);
            return res.status(500).send({ message: 'Error fetching emails', success: false });
        }

        // Extract emails from results
        const emails = results.map(row => row.email);

        if (emails.length === 0) {
            return res.send({ message: 'No users found for this role', success: true });
        }

        console.log('Emails fetched:', emails);

        // Prepare promises for sending emails
        const sendMailPromises = emails.map(email => {
            const mailOptions = {
                from: 'jntokozo195@gmail.com',
                to: email,
                subject: 'Notification',
                text: message
            };

            // Insert into push_notifications table
            const insertQuery = 'INSERT INTO push_notifications (MessageTo, Message, DateSent) VALUES (?, ?, ?)';
            const dateSent = new Date().toISOString().slice(0, 19).replace('T', ' '); // Format as 'YYYY-MM-DD HH:MM:SS'
            db.query(insertQuery, [role, message, dateSent], (err) => {
                if (err) {
                    console.error('Error inserting notification:', err);
                }
            });

            return transporter.sendMail(mailOptions)
                .then(info => console.log(`Email sent to ${email}: ${info.response}`))
                .catch(error => console.error(`Error sending email to ${email}:`, error));
        });

        // Handle all promises and send response
        try {
            await Promise.all(sendMailPromises);
            res.send({ message: 'Emails sent and notifications recorded successfully', success: true });
        } catch (error) {
            console.error('Error sending emails:', error);
            res.status(500).send({ message: 'Error sending emails', success: false });
        }
    });
});

// Send OTP email function
const sendOtpEmail = (email, otp) => {
    const mailOptions = {
        from: 'jntokozo195@gmail.com',
        to: email,
        subject: 'Password Reset OTP',
        text: `Your OTP is: ${otp}`
    };

    // Use the global transporter instance
    return transporter.sendMail(mailOptions);
};
// Endpoint to retrieve notifications
app.get('/api/notifications', (req, res) => {
    const query = 'SELECT * FROM push_notifications ORDER BY DateSent DESC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching notifications:', err);
            return res.status(500).send({ message: 'Error fetching notifications', success: false });
        }
        res.send({ notifications: results, success: true });
    });
});


 // Generate OTP
 const generateOtp = () => crypto.randomInt(100000, 999999).toString();
  
// Endpoint to request password reset
app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
  
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
  
    try {
      // Insert OTP into database
      await new Promise((resolve, reject) => {
        db.query(
          `INSERT INTO passwordresets (email, otp, expires_at) 
           VALUES (?, ?, ?) 
           ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at)`,
          [email, otp, expiresAt],
          (err) => {
            if (err) {
              return reject(err);
            }
            resolve();
          }
        );
      });
      
  
      // Send OTP email
      await sendOtpEmail(email, otp);
  
      return res.status(200).json({ message: 'OTP sent to email' });
    } catch (err) {
      console.error('Error in /forgot-password:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  

   // Endpoint to verify OTP
   app.post('/verify-otp', (req, res) => {
    const { email, otp } = req.body;
  
    db.query('SELECT * FROM passwordresets WHERE email = ? AND otp = ? AND used = 0 AND expires_at > NOW()', [email, otp], (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      if (results.length > 0) {
        db.query('UPDATE passwordresets SET used = 1 WHERE email = ? AND otp = ?', [email, otp], (err) => {
          if (err) return res.status(500).json({ message: 'Database error' });
          res.status(200).json({ message: 'OTP verified successfully' });
        });
      } else {
        res.status(400).json({ message: 'Invalid or expired OTP' });
      }
    });
  });

   // Endpoint to reset password
   app.post('/reset-password', (req, res) => {
    const { email, newPassword } = req.body;
    // const hashedPassword = bcrypt.hashSync(newPassword, 8);
  
    db.query('UPDATE users SET password = ? WHERE email = ?', [newPassword, email], (err) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      res.status(200).json({ message: 'Password updated successfully' });
    });
  }); 


//update drivere state
app.post('/api/update-state', (req, res) => {
    const { userId, state } = req.body;

    if (state === 'offline') {
        // Update state and store the last online timestamp
        const query = 'UPDATE driver SET state = ?, last_online_timestamp = NOW() WHERE users_id = ?';
        db.query(query, ['offline', userId], (error, results) => {
            if (error) {
                console.error('Error updating state:', error); // Log error
                return res.status(500).send('Error updating state');
            }
            res.send({ success: true });
        });
    } else {
        // Calculate time difference if coming online
        db.query('SELECT last_online_timestamp, online_time FROM driver WHERE users_id = ?', [userId], (error, results) => {
            if (error) {
                console.error('Error fetching last online timestamp:', error); // Log error
                return res.status(500).send('Error fetching last online timestamp');
            }

            if (results.length === 0) {
                console.error('No results found for userId:', userId); // Log if no results
                return res.status(404).send('User not found');
            }

            const { last_online_timestamp, online_time } = results[0];
            const now = new Date();
            let additionalTimeInSeconds = 0;

            if (last_online_timestamp) {
                const lastOnlineDate = new Date(last_online_timestamp);
                const diffInMs = now - lastOnlineDate;
                additionalTimeInSeconds = Math.floor(diffInMs / 1000); // Convert to seconds
            }

            // Convert online_time to seconds
            const [storedHours, storedMinutes, storedSeconds] = online_time.split(':').map(Number);
            const totalStoredSeconds = (storedHours * 3600) + (storedMinutes * 60) + storedSeconds;

            // Add additional time to stored time
            const newTotalSeconds = totalStoredSeconds + additionalTimeInSeconds;

            // Convert newTotalSeconds back to HH:MM:SS
            const hours = Math.floor(newTotalSeconds / 3600);
            const minutes = Math.floor((newTotalSeconds % 3600) / 60);
            const seconds = newTotalSeconds % 60;
            const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            // Update the driver’s state and total online time
            const query = `
                UPDATE driver SET
                    state = ?,
                    online_time = ?,
                    last_online_timestamp = NOW()
                WHERE users_id = ?
            `;
            db.query(query, ['online', formattedTime, userId], (error, results) => {
                if (error) {
                    console.error('Error updating state:', error); // Log error
                    return res.status(500).send('Error updating state');
                }
                res.send({ success: true });
            });
        });
    }
});

  

//get the state time from the driver
app.get('/api/get-online-time/:userId', (req, res) => {
    const { userId } = req.params;
    
    db.query('SELECT online_time, last_online_timestamp, state FROM driver WHERE users_id = ?', [userId], (error, results) => {
        if (error) {
            return res.status(500).send('Error fetching online time');
        }
        
        const { online_time, last_online_timestamp, state } = results[0];
        res.send({ online_time, last_online_timestamp, state });
    });
});
//update drivers documents

app.put('/driver_documents/:id', upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'id_copy', maxCount: 1 },
    { name: 'police_clearance', maxCount: 1 },
    { name: 'pdp', maxCount: 1 }
]), (req, res) => {
    const driverId = req.params.id;
    const { photo, id_copy, police_clearance, pdp } = req.files;

    // Build the SQL query for updating documents
    const sql = `
        UPDATE driver 
        SET 
            photo = COALESCE(?, photo), 
            id_copy = COALESCE(?, id_copy),
            police_clearance = COALESCE(?, police_clearance),
            pdp = COALESCE(?, pdp)
        WHERE users_id = ?
    `;

    const values = [
        photo ? photo[0].filename : null,
        id_copy ? id_copy[0].filename : null,
        police_clearance ? police_clearance[0].filename : null,
        pdp ? pdp[0].filename : null,
        driverId
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error occurred while updating driver documents:", err);
            return res.status(500).json({ error: "An error occurred while updating driver documents" });
        }

        // Check if any rows were affected
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Driver not found or no changes made" });
        }

        return res.status(200).json({ message: "Driver documents updated successfully" });
    });
});

//insert disability information
app.post('/api/disability', async (req, res) => {
    const { customerId, have_disability, disability_type, additional_details } = req.body;
  
    try {
      const query = `
        INSERT INTO disability (user_id, have_disability, disability_type, additional_details)
        VALUES (?, ?, ?, ?)
      `;
      const values = [
        customerId, 
        have_disability === true ? 1 : 0, // Convert boolean to integer
        disability_type || null, // Handle case if no disability type is selected
        additional_details || null // Handle case if no additional details are provided
      ];
  
      await db.query(query, values);
  
      res.status(201).json({ message: 'Disability information saved successfully.' });
    } catch (error) {
      console.error('Error saving disability information:', error);
      res.status(500).json({ error: 'An error occurred while saving disability information.' });
    }
  });
  
  
// get profile pictures
  app.get('/api/get-profile-picture/:userId', (req, res) => {
    const userId = req.params.userId;

    const query = `SELECT profile_picture FROM users WHERE id = ?`;
    db.query(query, [userId], (err, result) => {
        if (err) {
            console.error('Error fetching profile picture:', err);
            return res.status(500).send({ error: 'Server error' });
        }

        if (result.length > 0) {
            res.send({ profile_picture: result[0].profile_picture });
        } else {
            res.status(404).send({ error: 'User not found' });
        }
    });
});

// Example Node.js Express endpoint
app.get('/api/trips/total', (req, res) => {
    // Query to count all rows in the trip table
    const query = 'SELECT COUNT(*) AS total_trips FROM trip';
    
    db.query(query, (err, result) => {
        if (err) {
            // Log the error and send a 500 status code if there's a server error
            console.error('Error fetching total number of trips:', err);
            return res.status(500).json({ error: 'Failed to fetch total number of trips' });
        }

        // Check if the result contains rows and extract the total_trips count
        if (result.length > 0) {
            const totalTrips = result[0].total_trips;
            res.json({ total_trips: totalTrips }); // Send the total_trips count as JSON response
        } else {
            // Handle the case where no rows are found
            console.error('No rows found for total trips');
            res.json({ total_trips: 0 }); // Return 0 if no trips are found
        }
    });
});

//fetch cancelled trips
app.get('/api/trips/cancelled', (req, res) => {
    // Query to count cancelled trips
    const query = 'SELECT COUNT(*) AS cancelled_trips FROM trip WHERE cancellation_reason IS NOT NULL';
    
    db.query(query, (err, result) => {
        if (err) {
            // Log the error and send a 500 status code if there's a server error
            console.error('Error fetching cancelled trips:', err);
            return res.status(500).json({ error: 'Failed to fetch cancelled trips' });
        }

        // Check if the result contains rows and extract the cancelled_trips count
        if (result.length > 0) {
            const cancelledTrips = result[0].cancelled_trips;
            res.json({ cancelled_trips: cancelledTrips }); // Send the cancelled_trips count as JSON response
        } else {
            // Handle the case where no rows are found
            console.error('No rows found for cancelled trips');
            res.json({ cancelled_trips: 0 }); // Return 0 if no cancelled trips are found
        }
    });
});

// Endpoint to fetch completed trips count
app.get('/api/trips/completed', (req, res) => {
    const query = 'SELECT COUNT(*) AS completed_trips FROM trip WHERE statuses = ?';
    const statusCompleted = 'completed'; // Adjust according to your status values
  
    db.query(query, [statusCompleted], (err, result) => {
      if (err) {
        console.error('Error fetching completed trips:', err);
        return res.status(500).send({ error: 'Server error' });
      }
  
      if (result.length > 0) {
        res.send({ completedTrips: result[0].completed_trips });
      } else {
        res.status(404).send({ error: 'No completed trips found' });
      }
    });
  });

  //Endpoint to fetch total revenue of all trips
  app.get('/api/trips/payments/total', (req, res) => {
    const query = 'SELECT SUM(amount) AS total_payment FROM payment';
  
    db.query(query, (err, result) => {
      if (err) {
        console.error('Error fetching total payments:', err);
        return res.status(500).send({ error: 'Server error' });
      }
  
      res.send({ total_payment: result[0].total_payment || 0 });
    });
  });


// Endpoint to fetch admins
app.get('/admins', (req, res) => {
    const query = "SELECT * FROM users WHERE role = 'admin'";

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching admins:', err);
            return res.status(500).json({ error: 'An error occurred while fetching admins.' });
        }
        res.status(200).json(results);
    });
});

  
//edit admin
app.put('/edit_admin/:adminId', (req, res) => {
    const adminId = req.params.adminId;
    const { name, lastName, email, phoneNumber, address, role, current_address, gender, profile_picture } = req.body;

    // Validate input
    if (!name || !lastName || !email || !phoneNumber || !address || !role) {
        return res.status(400).json({ error: "Required fields are missing." });
    }

    const updateAdminQuery = `
        UPDATE users
        SET name = ?, lastName = ?, email = ?, phoneNumber = ?, address = ?, role = ?, current_address = ?, gender = ?, profile_picture = ?
        WHERE id = ?
    `;

    db.query(updateAdminQuery, [name, lastName, email, phoneNumber, address, role, current_address, gender, profile_picture, adminId], (err, result) => {
        if (err) {
            console.error("Error updating admin:", err);
            return res.status(500).json({ error: "An error occurred while updating the admin" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Admin not found" });
        }

        return res.status(200).json({ message: "Admin successfully updated" });
    });
});


  
  // Delete Admin
  
  app.delete('/delete_admin/:adminId', (req, res) => {
    const adminId = req.params.adminId;
    const deleteAdminQuery = "DELETE FROM users WHERE id = ?";

    db.query(deleteAdminQuery, [adminId], (err, result) => {
        if (err) {
            console.error("Error deleting admin:", err);
            return res.status(500).json({ error: "An error occurred while deleting the admin" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Admin not found" });
        }

        return res.status(200).json({ message: "Admin successfully deleted" });
    });
});

// Add admin endpoint with file upload
app.post('/api/add-admin', upload.single('profile_picture'), async (req, res) => {
    const { name, lastName, email, phoneNumber, address, role, current_address, gender, password } = req.body;
    const profilePicture = req.file ? req.file.filename : null;

    // Insert the new admin into the database
    const query = `INSERT INTO users (name, lastName, email, phoneNumber, address, role, current_address, gender, profile_picture, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [name, lastName, email, phoneNumber, address, role, current_address, gender, profilePicture, password];

    db.query(query, values, async (err, result) => {
        if (err) {
            console.error('Error adding new admin:', err);
            return res.status(500).send({ error: 'Server error' });
        }

        // Send password email
        try {
            await sendPasswordEmail(email, password);
            res.status(201).send({ message: 'Admin added successfully and email sent!' });
        } catch (emailError) {
            console.error('Error sending password email:', emailError);
            res.status(500).send({ error: 'Admin added, but failed to send email' });
        }
    });
});

// Serve the uploaded profile pictures
app.use('/uploads', express.static('uploads'));


// Function to generate a random password
const generatePassword = () => {
    return crypto.randomBytes(8).toString('hex');
};

// Send password email
const sendPasswordEmail = (email, password) => {
    const mailOptions = {
        from: 'jntokozo195@gmail.com',
        to: email,
        subject: 'Your Admin Account Password',
        text: `Your password is: ${password}`
    };

    return transporter.sendMail(mailOptions);
};

  
//fetch the latest subscription
// Define the endpoint
app.get('/api/fetchsubscriptions', (req, res) => {
    // Adjust the query to join the subscriptions table with the users table
    const query = `
        SELECT 
            subscriptions.*, 
            users.name AS driverName, 
            users.email AS driverEmail 
        FROM 
            subscriptions 
        JOIN 
            users 
        ON 
            subscriptions.user_id = users.id
        ORDER BY 
            subscriptions.created_at DESC
    `;

    // Execute the query
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching subscriptions:', err);
            return res.status(500).json({ message: 'Error fetching subscriptions', success: false });
        }
        // Send the results with driver details included
        res.json({ subscriptions: results, success: true });
    });
});

//-------------------------------------------------------------------------------------------------------------------------

   // POST endpoint to handle card details submission
   app.post("/api/cards", (req, res) => {
    console.log("Request Body:", req.body);
  
    const { cardNumber, userId } = req.body;
  
    if (!cardNumber || !userId) {
      return res.status(400).json({ message: "Card number and user ID are required" });
    }
  
    // Additional validation can be added here
  
    const query = "INSERT INTO cards (card_number, user_id) VALUES (?, ?)";
    db.query(query, [cardNumber, userId], (err, result) => {
      if (err) {
        console.error("Error inserting card data:", err);
        return res.status(500).json({ message: "Database error" });
      }
      res.status(201).json({ message: "Card details saved successfully", cardId: result.insertId });
    });
  });
  
  
  
  

   // GET endpoint to retrieve saved cards (mocking user_id as 1 for this example)
// GET endpoint to retrieve saved cards
app.get("/api/cards", (req, res) => {
    const { userId } = req.query; // Get the userId from the query parameters

    if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
    }

    // Query to fetch card details for the specific user
    const query = "SELECT id, card_number FROM cards WHERE user_id = ?";
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error("Error fetching cards:", err);
            return res.status(500).json({ message: "Error fetching card data" });
        }
        res.status(200).json(results);
    });
});


// DELETE endpoint to delete a card by its ID
app.delete("/api/cards/:id", (req, res) => {
    const cardId = req.params.id;
  
    // Check if cardId is provided
    if (!cardId) {
      return res.status(400).json({ message: "Card ID is required" });
    }
  
    // Delete the card from the database
    const query = "DELETE FROM cards WHERE id = ?";
    db.query(query, [cardId], (err, result) => {
      if (err) {
        console.error("Error deleting card:", err);
        return res.status(500).json({ message: "Error deleting card" });
      }
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Card not found" });
      }
  
      res.status(200).json({ message: "Card deleted successfully" });
    });
  });
  
//-------------------------------------------------------------------------------------------------------------------------
//Get Wallet Balance
app.get('/balance', (req, res) => {
    const driverId = req.user.id;

    const query = `SELECT balance FROM wallets WHERE driver_id = ?`;

    db.query(query, [driverId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Internal server error' });
        if (results.length === 0) return res.status(404).json({ message: 'Wallet not found' });

        res.status(200).json({ balance: results[0].balance });
    });
});
//Credit Wallet (Add Funds)
app.post('/credit', (req, res) => {
    const driverId = req.user.id;
    const { amount } = req.body;

    const query = `
        INSERT INTO wallets (driver_id, balance)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE balance = balance + VALUES(balance)
    `;

    db.query(query, [driverId, amount], (err, results) => {
        if (err) return res.status(500).json({ message: 'Internal server error' });

        // Log the transaction
        const transactionQuery = `INSERT INTO transactions (wallet_id, type, amount) VALUES (?, 'credit', ?)`;
        db.query(transactionQuery, [results.insertId || driverId, amount], (err) => {
            if (err) return res.status(500).json({ message: 'Error logging transaction' });
            res.status(200).json({ message: 'Wallet credited successfully' });
        });
    });
});

//Debit Wallet (Deduct Funds)
app.post('/debit', (req, res) => {
    const driverId = req.user.id;
    const { amount } = req.body;

    const selectQuery = `SELECT id, balance FROM wallets WHERE driver_id = ?`;

    db.query(selectQuery, [driverId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Internal server error' });
        if (results.length === 0) return res.status(404).json({ message: 'Wallet not found' });

        const wallet = results[0];
        if (wallet.balance < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        const updateQuery = `UPDATE wallets SET balance = balance - ? WHERE id = ?`;
        db.query(updateQuery, [amount, wallet.id], (err) => {
            if (err) return res.status(500).json({ message: 'Internal server error' });

            // Log the transaction
            const transactionQuery = `INSERT INTO transactions (wallet_id, type, amount) VALUES (?, 'debit', ?)`;
            db.query(transactionQuery, [wallet.id, amount], (err) => {
                if (err) return res.status(500).json({ message: 'Error logging transaction' });
                res.status(200).json({ message: 'Wallet debited successfully', balance: wallet.balance - amount });
            });
        });
    });
});

// Assuming you're using Express.js
app.get('/driver-wallet/:id', (req, res) => {
    const driverId = req.params.id; // Changed from `driverId` to `id`

    const query = ` 
        SELECT t.id AS trip_id, t.requestDate, t.currentDate, t.pickUpLocation, t.dropOffLocation, 
               t.payment_status, p.id AS payment_id, p.amount, p.paymentDate, p.paymentType
        FROM trip t
        LEFT JOIN payment p ON t.id = p.tripId
        WHERE t.driverId = ?
        ORDER BY t.requestDate DESC, p.paymentDate DESC
    `;

    db.query(query, [driverId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Internal server error' });
        res.status(200).json({ transactions: results });
    });
});



//payment for trips
// API endpoint to initialize payment
// API endpoint to initialize payment
app.post('/api/paystack/initialize', async (req, res) => {
    const { email, amount, tripId } = req.body;

    console.log('Paystack Initialization Request Data:', req.body);

    if (!email || !amount || !tripId) {
        return res.status(400).json({ error: 'Email, amount, and tripId are required' });
    }

    const amountInKobo = Math.trunc(amount * 100);

    try {
        const paymentResponse = await initializePayment(email, amountInKobo, tripId);

        res.status(200).json({
            status: true,
            data: paymentResponse,
            tripId  // Include the tripId in the response
        });
    } catch (error) {
        console.error('Error initializing payment:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Function to initialize payment
const initializePayment = (email, amountInKobo, tripId) => {
    return new Promise((resolve, reject) => {
        const params = JSON.stringify({
            email: email,
            amount: amountInKobo,
            callback_url: `http://localhost:3000/verifyTrip?tripId=${tripId}` // Fixed callback URL
        });

        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: '/transaction/initialize',
            method: 'POST',
            headers: {
                Authorization: 'Bearer sk_test_ba4382c256544e703a5e664af13f87cbd8fb885c', // Replace with your actual secret key
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, res => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log('Initialize Payment Response:', data);
                const response = JSON.parse(data);
                if (response.status) {
                    resolve(response.data); // Return the Paystack data object
                } else {
                    reject('Failed to initialize payment');
                }
            });
        }).on('error', error => {
            reject(error);
        });

        console.log('Initialize Payment Request Params:', params);
        req.write(params);
        req.end();
    });
};




// API endpoint to verify trip payment
app.post('/api/verify/trip', async (req, res) => {
    console.log('Request Body:', req.body);

    const { reference, tripId } = req.body;

    console.log("tripId:", tripId, "reference:", reference);

    if (!reference || !tripId) {
        return res.status(400).json({ error: 'Reference and tripId are required' });
    }

    try {
        // Function to verify payment
        const verifyTripTransaction = (reference) => {
            return new Promise((resolve, reject) => {
                const options = {
                    hostname: 'api.paystack.co',
                    port: 443,
                    path: `/transaction/verify/${reference}`,
                    method: 'GET',
                    headers: {
                        Authorization: 'Bearer sk_test_ba4382c256544e703a5e664af13f87cbd8fb885c' // Replace with your actual secret key
                    }
                };

                const req = https.request(options, (res) => {
                    let data = '';

                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        try {
                            const result = JSON.parse(data);
                            resolve(result);
                        } catch (error) {
                            reject(new Error('Error parsing response'));
                        }
                    });
                });

                req.on('error', (error) => {
                    reject(new Error('Request error'));
                });

                req.end();
            });
        };

        // Call the verification function
        const result = await verifyTripTransaction(reference);

        if (result.status === true && result.data.status === 'success') {
            const transactionData = result.data;
            const { amount, created_at, reference: paystackReference } = transactionData;

            const amountInUnits = amount / 100;

            // Check if record already exists
            const checkQuery = `
                SELECT COUNT(*) as count
                FROM payment
                WHERE tripId = ? AND payment_reference = ?
            `;

            const existingRecord = await new Promise((resolve, reject) => {
                db.query(checkQuery, [tripId, paystackReference], (err, results) => {
                    if (err) {
                        console.error('Error checking existing records:', err);
                        reject(new Error('Error checking existing records'));
                    } else {
                        resolve(results[0].count);
                    }
                });
            });

            if (existingRecord > 0) {
                return res.status(400).json({ error: 'Transaction has already been recorded' });
            }

            const insertQuery = `
                INSERT INTO payment (tripId, paymentType, amount, paymentDate, payment_reference)
                VALUES (?, ?, ?, ?, ?)
            `;

            await new Promise((resolve, reject) => {
                db.query(insertQuery, [tripId, 'Card', amountInUnits, created_at, paystackReference], (err, results) => {
                    if (err) {
                        console.error('Error inserting data:', err);
                        reject(new Error('Error inserting data'));
                    } else {
                        console.log('Data inserted successfully:', results);
                        resolve();
                    }
                });
            });

            res.json({
                success: true,
                message: 'Verification successful',
                data: transactionData
            });
        } else {
            res.status(400).json({ error: 'Transaction status is not success' });
        }
    } catch (error) {
        console.error('Error verifying transaction:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});


// Endpoint to get card information by user_id
app.get('/api/cards/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId, 10);
  
    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }
  
    const selectQuery = 'SELECT card_number FROM cards WHERE user_id = ?';

    db.query(selectQuery, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Internal server error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'No card found for this user' });
        }

        // Send the card number(s) found for the user
        return res.status(200).json({ cards: results });
    });
});

app.put('/api/driver/update-location/:id', async (req, res) => {
    const driverId = parseInt(req.params.id, 10);
    const { current_lat, current_lng } = req.body;

    console.log(`Received request to update location for driver ID: ${driverId}`);
    console.log(`New latitude: ${current_lat}, New longitude: ${current_lng}`);

    // Validate driver ID
    if (isNaN(driverId)) {
        console.log('Invalid driver ID');
        return res.status(400).json({ error: 'Invalid driver ID' });
    }

    // Validate latitude and longitude
    if (typeof current_lat !== 'number' || typeof current_lng !== 'number') {
        console.log('Invalid latitude or longitude');
        return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    const updateQuery = 'UPDATE driver SET current_lat = ?, current_lng = ? WHERE id = ?';

    db.query(updateQuery, [current_lat, current_lng, driverId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        // Check if the update was successful
        if (results.affectedRows === 0) {
            console.log(`Driver with ID ${driverId} not found`);
            return res.status(404).json({ message: 'Driver not found' });
        }

        console.log(`Location updated successfully for driver ID ${driverId}`);
        
        // Send success response
        return res.status(200).json({ message: 'Location updated successfully' });
    });
});


// Endpoint to get drivers within 5 km of pickup location
app.get('/api/drivers/nearby', async (req, res) => {
    const { lat, lng } = req.query;

    // Validate latitude and longitude
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    const query = `
        SELECT id, photo, id_copy, gender, users_id, police_clearance, pdp, status, state, URL_payment, online_time, last_online_timestamp, car_inspection, current_lat, current_lng
        FROM driver
        WHERE (
            6371 * acos(
                cos(radians(?)) * cos(radians(current_lat)) * cos(radians(current_lng) - radians(?)) + sin(radians(?)) * sin(radians(current_lat))
            )
        ) <= 25;
    `;

    db.query(query, [lat, lng, lat], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        // Check if drivers were found
        if (results.length === 0) {
            return res.status(404).json({ message: 'No drivers found within 5 km' });
        }

        // Send the drivers found within the radius
        return res.status(200).json({ drivers: results });
    });
});

app.get('/driverDetails/:userId', (req, res) => {
    const userId = req.params.userId;

    if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
    }

    // SQL query to join users, driver, and car_listing tables to get the required details
    const sql = `
        SELECT 
            users.name, 
            users.lastName, 
            users.email, 
            users.gender, 
            users.profile_picture, 
            driver.photo, 
            car_listing.car_model, 
            car_listing.car_image, 
            car_listing.license_plate
        FROM users
        LEFT JOIN driver ON users.id = driver.users_id
        LEFT JOIN car_listing ON users.id = car_listing.userId
        WHERE users.id = ?`;

    // Execute the SQL query
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Error fetching driver details by user ID:", err);
            return res.status(500).json({ error: "An error occurred while fetching driver details" });
        }

        // Check if the user exists
        if (results.length === 0) {
            return res.status(404).json({ message: "User or driver details not found" });
        }

        // Return the user, driver, and car details
        return res.status(200).json(results[0]); // Return the first result as it should be unique by userId
    });
});





server.listen(8085, () => {
    console.log("Server is running ");
});