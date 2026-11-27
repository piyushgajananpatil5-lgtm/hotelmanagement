const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    capacity: { type: Number, min: 1, max: 500, required: true },
    dailyBookings: { type: Map, of: { type: Number, min: 0 }, default: () => new Map() },
    price: { type: Number, min: 0, required: true }
});

const hotelSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 2000 },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    slots: { type: [slotSchema], default: [] }
});

const citySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
    hotels: { type: [hotelSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.models.City || mongoose.model('City', citySchema);
