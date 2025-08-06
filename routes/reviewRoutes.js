const express = require('express');
const router = express.Router();
const { postReview, getReviewsByGig } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, postReview);
router.get('/:gigId', getReviewsByGig);

module.exports = router;
