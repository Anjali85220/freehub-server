const mongoose = require('mongoose');

const gigSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: { 
    type: String, 
    required: [true, 'Please add a description'],
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  price: { 
    type: Number, 
    required: [true, 'Please add a price'],
    min: [5, 'Price must be at least $5']
  },
  deliveryTime: { 
    type: Number, 
    required: [true, 'Please add delivery time'],
    min: [1, 'Delivery time must be at least 1 day']
  },
  category: { 
    type: String, 
    required: [true, 'Please select a category'],
    enum: [
      'graphics-design',
      'digital-marketing',
      'writing-translation',
      'video-animation',
      'music-audio',
      'programming-tech',
      'business',
      'lifestyle'
    ]
  },
  images: [{ 
    type: String,
    required: [true, 'Please upload at least one image']
  }],
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['active', 'pending', 'paused', 'draft', 'rejected'], 
    default: 'pending' 
  },
  views: { type: Number, default: 0 },
  orders: { type: Number, default: 0 },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
gigSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Gig', gigSchema);