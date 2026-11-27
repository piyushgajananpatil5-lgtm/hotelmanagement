const path = require('node:path');
const express = require('express');
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const hotelRoutes = require('./routes/hotelRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const mongoose = require('mongoose');

const app = express();

app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.resolve(__dirname, '..', 'public')));

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api', hotelRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
