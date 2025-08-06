const express = require('express');
const router = express.Router();
const {
  sendOrderMessage,
  getOrderMessages,
  getOrderConversations,
  markMessagesAsRead
} = require('../controllers/orderChatController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// Order chat routes
router.route('/:orderId/messages')
  .post(sendOrderMessage)
  .get(getOrderMessages);

router.route('/conversations')
  .get(getOrderConversations);

router.route('/:orderId/messages/read')
  .put(markMessagesAsRead);

module.exports = router;
