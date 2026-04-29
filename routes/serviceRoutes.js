// serviceRoutes.js
// Import Express — needed to access the Router factory function
const express = require('express')

// Create a Router instance
// keeping route definitions modular and out of the main server.js file
const router = express.Router()

// Import CRUD controller functions from serviceController.js
// Each function handles exactly one operation and is mapped to a route + HTTP method below

const {
    getServices,    // GET    — fetch all services belonging to the authenticated user
    setService,     // POST   — create a new service
    updateService,  // PUT    — overwrite an existing service by ID
    deleteService   // DELETE — remove a service by ID
} = require('../controllers/serviceController')

// Import the `protect` middleware from authMiddleware.js
// `protect` runs BEFORE the controller on any route it's applied to.
// It validates the incoming JWT from the Authorization header, decodes the user ID,
// fetches that user from the DB, and attaches them to req.user.
// If the token is missing, expired, or invalid — it rejects the request with a 401
// and the controller function never runs.
// Please look into this code (../middleware/authMiddleware)

const { protect } = require('../middleware/authMiddleware')

router.get('/public/services', async (req, res) => {
    const Service = require('../model/serviceModel')
    const services = await Service.find().limit(6)
    res.status(200).json(services)
})


// ---- Routes for /api/services/ --------------------------
// GET  /api/services/  → protect runs first, then getServices (returns all services for req.user)
// POST /api/services/  → protect runs first, then setService  (creates a service owned by req.user)

router.route('/').get(protect, getServices).post(protect, setService)

// ---- Routes for /api/services/:id--------------------------
// PUT    /api/services/:id → protect runs first, then updateService (edits service with matching :id)
// DELETE /api/services/:id → protect runs first, then deleteService (removes service with matching :id)
// :id is a URL parameter accessible in the controller via req.params.id

router.route('/:id').put(protect, updateService).delete(protect, deleteService)

// Export this router so server.js can mount it:
// app.use('/api/services', require('./routes/serviceRoutes'))
// All routes defined above are relative to that /api/services base path
module.exports = router