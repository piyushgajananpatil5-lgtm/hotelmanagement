const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('../config');

// Creates an error with an HTTP status for the shared error handler.
function httpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

// Checks that a required text value is present and within its length limit.
function requiredText(value, label, maxLength) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
        throw httpError(400, `${label} is required and must be at most ${maxLength} characters.`);
    }
    return value.trim();
}

// Applies the password length rules used by the account forms.
function validatePassword(password) {
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
        throw httpError(400, 'Password must be at least 8 characters and no more than 72 bytes.');
    }
}

// Trims and normalizes an email address before checking its format.
function validateEmail(email) {
    const value = requiredText(email, 'Email', 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw httpError(400, 'Enter a valid email address.');
    }
    return value;
}

// Validates time slot values and preserves existing daily booking counts.
function validateSlots(slots, existingSlots) {
    if (!Array.isArray(slots) || slots.length < 1 || slots.length > 100) {
        throw httpError(400, 'Provide between 1 and 100 time slots.');
    }

    return slots.map((slot) => {
        const startTime = requiredText(slot.startTime, 'Slot start time', 5);
        const endTime = requiredText(slot.endTime, 'Slot end time', 5);
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)
            || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)
            || startTime >= endTime) {
            throw httpError(400, 'Slot times must use HH:mm format and end after they start.');
        }

        const capacity = Number(slot.capacity);
        const price = Number(slot.price);
        if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500
            || !Number.isFinite(price) || price < 0 || price > 1000000) {
            throw httpError(400, 'Slot capacity must be 1-500 and price must be non-negative.');
        }

        const oldSlot = slot._id && existingSlots ? existingSlots.id(slot._id) : null;
        const dailyBookings = oldSlot ? Object.fromEntries(oldSlot.dailyBookings) : {};
        if (Object.values(dailyBookings).some((booked) => capacity < booked)) {
            throw httpError(409, 'Capacity cannot be lower than existing bookings on any date.');
        }

        return {
            ...(oldSlot ? { _id: oldSlot._id, dailyBookings } : {}),
            startTime,
            endTime,
            capacity,
            price
        };
    });
}

// Creates the signed-in user's JSON web token.
function createToken(user) {
    return jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: '8h' });
}

// Returns the fields that are safe to send to the browser.
function publicUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        bookings: user.bookings || []
    };
}

// Reads the number of guests already booked for a particular date.
function bookedForDate(dailyBookings, date) {
    if (!date || !dailyBookings) return 0;
    return typeof dailyBookings.get === 'function'
        ? dailyBookings.get(date) || 0
        : dailyBookings[date] || 0;
}

// Ensures a booking date is a real calendar date and is not in the past.
function validateBookingDate(date) {
    const parsedDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? new Date(`${date}T00:00:00.000Z`)
        : null;
    if (!parsedDate || Number.isNaN(parsedDate.getTime())
        || parsedDate.toISOString().slice(0, 10) !== date
        || date < new Date().toISOString().slice(0, 10)) {
        throw httpError(400, 'Choose a valid booking date that is today or later.');
    }
    return date;
}

// Builds the hotel response used by public and admin pages.
function publicHotel(city, hotel, date) {
    return {
        id: hotel.id,
        name: hotel.name,
        description: hotel.description,
        address: hotel.address,
        cityId: city.id,
        cityName: city.name,
        slots: hotel.slots.map((slot) => ({
            id: slot.id,
            startTime: slot.startTime,
            endTime: slot.endTime,
            capacity: slot.capacity,
            booked: bookedForDate(slot.dailyBookings, date),
            available: slot.capacity - bookedForDate(slot.dailyBookings, date),
            price: slot.price
        }))
    };
}

module.exports = {
    httpError,
    requiredText,
    validatePassword,
    validateEmail,
    validateSlots,
    createToken,
    publicUser,
    bookedForDate,
    validateBookingDate,
    publicHotel,
    isValidObjectId: mongoose.isValidObjectId
};
