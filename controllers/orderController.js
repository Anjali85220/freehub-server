
const Order = require('../models/Order');
const Gig = require('../models/Gig');
const User = require('../models/User');
const Notification = require('../models/Notification');
const asyncHandler = require('express-async-handler');
const ErrorResponse = require('../utils/errorResponse');

// @desc Create order directly without payment
// @route POST /api/orders/create-order
// @access Private
exports.createOrder = asyncHandler(async (req, res, next) => {
  const { gigId } = req.body;
  if (!gigId) {
    return next(new ErrorResponse('Gig ID is required', 400));
  }

  const gig = await Gig.findById(gigId);
  if (!gig) {
    return next(new ErrorResponse('Gig not found', 404));
  }

  if (!gig.createdBy) {
    return next(new ErrorResponse('Gig creator information missing', 400));
  }

  // Create order directly
  const order = await Order.create({
    gig: gigId,
    client: req.user._id,
    freelancer: gig.createdBy,
    amount: gig.price,
    status: 'pending',
  });

  // Create notification for freelancer
  await Notification.create({
    user: gig.createdBy,
    type: 'new_order',
    title: 'New Order Received',
    message: `You have received a new order for "${gig.title}" from ${req.user.name}`,
    order: order._id,
    gig: gigId,
    sender: req.user._id
  });

  res.status(201).json({ 
    success: true, 
    message: 'Order placed successfully!',
    data: order 
  });
});

// @desc Create orders for multiple gigs (for cart checkout)
// @route POST /api/orders/create-orders
// @access Private
exports.createOrders = asyncHandler(async (req, res, next) => {
  const { gigIds } = req.body;
  if (!gigIds || !Array.isArray(gigIds) || gigIds.length === 0) {
    return next(new ErrorResponse('Gig IDs array is required', 400));
  }

  const orders = [];
  for (const gigId of gigIds) {
    const gig = await Gig.findById(gigId);
    if (!gig) {
      continue; // Skip if gig not found
    }

    if (!gig.createdBy) {
      continue; // Skip if gig creator info missing
    }

    const order = await Order.create({
      gig: gigId,
      client: req.user._id,
      freelancer: gig.createdBy,
      amount: gig.price,
      status: 'pending',
    });
    orders.push(order);
  }

  if (orders.length === 0) {
    return next(new ErrorResponse('No valid gigs found to create orders', 400));
  }

  res.status(201).json({ 
    success: true, 
    message: `${orders.length} order(s) placed successfully!`,
    data: orders 
  });
});

// @desc Get orders for logged in user (client or freelancer)
// @route GET /api/orders/my-orders
// @access Private
exports.getMyOrders = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  // Find orders where user is client or freelancer
  const orders = await Order.find({
    $or: [{ client: userId }, { freelancer: userId }]
  })
  .populate('gig')
  .populate('client', 'name email')
  .populate('freelancer', 'name email')
  .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: orders });
});

// @desc Get orders for logged in freelancer
// @route GET /api/orders/freelancer-orders
// @access Private
exports.getFreelancerOrders = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  // Find orders where user is freelancer
  const orders = await Order.find({
    freelancer: userId
  })
  .populate('gig')
  .populate('client', 'name email')
  .populate('freelancer', 'name email')
  .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: orders });
});

// @desc Get order details by ID
// @route GET /api/orders/:orderId
// @access Private
exports.getOrderById = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const userId = req.user._id;

  const order = await Order.findById(orderId)
    .populate('gig')
    .populate('client', 'name email')
    .populate('freelancer', 'name email');

  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  // Authorization: only client or freelancer can view
  if (!order.client._id.equals(userId) && !order.freelancer._id.equals(userId)) {
    return next(new ErrorResponse('Not authorized to view this order', 403));
  }

  res.status(200).json({ success: true, data: order });
});

