//userRoutes.js
const express = require('express')
const router = express.Router()

// Import user controller functions — each maps to one specific auth operation
const {
  registerUser, // POST / — creates a new user account with a hashed password
  loginUser,    // POST /login — validates credentials and returns a JWT
  getMe,        // GET  /me   — returns the profile of the currently logged-in user
} = require('../controllers/userController')

// Import the `protect` middleware — validates the JWT on any route that requires authentication.
// Attaches the decoded user to req.user so protected controllers can identify who is making the request.
const { protect } = require('../middleware/authMiddleware')

// ---- POST /api/users/ -------------------------- 
// Public — no token required. Accepts { name, email, password } in the request body.
// Registers a new user and returns a JWT so the client is authenticated immediately.

router.post('/', registerUser)

// ---- POST /api/users/login -------------------------- 
// Public — no token required. Accepts { email, password } in the request body.
// Validates credentials against the DB and returns a JWT on success.

router.post('/login', loginUser)

// ---- GET /api/users/me ------------------------- 
// Private — protect runs first and verifies the JWT from the Authorization header.
// If valid, req.user is set and getMe returns that user's profile data.
// If invalid or missing, protect rejects with a 401 before getMe ever runs.

// The protect short-circuit behavior restated on the /me route 
// — reinforces that getMe is completely unreachable without a valid token

router.get('/me', protect, getMe)

// Export this router so server.js can mount it:
// app.use('/api/users', require('./routes/userRoutes'))
// All routes above are relative to that /api/users base path

module.exports = router