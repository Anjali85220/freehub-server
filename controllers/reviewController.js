const asyncHandler = require('express-async-handler');
const Review = require('../models/Review');
const ErrorResponse = require('../utils/errorResponse');

// @desc Post a review for a gig
// @route POST /api/reviews
// @access Private
exports.postReview = asyncHandler(async (req, res, next) => {
  const { rating, comment, gigId } = req.body;
  if (!rating || !comment || !gigId) {
    return next(new ErrorResponse('Rating, comment, and gigId are required', 400));
  }

  const review = await Review.create({
    rating,
    comment,
    userId: req.user._id,
    gigId,
  });

  res.status(201).json({ success: true, data: review });
});

// @desc Get reviews for a gig
// @route GET /api/reviews/:gigId
// @access Public
exports.getReviewsByGig = asyncHandler(async (req, res, next) => {
  const { gigId } = req.params;

  const reviews = await Review.find({ gigId }).populate('userId', 'name');

  res.status(200).json({ success: true, data: reviews });
});
