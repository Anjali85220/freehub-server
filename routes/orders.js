const express = require('express');
const router = express.Router();
const { 
  createOrder, 
  createOrders, 
  getMyOrders, 
  getOrderById, 
  updateOrderStatus, 
  getFreelancerOrders,
  acceptOrder,
  rejectOrder,
  getNotifications,
  markNotificationAsRead,
  getUnreadNotificationCount
} = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

// Protected routes
router.post('/create-order', protect, createOrder);
router.post('/create-orders', protect, createOrders);
router.get('/my-orders', protect, getMyOrders);
router.get('/freelancer-orders', protect, getFreelancerOrders);
router.get('/:orderId', protect, getOrderById);
router.patch('/:orderId/status', protect, updateOrderStatus);

// New accept/reject endpoints
router.patch('/:orderId/accept', protect, acceptOrder);
router.patch('/:orderId/reject', protect, rejectOrder);

// Notification endpoints
router.get('/notifications', protect, getNotifications);
router.patch('/notifications/:notificationId/read', protect, markNotificationAsRead);
router.get('/notifications/unread-count', protect, getUnreadNotificationCount);

module.exports = router;
