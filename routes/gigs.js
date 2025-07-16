const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const multer = require('multer');
const gigController = require('../controllers/gigController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// POST /api/gigs
router.post('/', auth, upload.array('images', 3), async (req, res) => {
  const imageUrls = req.files.map(file => `https://dummyimage.com/600x400/000/fff&text=${file.originalname}`);
  const gig = new Gig({
    ...req.body,
    images: imageUrls,
    createdBy: req.userId
  });
  await gig.save();
  res.status(201).json(gig);
});


// Create a new gig
router.post('/', verifyToken, upload.array('images', 5), gigController.createGig);

// Get all gigs
router.get('/', gigController.getAllGigs);

// Get gigs by user ID
router.get('/user/:userId', gigController.getGigsByUser);

// Get single gig by ID
router.get('/:id', gigController.getGig);



// Delete gig
router.delete('/:id', verifyToken, gigController.deleteGig);

module.exports = router;