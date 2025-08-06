const Gig = require('../models/Gig');
const { uploadMultiple } = require('../config/multer');
const fs = require('fs');
const path = require('path');

// Helper function to process uploaded files
const processUploadedFiles = (req) => {
  if (!req.files || !req.files.images) return [];
  return req.files.images.map(file => `/uploads/gigs/${file.filename}`);
};
// @desc    Get all gigs for a user
// @route   GET /api/gigs/user/my-gigs
// @access  Private
exports.getUserGigs = async (req, res) => {
  try {
    const { status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { createdBy: req.user._id };
    if (status && status !== 'all') query.status = status;

    const gigs = await Gig.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalCount = await Gig.countDocuments(query);

    res.status(200).json({
      success: true,
      count: gigs.length,
      data: {
        gigs,
        pagination: {
          totalCount,
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Server Error' 
    });
  }
};

// @desc    Get gig stats for dashboard
// @route   GET /api/gigs/user/my-gigs/stats
// @access  Private
exports.getGigStats = async (req, res) => {
  try {
    const stats = await Gig.aggregate([
      { $match: { createdBy: req.user._id } },
      {
        $group: {
          _id: null,
          totalGigs: { $sum: 1 },
          activeGigs: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0] 
            } 
          },
          pendingGigs: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] 
            } 
          },
          pausedGigs: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paused'] }, 1, 0]
            }
          },
          draftGigs: {
            $sum: {
              $cond: [{ $eq: ['$status', 'draft'] }, 1, 0]
            }
          },
          rejectedGigs: {
            $sum: {
              $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0]
            }
          },
          totalViews: { $sum: '$views' },
          totalOrders: { $sum: '$orders' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: stats[0] || {
        totalGigs: 0,
        activeGigs: 0,
        pendingGigs: 0,
        totalViews: 0,
        totalOrders: 0
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Server Error' 
    });
  }
};

// @desc    Create a new gig
// @route   POST /api/gigs
// @access  Private


// @desc    Create a new gig
// @route   POST /api/gigs
// @access  Private
exports.createGig = async (req, res) => {
  try {
    // Process uploaded files
    const images = processUploadedFiles(req);
    
    if (images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one image'
      });
    }

    // Create gig with the processed data
    const gigData = {
      ...req.body,
      images,
      createdBy: req.user._id
    };

    // Convert string numbers to actual numbers
    gigData.price = Number(gigData.price);
    gigData.deliveryTime = Number(gigData.deliveryTime);

    const gig = await Gig.create(gigData);

    res.status(201).json({
      success: true,
      data: gig
    });
  } catch (err) {
    // Clean up uploaded files if error occurs
    if (req.files && req.files.images) {
      req.files.images.forEach(file => {
        const filePath = path.join(__dirname, `../public/uploads/gigs/${file.filename}`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    res.status(400).json({
      success: false,
      message: err.message || 'Error creating gig'
    });
  }
};

// @desc    Update a gig
// @route   PUT /api/gigs/:id
// @access  Private
exports.updateGig = async (req, res) => {
  try {
    let gig = await Gig.findById(req.params.id);

    if (!gig) {
      return res.status(404).json({ 
        success: false, 
        message: 'Gig not found' 
      });
    }

    // Verify user owns the gig
    if (gig.createdBy.toString() !== req.user._id.toString()) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized to update this gig' 
      });
    }

    // Process uploaded files if any
    let images = gig.images;
    if (req.files && req.files.images) {
      // Delete old images
      gig.images.forEach(image => {
        const filePath = path.join(__dirname, `../public${image}`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
      
      // Set new images
      images = processUploadedFiles(req);
    }

    // Prepare update data
    const updateData = {
      ...req.body,
      images,
      price: Number(req.body.price),
      deliveryTime: Number(req.body.deliveryTime)
    };

    // Update gig
    gig = await Gig.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: gig
    });
  } catch (err) {
    // Clean up uploaded files if error occurs
    if (req.files && req.files.images) {
      req.files.images.forEach(file => {
        const filePath = path.join(__dirname, `../public/uploads/gigs/${file.filename}`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    res.status(400).json({
      success: false,
      message: err.message || 'Error updating gig'
    });
  }
};


// @desc    Delete a gig
// @route   DELETE /api/gigs/:id
// @access  Private
exports.deleteGig = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);

    if (!gig) {
      return res.status(404).json({ 
        success: false, 
        message: 'Gig not found' 
      });
    }

    // Verify user owns the gig
    if (gig.createdBy.toString() !== req.user._id.toString()) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized to delete this gig' 
      });
    }

    // Option 1: Using deleteOne()
    await Gig.deleteOne({ _id: req.params.id });

    // Option 2: Using findByIdAndDelete()
    // await Gig.findByIdAndDelete(req.params.id);

    // Also delete associated images
    if (gig.images && gig.images.length > 0) {
      gig.images.forEach(image => {
        const filePath = path.join(__dirname, `../public${image}`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error('Delete gig error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Server Error' 
    });
  }
};
// @desc    Update gig status
// @route   PATCH /api/gigs/:id/status
// @access  Private
exports.updateGigStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['active', 'pending', 'paused', 'draft', 'rejected'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status value' 
      });
    }

    const gig = await Gig.findById(req.params.id);

    if (!gig) {
      return res.status(404).json({ 
        success: false, 
        message: 'Gig not found' 
      });
    }

    // Verify user owns the gig
    if (gig.createdBy.toString() !== req.user._id.toString()) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized to update this gig' 
      });
    }

    gig.status = status;
    await gig.save();

    res.status(200).json({
      success: true,
      data: gig
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Server Error' 
    });
  }
};
// @desc    Get single gig
// @route   GET /api/gigs/:id
// @access  Private
exports.getSingleGig = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);

    if (!gig) {
      return res.status(404).json({ 
        success: false, 
        message: 'Gig not found' 
      });
    }

    // Verify user owns the gig
    if (gig.createdBy.toString() !== req.user._id.toString()) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized to view this gig' 
      });
    }

    res.status(200).json({
      success: true,
      data: gig
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Server Error' 
    });
  }
};


