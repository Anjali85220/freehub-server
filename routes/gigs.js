const express = require('express');
const router = express.Router();
const gigController = require('../controllers/gigController');
const authMiddleware = require('../middleware/authMiddleware');
const { uploadMultiple } = require('../config/multer');

// Public routes (no authentication needed)
router.get('/public', gigController.getPublicGigs); // For client browsing
router.get('/public/:id', gigController.getPublicGig); // Single gig view
router.get('/public/categories', gigController.getCategories); // Categories list

// Protect all routes from this point
router.use(authMiddleware.protect);

// Authenticated user routes
router.get('/user/my-gigs', gigController.getUserGigs);
router.get('/user/my-gigs/stats', gigController.getGigStats);
router.post('/', uploadMultiple, gigController.createGig);
router.put('/:id', uploadMultiple, gigController.updateGig);
router.delete('/:id', gigController.deleteGig);
router.patch('/:id/status', gigController.updateGigStatus);
router.get('/:id', gigController.getSingleGig);

module.exports = router;