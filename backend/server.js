const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const initializeSocket = require("./sockets/chatSocket");

const PORT = Number(process.env.BACKEND_PORT || process.env.PORT || 8080);

const startServer = async () => {
  await connectDB();

  const httpServer = http.createServer(app);
  const io = initializeSocket(httpServer);
  app.set("io", io);

  httpServer.listen(PORT, () => {
    console.log(`Doctor,s App backend running on http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Fatal startup error:", error);
  process.exit(1);
});