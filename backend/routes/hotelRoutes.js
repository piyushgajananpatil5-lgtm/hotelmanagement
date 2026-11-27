const express = require('express');
const HotelController = require('../controllers/HotelController');
const { authenticate, requireHotelAdmin } = require('../middleware/auth');

const router = express.Router();
const hotelController = new HotelController();

router.get('/cities', hotelController.listCities);
router.get('/availability', hotelController.getAvailability);
router.post('/setup/hotel-admin', hotelController.setupAdmin);
router.get('/admin/hotels', authenticate, requireHotelAdmin, hotelController.listMyHotels);
router.patch('/admin/hotels/:hotelId', authenticate, requireHotelAdmin, hotelController.updateMyHotel);

module.exports = router;
