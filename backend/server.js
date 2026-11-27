const app = require('./app');
const config = require('./config');
const database = require('./database/Database');

async function start() {
    await database.connect();
    app.listen(config.port, () => {
        console.log(`Hotel booking app listening on http://localhost:${config.port}`);
    });
}

if (require.main === module) {
    start().catch((error) => {
        console.error('Unable to start the hotel booking app:', error);
        process.exitCode = 1;
    });
}

module.exports = { app, start };