exports.getGigById = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.gigId)
      .populate('createdBy', 'username profilePicture')
      .lean();

    if (!gig) {
      return res.status(404).json({ 
        success: false,
        message: 'Gig not found' 
      });
    }

    // Increment view count (optional)
    await Gig.findByIdAndUpdate(req.params.gigId, { 
      $inc: { views: 1 } 
    });

    res.status(200).json({
      success: true,
      data: gig
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// Get all gigs (for clients)
exports.getAllGigs = async (req, res) => {
  try {
    // Exclude drafts and get only active gigs
    const gigs = await Gig.find({ status: 'active' })
      .select('-__v -createdAt -updatedAt -status')
      .lean();

    res.status(200).json({
      success: true,
      data: { gigs }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get all categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Gig.distinct('category');
    
    res.status(200).json({
      success: true,
      data: { 
        categories: ['all', ...categories.filter(c => c)] 
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
// @desc    Get all public gigs
// @route   GET /api/gigs/public
// @access  Public
exports.getPublicGigs = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, sortBy } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Build query
    let query = { status: { $in: ['active', 'pending'] } };
    
    // Add search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add category filter
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Add price filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }
    
    // Set sort options
    let sortOptions = { createdAt: -1 }; // Default: newest first
    switch (sortBy) {
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'price-low':
        sortOptions = { price: 1 };
        break;
      case 'price-high':
        sortOptions = { price: -1 };
        break;
      case 'rating':
        sortOptions = { rating: -1 };
        break;
      case 'popular':
        sortOptions = { views: -1, orders: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    // Get gigs with pagination
    const gigs = await Gig.find(query)
      .select('-__v -status')
      .populate('createdBy', 'username name profilePicture email')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalCount = await Gig.countDocuments(query);

    // Add seller info to each gig
    const gigsWithSeller = gigs.map(gig => ({
      ...gig,
      seller: gig.createdBy
    }));

    res.status(200).json({
      success: true,
      count: gigs.length,
      data: {
        gigs: gigsWithSeller,
        pagination: {
          totalCount,
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single public gig
// @route   GET /api/gigs/public/:id
// @access  Public
exports.getPublicGig = async (req, res) => {
  try {
    const gig = await Gig.findOne({ 
      _id: req.params.id,
      status: 'active'
    })
    .populate('createdBy', 'username profilePicture')
    .lean();

    if (!gig) {
      return res.status(404).json({ 
        success: false,
        message: 'Gig not found or not available'
      });
    }

    // Increment view count
    await Gig.findByIdAndUpdate(req.params.id, { 
      $inc: { views: 1 } 
    });

    res.status(200).json({
      success: true,
      data: gig
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
// Search and filter gigs for clients
exports.searchGigs = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, sortBy } = req.query;
    
    let query = { status: 'active' };
    
    // Add search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add category filter
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Add price filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }
    
    // Set sort options
    let sortOptions = { createdAt: -1 }; // Default: newest first
    switch (sortBy) {
      case 'price-low':
        sortOptions = { price: 1 };
        break;
      case 'price-high':
        sortOptions = { price: -1 };
        break;
      case 'rating':
        sortOptions = { rating: -1 };
        break;
      case 'popular':
        sortOptions = { orders: -1 };
        break;
    }
    
    const gigs = await Gig.find(query)
      .populate('createdBy', 'name profileImage email')
      .sort(sortOptions);
    
    res.status(200).json({
      success: true,
      count: gigs.length,
      data: gigs
    });
  } catch (error) {
    console.error('Error searching gigs:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};
