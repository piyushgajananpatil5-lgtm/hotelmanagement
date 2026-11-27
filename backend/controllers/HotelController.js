const crypto = require('node:crypto');
const City = require('../models/City');
const User = require('../models/User');
const config = require('../config');
const {
    bookedForDate,
    createToken,
    httpError,
    isValidObjectId,
    publicHotel,
    publicUser,
    requiredText,
    validateBookingDate,
    validateEmail,
    validatePassword,
    validateSlots
} = require('../utils/validation');

// Handles hotel setup, public listings, availability, and admin updates.
class HotelController {
    constructor() {
        // Keeps controller methods bound when Express uses them as handlers.
        this.setupAdmin = this.setupAdmin.bind(this);
        this.listCities = this.listCities.bind(this);
        this.getAvailability = this.getAvailability.bind(this);
        this.listMyHotels = this.listMyHotels.bind(this);
        this.updateMyHotel = this.updateMyHotel.bind(this);
    }

    // Creates an administrator and their first hotel using the private setup token.
    async setupAdmin(req, res) {
        if (!config.setupToken) {
            throw httpError(503, 'Hotel administrator setup is disabled. Configure SETUP_TOKEN in .env.');
        }

        // Compare tokens safely before allowing a new admin account to be created.
        const suppliedToken = req.get('x-setup-token') || '';
        const expected = Buffer.from(config.setupToken);
        const supplied = Buffer.from(suppliedToken);
        if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
            throw httpError(403, 'Invalid setup token.');
        }

        const name = requiredText(req.body.name, 'Admin name', 100);
        const email = validateEmail(req.body.email);
        const password = req.body.password;
        validatePassword(password);
        const cityName = requiredText(req.body.cityName, 'City name', 100);
        const hotelName = requiredText(req.body.hotelName, 'Hotel name', 120);
        const address = requiredText(req.body.address, 'Hotel address', 300);
        const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
        if (description.length > 2000) {
            throw httpError(400, 'Hotel description must be at most 2000 characters.');
        }
        const slots = validateSlots(req.body.slots);

        // Add the hotel to its city and remove the user if the hotel setup fails.
        const user = await User.create({ name, email, passwordHash: password, role: 'hotelAdmin' });
        try {
            const city = await City.findOneAndUpdate(
                { name: cityName },
                {
                    $setOnInsert: { name: cityName },
                    $push: { hotels: { name: hotelName, description, address, adminId: user._id, slots } }
                },
                { upsert: true, new: true, runValidators: true }
            );
            const hotel = city.hotels.find((item) => item.adminId.equals(user._id));
            res.status(201).json({
                token: createToken(user),
                user: publicUser(user),
                hotel: publicHotel(city, hotel)
            });
        } catch (error) {
            await User.deleteOne({ _id: user._id });
            throw error;
        }
    }

    // Returns all cities, hotels, and per-day slot availability for the public page.
    async listCities(req, res) {
        const date = req.query.date ? validateBookingDate(req.query.date) : undefined;
        const cities = await City.find().sort({ name: 1 }).lean();
        const result = cities.map((city) => ({
            id: String(city._id),
            name: city.name,
            hotels: (city.hotels || []).map((hotel) => ({
                id: String(hotel._id),
                name: hotel.name,
                description: hotel.description,
                address: hotel.address,
                slots: (hotel.slots || []).map((slot) => ({
                    id: String(slot._id),
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    capacity: slot.capacity,
                    booked: bookedForDate(slot.dailyBookings, date),
                    available: slot.capacity - bookedForDate(slot.dailyBookings, date),
                    price: slot.price
                }))
            }))
        }));
        res.json(result);
    }

    // Looks up the available capacity for one hotel slot on a chosen date.
    async getAvailability(req, res) {
        const { cityId, hotelId, slotId } = req.query;
        const date = validateBookingDate(req.query.date);
        if (!isValidObjectId(cityId) || !isValidObjectId(hotelId) || !isValidObjectId(slotId)) {
            throw httpError(400, 'Choose a valid city, hotel, and time slot.');
        }

        const city = await City.findById(cityId);
        const hotel = city && city.hotels.id(hotelId);
        const slot = hotel && hotel.slots.id(slotId);
        if (!city || !hotel || !slot) {
            throw httpError(404, 'That hotel or time slot is no longer available.');
        }

        const booked = bookedForDate(slot.dailyBookings, date);
        res.json({ date, capacity: slot.capacity, booked, available: slot.capacity - booked });
    }

    // Lists only the hotels assigned to the signed-in administrator.
    async listMyHotels(req, res) {
        const cities = await City.find({ 'hotels.adminId': req.user._id });
        const hotels = [];

        for (const city of cities) {
            for (const hotel of city.hotels) {
                if (hotel.adminId.equals(req.user._id)) {
                    hotels.push(publicHotel(city, hotel));
                }
            }
        }
        res.json({ hotels });
    }

    // Updates hotel details only after confirming that the admin owns the hotel.
    async updateMyHotel(req, res) {
        if (!isValidObjectId(req.params.hotelId)) {
            throw httpError(400, 'Invalid hotel id.');
        }

        const city = await City.findOne({
            'hotels._id': req.params.hotelId,
            'hotels.adminId': req.user._id
        });
        const hotel = city && city.hotels.id(req.params.hotelId);
        if (!city || !hotel || !hotel.adminId.equals(req.user._id)) {
            throw httpError(404, 'You do not manage that hotel.');
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
            hotel.name = requiredText(req.body.name, 'Hotel name', 120);
        }
        if (Object.prototype.hasOwnProperty.call(req.body, 'description')) {
            if (typeof req.body.description !== 'string' || req.body.description.length > 2000) {
                throw httpError(400, 'Description must be at most 2000 characters.');
            }
            hotel.description = req.body.description.trim();
        }
        if (Object.prototype.hasOwnProperty.call(req.body, 'address')) {
            hotel.address = requiredText(req.body.address, 'Hotel address', 300);
        }
        if (Object.prototype.hasOwnProperty.call(req.body, 'slots')) {
            hotel.slots = validateSlots(req.body.slots, hotel.slots);
        }

        await city.save();
        res.json({ hotel: publicHotel(city, hotel) });
    }
}

module.exports = HotelController;
