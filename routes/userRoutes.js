const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all routes
router.use(authMiddleware.protect);

// Favorites routes
router.get('/favorites', userController.getFavorites);
router.post('/favorites/:gigId', userController.addFavorite);
router.delete('/favorites/:gigId', userController.removeFavorite);

// Profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.get('/freelancer-profile', userController.getFreelancerProfile);
router.get('/client-profile', userController.getClientProfile);

module.exports = router;
