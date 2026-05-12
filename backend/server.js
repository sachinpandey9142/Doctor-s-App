const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const initializeSocket = require("./sockets/chatSocket");

const isPortFree = (port) =>
  new Promise((resolve) => {
    const tester = http.createServer();

    tester.unref();
    tester.once("error", () => resolve(false));
    tester.listen(port, '0.0.0.0', () => {
      tester.close(() => resolve(true));
    });
  });

const resolvePort = async () => {
  const preferredPort = Number(
    process.env.BACKEND_PORT || process.env.PORT || 8080,
  );

  if (await isPortFree(preferredPort)) {
    return preferredPort;
  }

  for (let port = preferredPort + 1; port < preferredPort + 21; port += 1) {
    if (await isPortFree(port)) {
      console.warn(`Port ${preferredPort} is busy. Falling back to ${port}.`);
      return port;
    }
  }

  throw new Error(
    `No free port found in range ${preferredPort}-${preferredPort + 20}`,
  );
};

const startServer = async () => {
  await connectDB();

  const port = await resolvePort();

  const httpServer = http.createServer(app);
  const io = initializeSocket(httpServer);
  app.set("io", io);

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Doctor's App backend running on http://0.0.0.0:${port}`);
  });
};

startServer().catch((error) => {
  console.error("Fatal startup error:", error);
  process.exit(1);
});
