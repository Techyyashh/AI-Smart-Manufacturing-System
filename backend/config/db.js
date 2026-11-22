const mongoose = require("mongoose");

// Fail fast instead of hanging when MongoDB is not connected
mongoose.set("bufferCommands", false);

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.log("MONGO_URI not set in backend/.env - running without database (readings will not be saved).");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("MongoDB Connected");
  } catch (error) {
    console.log("MongoDB connection failed - running without database:", error.message);
  }
};

const isDBConnected = () => mongoose.connection.readyState === 1;

module.exports = connectDB;
module.exports.isDBConnected = isDBConnected;
