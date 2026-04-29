//serviceModel.js
const mongoose = require('mongoose') // Mongoose is the ODM (Object Data Modeling) library that lets us define schemas and interact with MongoDB using JavaScript objects

// Define the shape and rules for documents in the 'services' collection
const serviceSchema = mongoose.Schema(
  {
    // ---- Relationship Field ----------------------------------------------
    // Every service must belong to a user. Instead of duplicating user data,
    // we store a reference (foreign key equivalent) to the User document.
    
    user: {
      type: mongoose.Schema.Types.ObjectId, 
      // ObjectId is MongoDB's built-in unique ID type — links this service to a specific User document
      
      required: true,                       
      // A service cannot exist without an owner
      
      ref: 'User',                          
      // Tells Mongoose which model this ObjectId points to — enables .populate('user') to fetch full user data in queries
    },
    id: {
      type: Number, 
      required: true,
      unique: true,                          
      // Tells Mongoose which model this ObjectId points to — enables .populate('user') to fetch full user data in queries
    },
    // ---- service Content ----------------------------------------------
    name: {
      type: String,
      required: [true, 'Please add a service name']
    },

    price: {
      type: Number,
      required: [true, 'Please add a price']
    },

    description: {
      type: String,
      default: ''
    }

  },

  // ---- Schema Options ----------------------------------------------
  {
    timestamps: true, // Automatically adds and manages `createdAt` and `updatedAt` fields on every document
    //  — no need to set them manually
  }
)

// Compile the schema into a Model and export it.
// Mongoose will map this to a MongoDB collection named 'services' (lowercased + pluralized automatically).
// Other files import this to query, create, update, or delete services: e.g. await Service.create({...})
module.exports = mongoose.model('service', serviceSchema)