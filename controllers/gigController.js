const Gig = require('../models/Gig');
const fs = require('fs');
const path = require('path');

// Create a new gig
exports.createGig = async (req, res) => {
  try {
    const imagePaths = req.files.map(file => `/uploads/${file.filename}`);
    const gigData = {
      ...req.body,
      images: imagePaths,
      createdBy: req.user.id,
      price: Number(req.body.price) // Ensure price is a number
    };

    const gig = new Gig(gigData);
    const savedGig = await gig.save();
    
    res.status(201).json(savedGig);
  } catch (err) {
    // Clean up uploaded files if error occurs
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const filePath = path.join(__dirname, '..', 'uploads', file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
    res.status(400).json({ 
      error: err.message,
      message: 'Failed to create gig' 
    });
  }
};

// Get all gigs
exports.getAllGigs = async (req, res) => {
  try {
    const gigs = await Gig.find().populate('createdBy', 'username email');
    res.json(gigs);
  } catch (err) {
    res.status(500).json({ 
      error: err.message,
      message: 'Failed to fetch gigs' 
    });
  }
};

// Get gigs by user ID
exports.getGigsByUser = async (req, res) => {
  try {
    const gigs = await Gig.find({ createdBy: req.params.userId });
    res.json(gigs);
  } catch (err) {
    res.status(500).json({ 
      error: err.message,
      message: 'Failed to fetch user gigs' 
    });
  }
};

// Get single gig by ID
exports.getGig = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id).populate('createdBy', 'username email');
    if (!gig) {
      return res.status(404).json({ message: 'Gig not found' });
    }
    res.json(gig);
  } catch (err) {
    res.status(400).json({ 
      error: err.message,
      message: 'Failed to fetch gig' 
    });
  }
};

// Update gig
exports.updateGig = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return res.status(404).json({ message: 'Gig not found' });
    }

    // Check if the user owns the gig
    if (gig.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to update this gig' });
    }

    // Handle new image uploads
    let newImagePaths = [];
    if (req.files && req.files.length > 0) {
      newImagePaths = req.files.map(file => `/uploads/${file.filename}`);
    }

    // Combine existing images with new ones (or replace if needed)
    const updatedImages = req.body.keepExistingImages === 'false' ? 
      newImagePaths : 
      [...gig.images, ...newImagePaths];

    const updates = {
      ...req.body,
      images: updatedImages,
      price: Number(req.body.price) // Ensure price is a number
    };

    const updatedGig = await Gig.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.json(updatedGig);
  } catch (err) {
    res.status(400).json({ 
      error: err.message,
      message: 'Failed to update gig' 
    });
  }
};

// Delete gig
exports.deleteGig = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return res.status(404).json({ message: 'Gig not found' });
    }

    // Check if the user owns the gig
    if (gig.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to delete this gig' });
    }

    // Delete associated images
    if (gig.images && gig.images.length > 0) {
      gig.images.forEach(imagePath => {
        const filename = imagePath.split('/uploads/')[1];
        const filePath = path.join(__dirname, '..', 'uploads', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    await gig.deleteOne();
    res.json({ message: 'Gig deleted successfully' });
  } catch (err) {
    res.status(400).json({ 
      error: err.message,
      message: 'Failed to delete gig' 
    });
  }
};