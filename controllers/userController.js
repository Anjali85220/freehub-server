const User = require('../models/User');
const Gig = require('../models/Gig');
const asyncHandler = require('express-async-handler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get user's favorite gigs
// @route   GET /api/user/favorites
// @access  Private
exports.getFavorites = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  const user = await User.findById(userId).populate('favorites');
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: user.favorites || []
  });
});

// @desc    Add a gig to user's favorites
// @route   POST /api/user/favorites/:gigId
// @access  Private
exports.addFavorite = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const gigId = req.params.gigId;

  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  const gig = await Gig.findById(gigId);
  if (!gig) {
    return next(new ErrorResponse('Gig not found', 404));
  }

  if (user.favorites.includes(gigId)) {
    return next(new ErrorResponse('Gig already in favorites', 400));
  }

  user.favorites.push(gigId);
  await user.save();

  res.status(200).json({
    success: true,
    data: user.favorites
  });
});

// @desc    Remove a gig from user's favorites
// @route   DELETE /api/user/favorites/:gigId
// @access  Private
exports.removeFavorite = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const gigId = req.params.gigId;

  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  if (!user.favorites.includes(gigId)) {
    return next(new ErrorResponse('Gig not in favorites', 400));
  }

  user.favorites = user.favorites.filter(favId => favId.toString() !== gigId);
  await user.save();

  res.status(200).json({
    success: true,
    data: user.favorites
  });
});

// @desc    Get current user profile
// @route   GET /api/user/profile
// @access  Private
exports.getProfile = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  const user = await User.findById(userId).select('-password');
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Add role-specific data
  let profileData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

  // Add role-specific information
  if (user.role === 'freelancer') {
    profileData.profileType = 'Freelancer Account';
    profileData.accountType = 'Service Provider';
    profileData.isFreelancer = true;
    profileData.isClient = false;
  } else if (user.role === 'client') {
    profileData.profileType = 'Client Account';
    profileData.accountType = 'Service Buyer';
    profileData.isFreelancer = false;
    profileData.isClient = true;
  }

  res.status(200).json({
    success: true,
    data: profileData
  });
});

// @desc    Get freelancer profile (ensures user is freelancer)
// @route   GET /api/user/freelancer-profile
// @access  Private (Freelancer only)
exports.getFreelancerProfile = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  const user = await User.findById(userId).select('-password');
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  if (user.role !== 'freelancer') {
    return next(new ErrorResponse('Access denied. User is not a freelancer.', 403));
  }

  // Get freelancer's gigs count
  const gigCount = await Gig.countDocuments({ userId: userId });
  
  // Get total orders for freelancer's gigs
  const orderCount = await Order.countDocuments({ 
    gigId: { $in: await Gig.find({ userId: userId }).distinct('_id') }
  });

  const profileData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    profileType: 'Freelancer Account',
    accountType: 'Service Provider',
    gigCount,
    orderCount,
    memberSince: user.createdAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

  res.status(200).json({
    success: true,
    data: profileData
  });
});

// @desc    Get client profile (ensures user is client)
// @route   GET /api/user/client-profile
// @access  Private (Client only)
exports.getClientProfile = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  const user = await User.findById(userId).select('-password');
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  if (user.role !== 'client') {
    return next(new ErrorResponse('Access denied. User is not a client.', 403));
  }

  // Get client's orders count
  const orderCount = await Order.countDocuments({ buyerId: userId });
  
  // Get total spent amount
  const orders = await Order.find({ buyerId: userId }).populate('gigId');
  const totalSpent = orders.reduce((sum, order) => sum + (order.gigId?.price || 0), 0);

  const profileData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    profileType: 'Client Account',
    accountType: 'Service Buyer',
    orderCount,
    totalSpent,
    memberSince: user.createdAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

  res.status(200).json({
    success: true,
    data: profileData
  });
});

// @desc    Update current user profile
// @route   PUT /api/user/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const { name, email, password } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  if (name) user.name = name;
  if (email) user.email = email;
  if (password) user.password = password; // Assume password hashing middleware

  await user.save();

  res.status(200).json({
    success: true,
    data: user
  });
});
