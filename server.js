//server.js
// ── DNS Override --------------------------────
// If you are facing MongoDB connection issues, make sure to include these lines at the top.
// Forces Node.js to use Google's (8.8.8.8) and Cloudflare's (1.1.1.1) public DNS servers
// instead of the system default — fixes environments where MongoDB's hostnames
// (e.g. cluster0.xxxxx.mongodb.net) fail to resolve correctly

const dns = require('dns')
dns.setServers(['8.8.8.8', '1.1.1.1'])

// ── Core Dependencies --------------------------
const express = require('express')                  // The web framework — handles routing, middleware, and HTTP request/response
const path = require('path')                        // Built-in Node module — builds file system paths that work correctly on any OS (Windows/Mac/Linux)
require('dotenv').config()                          // Loads environment variables from .env into process.env — must run before anything that reads process.env (DB URI, JWT secret, PORT, etc.)

// ── App-specific Imports --------------------------
const connectDB = require('./config/db')            // Function that establishes the Mongoose connection to MongoDB Atlas
const { errorHandler } = require('./middleware/errorMiddleware') // Central error handler — catches any error thrown in a controller and returns a clean JSON response instead of crashing
const cors = require('cors')                        // Cross-Origin Resource Sharing — allows the frontend (running on a different port in dev) to make requests to this API

// Read the port from .env so it can be configured per environment (dev/staging/prod)
// Falls back to 5555 if PORT is not defined in .env
const port = process.env.PORT || 5555

// ── Database Connection --------------------------
// Connect to MongoDB before the server starts accepting requests
connectDB()

// ── Express App Setup --------------------------
const app = express()

// ── Middleware Stack --------------------------
// Order matters — these run top-to-bottom on every incoming request before hitting a route handler

// Allow cross-origin requests from the frontend.
// In development this allows all origins.
// In production, lock this down: cors({ origin: 'https://yoursite.com' })
app.use(cors())

app.use(express.json())                             // Parses incoming requests with a JSON body — populates req.body from JSON payloads (e.g. { email, password })
app.use(express.urlencoded({ extended: false }))    // Parses URL-encoded form bodies (e.g. traditional HTML form submissions) — extended: false uses the simpler querystring library

// Serve the entire /frontend folder as static files so Express can deliver the
// React/HTML build directly. path.join(__dirname, '../frontend') resolves to the
// frontend folder one level up from /backend — visiting '/' loads index.html automatically
// app.use(express.static(path.join(__dirname, '../frontend')))

// const path = require('path') // built into Node — no install needed

// // -- serving frontend from 
// // Serve static files from the frontend folder
// // visiting '/' will load index.html automatically
app.use(express.static(path.join(__dirname, '../frontend')))

// ── API Routes --------------------------
// Mount the service and user routers under their respective base paths.
// All routes defined in serviceRoutes.js are prefixed with /api/services
// All routes defined in userRoutes.js are prefixed with /api/users
app.use('/api/services', require('./routes/serviceRoutes'))
app.use('/api/users', require('./routes/userRoutes'))

// ── Global Error Handler --------------------------
// Must be registered LAST — Express identifies error-handling middleware by its
// position in the stack. Any error thrown (via throw or next(err)) in a route
// or middleware above will bubble down to this handler.
// Overrides Express's default HTML error page with a structured JSON response.
app.use(errorHandler)

// ── Start Server--------------------------
app.listen(port, () => console.log(`Server started on port ${port}`))


// few points to understand: 
// 1: dotenv must run first — before any process.env reads, otherwise DB URIs and secrets will be undefined

// 2: Middleware order is intentional — the stack comment flags that Express runs middleware top-to-bottom, which is why cors(),
//  body parsers, and static files come before routes, and errorHandler comes dead last

// 3: Why errorHandler must be last — Express only treats a 4-argument function as an error handler if it's the final app.use(),
//  otherwise thrown errors fall through to Express's default HTML error page
