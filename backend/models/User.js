const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const bookingSchema = new mongoose.Schema({
    cityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    cityName: { type: String, required: true },
    hotelId: { type: mongoose.Schema.Types.ObjectId, required: true },
    hotelName: { type: String, required: true },
    slotId: { type: mongoose.Schema.Types.ObjectId, required: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    guests: { type: Number, min: 1, max: 50, required: true },
    price: { type: Number, min: 0, required: true },
    createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'hotelAdmin'], default: 'user', required: true },
    bookings: { type: [bookingSchema], default: [] }
}, { timestamps: true });

userSchema.pre('save', async function () {
    if (this.isModified('passwordHash')) {
        this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
