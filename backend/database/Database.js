const mongoose = require('mongoose');
const config = require('../config');

class Database {
    async connect() {
        await mongoose.connect(config.mongoUri);
        console.log('Connected to MongoDB.');
    }

    async disconnect() {
        await mongoose.disconnect();
    }
}

module.exports = new Database();
