const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let memoryServer;

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;
  mongoose.set("strictQuery", true);

  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri);
      console.log(`MongoDB connected: ${mongoose.connection.host}`);
      return;
    } catch (error) {
      console.warn("Primary MongoDB connection failed, falling back to in-memory MongoDB.");
    }
  }

  memoryServer = await MongoMemoryServer.create();
  const memoryUri = memoryServer.getUri();
  await mongoose.connect(memoryUri);
  console.log(`MongoDB connected (in-memory): ${mongoose.connection.host}`);
};

module.exports = connectDB;
