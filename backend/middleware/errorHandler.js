const { httpError } = require('../utils/validation');

// Sends a consistent not-found error for unmatched routes.
function notFound(req, res, next) {
    next(httpError(404, 'Route not found.'));
}

// Converts validation, database, and application errors into JSON responses.
function errorHandler(error, req, res, next) {
    if (error.code === 11000) {
        return res.status(409).json({ error: 'An account or city with that value already exists.' });
    }
    if (error.name === 'ValidationError' || error.name === 'CastError') {
        return res.status(400).json({ error: error.message });
    }

    const status = error.status || 500;
    if (status >= 500) {
        console.error(error);
    }
    res.status(status).json({ error: status >= 500 ? 'An unexpected server error occurred.' : error.message });
}

module.exports = { notFound, errorHandler };
