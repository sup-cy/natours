const express = require('express');
const {
  getOverview,
  getTour,
  getLoginForm,
  getAccount,
  updateUserDate,
  getMyTours,
} = require('../controllers/viewController');
const { isLoggedIn, protect } = require('../controllers/authController');
const { alert } = require('../controllers/viewController');
//const { createBookingCheckout } = require('../controllers/bookingController');
const router = express.Router();
router.use(alert);
router.get('/', isLoggedIn, getOverview);
router.get('/tour/:slug', isLoggedIn, getTour);
router.get('/login', isLoggedIn, getLoginForm);
router.get('/me', protect, getAccount);
router.post('/submit-user-data', protect, updateUserDate);
router.get('/my-tour', protect, getMyTours);
module.exports = router;
