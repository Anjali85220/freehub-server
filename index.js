const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()
const path = require('path')

// Add debug logging
console.log('Loading authRoutes...')
const authRoutes = require('./routes/authRoutes')
console.log('authRoutes loaded:', typeof authRoutes)

console.log('Loading gigRoutes...')
const gigRoutes = require('./routes/gigs')
console.log('gigRoutes loaded:', typeof gigRoutes)

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Routes
app.get('/', (req, res) => res.send('Freehub API is running 🚀'))
app.use('/api/auth', authRoutes)
app.use('/api/gigs', gigRoutes)

// MongoDB + Server
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true, useUnifiedTopology: true
}).then(() => {
  app.listen(process.env.PORT || 5000, () =>
    console.log(`✅ Server running at http://localhost:${process.env.PORT || 5000}`)
  )
}).catch(err => console.error('❌ MongoDB connection failed:', err))