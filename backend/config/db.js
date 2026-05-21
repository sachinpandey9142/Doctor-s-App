const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;
  const directUri = process.env.MONGODB_DIRECT_URI;
  mongoose.set("strictQuery", true);

  const connectOptions = {
    serverSelectionTimeoutMS: 5000,
  };

  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, connectOptions);
      console.log(`MongoDB connected: ${mongoose.connection.host}`);
      return;
    } catch (error) {
      console.warn("Primary MongoDB connection failed:", error.message);

      // If user provided a direct (non-SRV) URI, try it once.
      if (directUri) {
        console.log("Attempting fallback to MONGODB_DIRECT_URI...");
        try {
          await mongoose.connect(directUri, connectOptions);
          console.log(
            `MongoDB connected (direct): ${mongoose.connection.host}`,
          );
          return;
        } catch (err2) {
          console.warn("Direct MongoDB connection failed:", err2.message);
        }
      }
      throw error;
    }
  }

  throw new Error("MONGODB_URI is required to start the backend.");
};

module.exports = connectDB;
