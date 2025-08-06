const asyncHandler = require('express-async-handler');
const Message = require('../models/Message');
const ErrorResponse = require('../utils/errorResponse');

// @desc Send a message
// @route POST /api/messages
// @access Private
exports.sendMessage = asyncHandler(async (req, res, next) => {
  const { receiverId, content } = req.body;
  if (!receiverId || !content) {
    return next(new ErrorResponse('Receiver ID and content are required', 400));
  }

  const message = await Message.create({
    sender: req.user._id,
    receiver: receiverId,
    content,
  });

  res.status(201).json({ success: true, data: message });
});

// @desc Get messages between logged in user and another user
// @route GET /api/messages/:userId
// @access Private
exports.getMessages = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const otherUserId = req.params.userId;

  const messages = await Message.find({
    $or: [
      { sender: userId, receiver: otherUserId },
      { sender: otherUserId, receiver: userId }
    ]
  }).sort({ timestamp: 1 });

  res.status(200).json({ success: true, data: messages });
});
