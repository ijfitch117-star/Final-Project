// Import Mongoose 
//  it's the ODM (Object Data Modeling) library that lets us interact 
// with MongoDB using JavaScript objects
const mongoose = require('mongoose')

// Define an async function 
//  we need async because mongoose.connect() returns a Promise and we want to await it
const connectDB = async()=>{

    // Wrap in try-catch so we can handle connection failures properly instead of crashing silently
    try {
        // Connect to MongoDB using the URI stored in .env 
        //  await pauses here until the connection succeeds or fails
        const conn = await mongoose.connect(process.env.MONGO_URI);

        // Log a success message with the host address 
        //  useful for confirming which server we're connected to mongo server
        console.log("MongoDB connected yayyy", conn.connection.host)
        
    } catch (error) {
        // If connection fails (wrong URI, DB is down, network issue), 
        // log the error so we know what went wrong
        console.log(error)

        // Exit the entire Node.js process with code 1 
        //  code 1 means "failure", 
        // because there's no point running the server if the database isn't available
        process.exit(1)
    }
}

// Export the function so server.js can import and call it before starting the server
module.exports = connectDB