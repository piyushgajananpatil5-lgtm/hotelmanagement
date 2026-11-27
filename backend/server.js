const app = require('./app');
const config = require('./config');
const database = require('./database/Database');

// Connects to MongoDB before accepting requests.
async function start() {
    await database.connect();
    app.listen(config.port, () => {
        console.log(`Hotel booking app listening on http://localhost:${config.port}`);
    });
}

// Starts the server only when this file is run directly.
if (require.main === module) {
    start().catch((error) => {
        console.error('Unable to start the hotel booking app:', error);
        process.exitCode = 1;
    });
}

module.exports = { app, start };
