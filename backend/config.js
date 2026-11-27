const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const config = {
    port: Number(process.env.PORT) || 3000,
    mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hotel_booking',
    jwtSecret: process.env.JWT_SECRET,
    setupToken: process.env.SETUP_TOKEN
};

if (!config.jwtSecret || Buffer.byteLength(config.jwtSecret, 'utf8') < 32) {
    throw new Error('Set JWT_SECRET to a random value at least 32 bytes long in .env.');
}

module.exports = config;
