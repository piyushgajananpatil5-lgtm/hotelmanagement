const City = require('../models/City');
const User = require('../models/User');
const {
    bookedForDate,
    httpError,
    isValidObjectId,
    validateBookingDate
} = require('../utils/validation');

class BookingController {
    constructor() {
        this.create = this.create.bind(this);
    }

    async create(req, res) {
        if (req.user.role !== 'user') {
            throw httpError(403, 'Hotel administrator accounts cannot make guest bookings.');
        }

        const { cityId, hotelId, slotId, date } = req.body;
        const guests = Number(req.body.guests);
        if (!isValidObjectId(cityId) || !isValidObjectId(hotelId) || !isValidObjectId(slotId)) {
            throw httpError(400, 'Choose a valid city, hotel, and time slot.');
        }
        validateBookingDate(date);
        if (!Number.isInteger(guests) || guests < 1 || guests > 50) {
            throw httpError(400, 'Guests must be a whole number between 1 and 50.');
        }

        const city = await City.findById(cityId);
        const hotel = city && city.hotels.id(hotelId);
        const slot = hotel && hotel.slots.id(slotId);
        if (!city || !hotel || !slot) {
            throw httpError(404, 'That hotel or time slot is no longer available.');
        }

        const booked = bookedForDate(slot.dailyBookings, date);
        if (slot.capacity - booked < guests) {
            throw httpError(409, 'There are not enough places left in that time slot.');
        }

        const dailyPath = `dailyBookings.${date}`;
        const update = await City.updateOne(
            {
                _id: city._id,
                hotels: {
                    $elemMatch: {
                        _id: hotel._id,
                        slots: {
                            $elemMatch: {
                                _id: slot._id,
                                capacity: slot.capacity,
                                $or: [
                                    { [dailyPath]: { $exists: false } },
                                    { [dailyPath]: { $lte: slot.capacity - guests } }
                                ]
                            }
                        }
                    }
                }
            },
            { $inc: { [`hotels.$[hotel].slots.$[slot].${dailyPath}`]: guests } },
            { arrayFilters: [{ 'hotel._id': hotel._id }, { 'slot._id': slot._id }] }
        );
        if (update.modifiedCount !== 1) {
            throw httpError(409, 'That time slot just filled up. Please choose another.');
        }

        const booking = {
            cityId: city._id,
            cityName: city.name,
            hotelId: hotel._id,
            hotelName: hotel.name,
            slotId: slot._id,
            date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            guests,
            price: slot.price
        };
        try {
            const saved = await User.updateOne({ _id: req.user._id }, { $push: { bookings: booking } });
            if (saved.modifiedCount !== 1) {
                throw httpError(404, 'Your account could not be found.');
            }
        } catch (error) {
            await City.updateOne(
                { _id: city._id, 'hotels._id': hotel._id, 'hotels.slots._id': slot._id },
                { $inc: { [`hotels.$[hotel].slots.$[slot].${dailyPath}`]: -guests } },
                { arrayFilters: [{ 'hotel._id': hotel._id }, { 'slot._id': slot._id }] }
            );
            throw error;
        }

        res.status(201).json({ booking });
    }
}

module.exports = BookingController;
