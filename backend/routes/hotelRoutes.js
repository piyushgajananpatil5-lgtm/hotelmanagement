const express = require('express');
const HotelController = require('../controllers/HotelController');
const { authenticate, requireHotelAdmin } = require('../middleware/auth');

const router = express.Router();
const hotelController = new HotelController();

// Public routes used to browse cities and check slot availability.
router.get('/cities', hotelController.listCities);
router.get('/availability', hotelController.getAvailability);

// The operator token protects creation of hotel-admin accounts.
router.post('/setup/hotel-admin', hotelController.setupAdmin);

// Hotel management requires both a valid session and the hotel-admin role.
router.get('/admin/hotels', authenticate, requireHotelAdmin, hotelController.listMyHotels);
router.patch('/admin/hotels/:hotelId', authenticate, requireHotelAdmin, hotelController.updateMyHotel);

module.exports = router;