// @desc Update order status
// @route PATCH /api/orders/:orderId/status
// @access Private
exports.updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const { status } = req.body;
  const userId = req.user._id;

  const allowedStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
  if (!allowedStatuses.includes(status)) {
    return next(new ErrorResponse('Invalid status value', 400));
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  // Authorization: only client or freelancer can update
  if (!order.client.equals(userId) && !order.freelancer.equals(userId)) {
    return next(new ErrorResponse('Not authorized to update this order', 403));
  }

  order.status = status;
  await order.save();

  // Create notification based on status change
  let notificationData = {
    order: order._id,
    gig: order.gig
  };

  if (status === 'in-progress') {
    // Freelancer accepted the order
    notificationData.user = order.client;
    notificationData.type = 'order_accepted';
    notificationData.title = 'Order Accepted';
    notificationData.message = `Your order has been accepted by the freelancer`;
    notificationData.sender = userId;
  } else if (status === 'cancelled') {
    // Freelancer rejected the order
    notificationData.user = order.client;
    notificationData.type = 'order_rejected';
    notificationData.title = 'Order Rejected';
    notificationData.message = `Your order has been rejected by the freelancer`;
    notificationData.sender = userId;
  } else if (status === 'completed') {
    // Order completed
    notificationData.user = order.client;
    notificationData.type = 'order_completed';
    notificationData.title = 'Order Completed';
    notificationData.message = `Your order has been completed`;
    notificationData.sender = userId;
  }

  if (notificationData.user) {
    await Notification.create(notificationData);
  }

  res.status(200).json({ success: true, data: order });
});

// @desc Accept order (freelancer only)
// @route PATCH /api/orders/:orderId/accept
// @access Private (freelancer)
exports.acceptOrder = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const userId = req.user._id;

  const order = await Order.findById(orderId)
    .populate('gig')
    .populate('client', 'name email')
    .populate('freelancer', 'name email');

  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  // Verify user is the freelancer for this order
  if (!order.freelancer._id.equals(userId)) {
    return next(new ErrorResponse('Not authorized to accept this order', 403));
  }

  if (order.status !== 'pending') {
    return next(new ErrorResponse('Order is not in pending status', 400));
  }

  order.status = 'in-progress';
  await order.save();

  // Create notification for client
  await Notification.create({
    user: order.client._id,
    type: 'order_accepted',
    title: 'Order Accepted',
    message: `Your order for "${order.gig.title}" has been accepted by ${req.user.name}`,
    order: order._id,
    gig: order.gig._id,
    sender: userId
  });

  res.status(200).json({ 
    success: true, 
    message: 'Order accepted successfully',
    data: order 
  });
});

// @desc Reject order (freelancer only)
// @route PATCH /api/orders/:orderId/reject
// @access Private (freelancer)
exports.rejectOrder = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const { reason } = req.body;
  const userId = req.user._id;

  const order = await Order.findById(orderId)
    .populate('gig')
    .populate('client', 'name email')
    .populate('freelancer', 'name email');

  if (!order) {
    return next(new ErrorResponse('Order not found', 404));
  }

  // Verify user is the freelancer for this order
  if (!order.freelancer._id.equals(userId)) {
    return next(new ErrorResponse('Not authorized to reject this order', 403));
  }

  if (order.status !== 'pending') {
    return next(new ErrorResponse('Order is not in pending status', 400));
  }

  order.status = 'cancelled';
  await order.save();

  // Create notification for client
  await Notification.create({
    user: order.client._id,
    type: 'order_rejected',
    title: 'Order Rejected',
    message: `Your order for "${order.gig.title}" has been rejected by ${req.user.name}${reason ? `: ${reason}` : ''}`,
    order: order._id,
    gig: order.gig._id,
    sender: userId
  });

  res.status(200).json({ 
    success: true, 
    message: 'Order rejected successfully',
    data: order 
  });
});

// @desc Get notifications for logged in user
// @route GET /api/orders/notifications
// @access Private
exports.getNotifications = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  const notifications = await Notification.find({ user: userId })
    .populate('order', 'status amount')
    .populate('gig', 'title')
    .populate('sender', 'name')
    .sort({ createdAt: -1 })
    .limit(50);

  res.status(200).json({ success: true, data: notifications });
});

// @desc Mark notification as read
// @route PATCH /api/orders/notifications/:notificationId/read
// @access Private
exports.markNotificationAsRead = asyncHandler(async (req, res, next) => {
  const { notificationId } = req.params;
  const userId = req.user._id;

  const notification = await Notification.findById(notificationId);
  if (!notification) {
    return next(new ErrorResponse('Notification not found', 404));
  }

  if (!notification.user.equals(userId)) {
    return next(new ErrorResponse('Not authorized to mark this notification as read', 403));
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json({ success: true, data: notification });
});

// @desc Get unread notification count
// @route GET /api/orders/notifications/unread-count
// @access Private
exports.getUnreadNotificationCount = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  const count = await Notification.countDocuments({ 
    user: userId, 
    isRead: false 
  });

  res.status(200).json({ success: true, data: { count } });
});
