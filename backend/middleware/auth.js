const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const { httpError } = require('../utils/validation');

// Checks a bearer token and attaches its account to the request.
async function authenticate(req, res, next) {
    try {
        const header = req.get('authorization') || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : '';
        if (!token) {
            throw httpError(401, 'Sign in to continue.');
        }

        const payload = jwt.verify(token, config.jwtSecret);
        const user = await User.findById(payload.sub);
        if (!user) {
            throw httpError(401, 'Your account is no longer available. Please sign in again.');
        }
        req.user = user;
        next();
    } catch (error) {
        next(error.status ? error : httpError(401, 'Invalid or expired session. Please sign in again.'));
    }
}

// Blocks hotel-management routes for accounts without the admin role.
function requireHotelAdmin(req, res, next) {
    if (req.user.role !== 'hotelAdmin') {
        return next(httpError(403, 'Only hotel administrators can manage hotel details.'));
    }
    next();
}

module.exports = { authenticate, requireHotelAdmin };
