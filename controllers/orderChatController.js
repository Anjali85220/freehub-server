const asyncHandler = require('express-async-handler');
const OrderMessage = require('../models/OrderMessage');
const Order = require('../models/Order');
const ErrorResponse = require('../utils/errorResponse');

// @desc Send a message for an order
// @route POST /api/order-chat/:orderId/messages
// @access Private
exports.sendOrderMessage = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return next(new ErrorResponse('Content is required', 400));
  }

  // Verify the order exists and user is authorized
  const order = await Order.findById(orderId);
  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  // Check if user is part of this order (either client or freelancer)
  const isAuthorized = order.client.toString() === req.user._id.toString() || 
                      order.freelancer.toString() === req.user._id.toString();
  
  if (!isAuthorized) {
    return next(new ErrorResponse('Not authorized to chat in this order', 403));
  }

  // Determine receiver
  const receiverId = order.client.toString() === req.user._id.toString() 
    ? order.freelancer 
    : order.client;

  const message = await OrderMessage.create({
    order: orderId,
    sender: req.user._id,
    receiver: receiverId,
    content: content.trim(),
  });

  // Populate sender and receiver details
  await message.populate([
    { path: 'sender', select: 'name avatar' },
    { path: 'receiver', select: 'name avatar' }
  ]);

  res.status(201).json({ 
    success: true, 
    data: message 
  });
});

// @desc Get messages for an order
// @route GET /api/order-chat/:orderId/messages
// @access Private
exports.getOrderMessages = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;

  // Verify the order exists and user is authorized
  const order = await Order.findById(orderId);
  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  // Check if user is part of this order
  const isAuthorized = order.client.toString() === req.user._id.toString() || 
                      order.freelancer.toString() === req.user._id.toString();
  
  if (!isAuthorized) {
    return next(new ErrorResponse('Not authorized to view messages for this order', 403));
  }

  const messages = await OrderMessage.find({ order: orderId })
    .populate([
      { path: 'sender', select: 'name avatar' },
      { path: 'receiver', select: 'name avatar' }
    ])
    .sort({ timestamp: 1 });

  res.status(200).json({ 
    success: true, 
    data: messages,
    count: messages.length
  });
});

// @desc Get order chat list for user
// @route GET /api/order-chat/conversations
// @access Private
exports.getOrderConversations = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  // Find all orders where user is either client or freelancer
  const orders = await Order.find({
    $or: [
      { client: userId },
      { freelancer: userId }
    ]
  }).populate([
    { path: 'gig', select: 'title' },
    { path: 'client', select: 'name avatar' },
    { path: 'freelancer', select: 'name avatar' }
  ]);

  // Get last message for each order
  const conversations = await Promise.all(
    orders.map(async (order) => {
      const lastMessage = await OrderMessage.findOne({ order: order._id })
        .sort({ timestamp: -1 })
        .populate('sender', 'name avatar');

      return {
        order: {
          _id: order._id,
          gig: order.gig,
          client: order.client,
          freelancer: order.freelancer,
          status: order.status,
          amount: order.amount,
          createdAt: order.createdAt
        },
        lastMessage,
        unreadCount: 0 // Can be implemented later
      };
    })
  );

  res.status(200).json({ 
    success: true, 
    data: conversations 
  });
});

// @desc Mark messages as read
// @route PUT /api/order-chat/:orderId/messages/read
// @access Private
exports.markMessagesAsRead = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;

  await OrderMessage.updateMany(
    { 
      order: orderId, 
      receiver: req.user._id,
      isRead: false 
    },
    { isRead: true }
  );

  res.status(200).json({ 
    success: true, 
    message: 'Messages marked as read' 
  });
});
