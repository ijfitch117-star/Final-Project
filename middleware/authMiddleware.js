//authMiddleware.js
const jwt = require('jsonwebtoken') // Imports JWT library to verify incoming tokens
const asyncHandler = require('express-async-handler') // Wraps async functions to automatically catch errors and pass them to Express error handler — no need for try/catch everywhere
const User = require('../model/userModel') // Imports User model to look up the user from the database once token is verified

const protect = asyncHandler(async (req, res, next) => { // Middleware function — sits between the request and the route handler, blocks unauthorized access
  let token // Declares token variable in outer scope so both if-blocks below can access it

  if (
    req.headers.authorization && // Checks that an Authorization header actually exists on the request
    req.headers.authorization.startsWith('Bearer') // Checks it follows the Bearer token format — e.g. "Bearer eyJhbG..."
  ) {
    try {
      token = req.headers.authorization.split(' ')[1] // Splits "Bearer eyJhbG..." by space and grabs index [1] 
      // — just the raw token string

      const decoded = jwt.verify(token, process.env.JWT_SECRET) // Verifies the token's signature using your secret key — 
      // also checks expiry. Returns the decoded payload { id } if valid, throws if tampered or expired

      req.user = await User.findById(decoded.id).select('-password') // Looks up the real user in MongoDB using the id embedded in the token 
      // — .select('-password') strips the password field from the returned object for security

      next() // Passes control to the actual route handler — only reached if everything above succeeded
    } catch (error) {
      console.log(error) // Logs the exact JWT error (expired, malformed, invalid signature) for debugging
      res.status(401) // Sets HTTP status to 401 Unauthorized
      throw new Error('Not authorized') // Throws error which asyncHandler catches and forwards to Express error middleware
    }
  }

  if (!token) { // Runs if the Authorization header was missing 
  // or didn't start with 'Bearer' — token was never assigned

    res.status(401) // Sets HTTP status to 401 Unauthorized

    throw new Error('Not authorized, no token') // Throws a different error to distinguish "no token" from "bad token"
  }
})

module.exports = { protect } // Exports the middleware so routes can import and use it to guard protected endpoints