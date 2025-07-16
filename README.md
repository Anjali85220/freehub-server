# 🛠️ Freehub Backend

This is the **Node.js + Express + MongoDB** backend for the **Freehub** freelancer-client marketplace platform. It provides a secure user authentication system using JWT and role-based access (`client` or `freelancer`). This serves as the foundation for features like job posting, bidding, messaging, and payments.

---

## 🔧 Tech Stack

- Node.js
- Express.js
- MongoDB + Mongoose
- JSON Web Token (JWT)
- bcryptjs (for password hashing)
- dotenv (for environment configs)
- CORS (for frontend-backend communication)

---

## ✅ Completed Features (Day 1–4)

### ⚙️ Backend Setup
- [x] Initialized Node.js project with Express
- [x] Connected to MongoDB using Mongoose
- [x] `.env` setup with `PORT`, `MONGO_URI`, and `JWT_SECRET`
- [x] Configured CORS and JSON parsing

### 🔐 Authentication System
- [x] User model with role (`client` or `freelancer`)
- [x] Register API with hashed passwords and JWT token
- [x] Login API with secure token generation
- [x] Auth middleware for protecting private routes

---

## 📁 Folder Structure

freehub-backend/
├── models/
│ └── User.js
├── routes/
│ └── authRoutes.js
├── middleware/
│ └── authMiddleware.js
├── .env
├── index.js
├── package.json
└── screenshots/
├── server-running.png
├── register-api.png
└── login-api.png



## 🧪 Environment Variables

Create a `.env` file in the project root with the following:

```env
PORT=5000
MONGO_URI=mongodb+srv://shivanjalidumpala8:Shivanjali85220@freehub-data.qa76obt.mongodb.net/?retryWrites=true&w=majority&appName=freehub-
JWT_SECRET=b3ac6d773d081bae6264b89a1d0c7e2f52addb0b2806a4530d42b1bd634115f2ecad1cb742f729e3a4c0fed110b395ebea92fe1ffa71fbe7ea0f033186ae78c1