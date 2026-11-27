const path = require('node:path');
const express = require('express');
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const hotelRoutes = require('./routes/hotelRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const mongoose = require('mongoose');

const app = express();

// Parses API request bodies and serves the browser files from public/.
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.resolve(__dirname, '..', 'public')));

// Lets the browser confirm that the app and MongoDB are available.
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Connects each group of API endpoints to its route file.
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api', hotelRoutes);

// Handles unknown URLs and formats errors from all routes.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
