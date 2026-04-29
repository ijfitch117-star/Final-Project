//userController.js
const asyncHandler = require('express-async-handler') // Wraps async route handlers to automatically catch errors and pass them to Express's error middleware (no try/catch needed)
const jwt = require('jsonwebtoken')                   // Used to create and verify JSON Web Tokens for stateless authentication
const bcrypt = require('bcryptjs')                    // Used to hash passwords before storage and compare them during login

// Import the Mongoose User model to interact with the 'users' collection in MongoDB
const User = require('../model/userModel')

// ─────────────────────────────────────────────
// @desc    Register a new user
// @route   POST /api/users/
// @access  Public (no token required)
// ─────────────────────────────────────────────
const registerUser = asyncHandler(async (req, res) => {

    // Destructure required fields from the incoming JSON request body
    const { name, email, password } = req.body

    // Validate that all required fields are present — reject early if any are missing
    if (!name || !email || !password) {
        throw new Error("Please add all fields") // asyncHandler will catch this and forward to Express error handler
    }

    // Check if a user with this email already exists in the database
    // findOne returns null if not found, or the matching document if found
    const userExists = await User.findOne({$or: [{ email }, {name}]});
    if (userExists) {
        res.status(400) // 400 Bad Request — client sent invalid data (duplicate email)
        throw new Error('User already exists')
    }

    // ── Password Hashing ──────────────────────────────────────────────────────
    // Never store plain-text passwords. bcrypt adds a "salt" (random data) before
    // hashing so that identical passwords produce different hashes each time.
    const salt = await bcrypt.genSalt(10)                      // 10 = cost factor (higher = slower but more secure)
    const hashedPassword = await bcrypt.hash(password, salt)   // Produces a one-way hash that can't be reversed
    // ─────────────────────────────────────────────────────────────────────────

    // Create and persist a new User document in MongoDB using the hashed password
    const user = await User.create({
        name,
        email,
        password: hashedPassword // Store the hash, never the raw password
    })

    if (user) {
        // 201 Created — request succeeded and a new resource was created
        res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id) // Issue a JWT so the client is immediately authenticated after registration
        })
    } else {
        // User.create() returned a falsy value — the data didn't pass Mongoose schema validation
        res.status(400)
        throw new Error('Invalid user data')
    }
})


// ─────────────────────────────────────────────
// @desc    Authenticate an existing user and return a token
// @route   POST /api/users/login/
// @access  Public (no token required)
// ─────────────────────────────────────────────
const loginUser = asyncHandler(async (req, res) => {

    // Destructure credentials from the request body
    const { email, password } = req.body 

    // Look up the user by email — returns null if no match
    const user = await User.findOne({$or: [{ email }, { name: email}]}) // from database but encrypted

    // bcrypt.compare() hashes the plain-text input and compares it to the stored hash.
    // This is the only safe way to check passwords — you can never "unhash" to compare directly.
    if (user && (await bcrypt.compare(password, user.password))) {
        // Credentials are valid — respond with user info and a fresh JWT
        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id) // Client stores this token and sends it with future protected requests
        })
    } else {
        // Either no user was found OR the password didn't match.
        // Intentionally using the same error message for both cases to avoid
        // leaking whether an email address is registered ("security through ambiguity").
        res.status(400)
        throw new Error('Invalid credentials')
    }
})


// ─────────────────────────────────────────────
// @desc    Return the currently authenticated user's profile
// @route   GET /api/users/me
// @access  Private (requires a valid JWT — enforced by the `protect` middleware)
// ─────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {

    // `req.user` is NOT available by default — it is attached by the `protect` middleware,
    // which runs before this handler. The middleware validates the incoming JWT, decodes
    // the user ID from its payload, fetches the user from the DB, and sets req.user.
    // If the token is missing or invalid, `protect` rejects the request before we ever get here.
    const { _id, name, email } = await User.findById(req.user.id)

    res.status(200).json({
        id: _id,
        name,
        email
    })
})


// ─────────────────────────────────────────────
// Helper: Generate a signed JSON Web Token (JWT)
// Called after successful registration and login.
// ─────────────────────────────────────────────
const generateToken = (id) => {
    return jwt.sign(
        { id },                      // Payload — the data embedded inside the token (kept minimal: just the user ID)
        process.env.JWT_SECRET,      // Secret key used to sign the token — must be kept private on the server; anyone with this key can forge tokens
        {
            expiresIn: '30d'         // Expiry — token becomes invalid after 30 days, forcing re-login and limiting the window of damage if a token is ever stolen
        }
    )
}


// Export all controller functions so they can be wired to routes in userRoutes.js
module.exports = {
    registerUser,
    loginUser,
    getMe
}