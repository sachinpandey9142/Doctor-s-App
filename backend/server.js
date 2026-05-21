const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const initializeSocket = require("./sockets/chatSocket");

const isValidMongoUri = (value) =>
  /^mongodb(?:\+srv)?:\/\//i.test(value) &&
  !/\b(localhost|127\.0\.0\.1)\b/i.test(value);

const isValidClientUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};

const validateEnv = () => {
  const required = ["MONGODB_URI", "JWT_SECRET", "CLIENT_URL", "NODE_ENV"];
  for (const name of required) {
    if (!process.env[name] || !String(process.env[name]).trim()) {
      throw new Error(`${name} is required`);
    }
  }

  const nodeEnv = String(process.env.NODE_ENV).trim();
  if (!["development", "test", "production"].includes(nodeEnv)) {
    throw new Error("NODE_ENV must be development, test, or production");
  }

  if (String(process.env.JWT_SECRET).trim().length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long");
  }

  if (!isValidMongoUri(String(process.env.MONGODB_URI).trim())) {
    throw new Error(
      "MONGODB_URI must be a valid MongoDB Atlas connection string",
    );
  }

  if (nodeEnv === "production") {
    if (/\b(localhost|127\.0\.0\.1)\b/i.test(process.env.MONGODB_URI)) {
      throw new Error(
        "Production MONGODB_URI cannot point to localhost or 127.0.0.1",
      );
    }

    if (
      !isValidClientUrl(String(process.env.CLIENT_URL).trim()) ||
      !String(process.env.CLIENT_URL).startsWith("https://")
    ) {
      throw new Error("CLIENT_URL must use HTTPS in production");
    }
  }
};

const startServer = async () => {
  validateEnv();
  await connectDB();

  const port = Number(process.env.PORT);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be provided by the runtime environment");
  }

  const httpServer = http.createServer(app);
  const io = initializeSocket(httpServer);
  app.set("io", io);

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Doctor's App backend running on http://0.0.0.0:${port}`);
  });
};

startServer().catch((error) => {
  console.error("Fatal startup error:", error);
  process.exit(1);
});
