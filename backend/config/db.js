const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const dns = require("dns").promises;

let memoryServer;

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
      console.warn("Full error:", error);
      // If user provided a direct (non-SRV) URI, try it first
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

      // Try to resolve SRV records and construct a direct URI as a last automatic attempt
      try {
        const srvMatch = mongoUri.match(
          /^mongodb\+srv:\/\/(?:(.+?)@)?([^/]+)(?:\/(\S+?))?(\?.+)?$/,
        );
        if (srvMatch) {
          const userInfo = srvMatch[1] || ""; // username:password
          const host = srvMatch[2]; // cluster hostname
          const dbName = srvMatch[3] || "";
          const params = srvMatch[4] || "";
          const srvName = `_mongodb._tcp.${host}`;
          console.log(
            `Attempting SRV->direct fallback by resolving ${srvName}...`,
          );
          const records = await dns.resolveSrv(srvName);
          if (records && records.length) {
            const hosts = records.map((r) => `${r.name}:${r.port}`).join(",");
            const auth = userInfo ? `${userInfo}@` : "";
            const dbPart = dbName ? `/${dbName}` : "";
            const constructed = `mongodb://${auth}${hosts}${dbPart}${params}`;
            console.log(
              "Constructed direct URI from SRV records, attempting connect...",
            );
            try {
              await mongoose.connect(constructed, connectOptions);
              console.log(
                `MongoDB connected (direct-from-srv): ${mongoose.connection.host}`,
              );
              return;
            } catch (err3) {
              console.warn(
                "Constructed direct connection failed:",
                err3.message,
              );
            }
          }
        }
      } catch (errSrv) {
        console.warn("SRV resolution attempt failed:", errSrv.message);
      }

      console.warn("Falling back to in-memory MongoDB.");
    }
  }

  memoryServer = await MongoMemoryServer.create();
  const memoryUri = memoryServer.getUri();
  await mongoose.connect(memoryUri);
  console.log(`MongoDB connected (in-memory): ${mongoose.connection.host}`);
};

module.exports = connectDB;
