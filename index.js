const express = require('express');
const bodyParser = require('body-parser');
const tripRoutes = require('./routes/trips');
const subscriptionRoutes = require('./routes/subscription');
const register = require('./routes/register');
const driverDocumentsRoute = require("./routes/getDriverDocuments");
const carListing = require("./routes/carListing");
const Login = require('./routes/Login');
const customerPayments = require('./routes/customerPayments');
// const subscriptionReference = require('./routes/subscriptionReference');
const cors = require('cors');
const path = require('path');
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json()); // Parse incoming JSON requests

// Routes
app.use("/api", tripRoutes);
app.use("/api", subscriptionRoutes);
app.use("/api", register);
app.use("/api", driverDocumentsRoute);
app.use("/api", carListing);
app.use("/api", Login);
app.use("/api", customerPayments);
// app.use("/api", subscriptionReference);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
