const Review = require('../models/reviewModel');
//const AppErroe = require('../utils/appErroe');
//const catchAsync = require('../utils/catchAsync');
const {
  deleteOne,
  updataOne,
  createOne,
  getOne,
  getAll,
} = require('./handleFactory');

exports.getAllReview = getAll(Review);

exports.setTourUserIds = (req, res, next) => {
  //Allow nested routes
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};
exports.getReview = getOne(Review);
exports.createReview = createOne(Review);
exports.deleteReview = deleteOne(Review);
exports.updateReview = updataOne(Review);
