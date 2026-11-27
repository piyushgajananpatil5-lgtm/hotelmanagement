const express = require('express');
const BookingController = require('../controllers/BookingController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const bookingController = new BookingController();

router.post('/', authenticate, bookingController.create);

module.exports = router;
