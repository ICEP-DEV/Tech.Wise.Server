const express = require('express');
const bodyParser = require('body-parser');
const tripRoutes = require('./routes/trips');
const subscriptionRoutes = require('./routes/subscription');
const register = require('./routes/register');
const driverDocumentsRoute = require("./routes/getDriverDocuments");
const carListing = require("./routes/carListing");
const Login = require('./routes/Login');
const customerDetails = require('./routes/customerDetails');
const customerPayments = require('./routes/customerPayments');
const cors = require('cors');
const path = require('path');
const pool = require('./config/config');  // Import MySQL pool
const { Server } = require('socket.io');
const http = require('http');
const { initializeSocket } = require("./config/socket"); // Import socket logic

const app = express();
const PORT = process.env.PORT || 3000; // Allow port configuration

// Middleware
app.use(cors());
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(bodyParser.json()); // Parse incoming JSON requests

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.ping(); // Check database connection
    connection.release();
    res.json({ status: "OK", message: "Database connected successfully" });
  } catch (error) {
    console.error("Database connection failed:", error);
    res.status(500).json({ status: "ERROR", message: "Database connection failed" });
  }
});

// Routes
app.use("/api", tripRoutes);
app.use("/api", subscriptionRoutes);
app.use("/api", register);
app.use("/api", driverDocumentsRoute);
app.use("/api", carListing);
app.use("/api", Login);
app.use("/api", customerPayments);
app.use("/api", customerDetails);

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const io = initializeSocket(server);
app.set("io", io); // Attach `io` to app for access in routes

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});