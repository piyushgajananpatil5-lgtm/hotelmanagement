const mongoose = require('mongoose');
const config = require('../config');

// Keeps the MongoDB connection steps in one reusable place.
class Database {
    // Opens a connection using the URI from the app configuration.
    async connect() {
        await mongoose.connect(config.mongoUri);
        console.log('Connected to MongoDB.');
    }

    // Closes the connection when a script or test is finished.
    async disconnect() {
        await mongoose.disconnect();
    }
}

module.exports = new Database();
