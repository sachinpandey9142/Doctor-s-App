const { spawn } = require("child_process");
const net = require("net");

const commonOptions = {
  stdio: "inherit",
};

const shellCommand = process.platform === "win32" ? "cmd.exe" : "sh";
const shellFlag = process.platform === "win32" ? ["/d", "/s", "/c"] : ["-c"];

const isPortFree = (port) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", () => resolve(false));
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
  });

const findAvailablePort = async (startPort, limit = 20) => {
  for (let port = startPort; port < startPort + limit; port += 1) {
    // Keep the default 8080 when possible, but fall back if another process owns it.
    if (await isPortFree(port)) {
      return port;
    }
  }

  throw new Error(
    `No free port found in range ${startPort}-${startPort + limit - 1}`,
  );
};

const start = async () => {
  const backendPort = await findAvailablePort(8080);

  process.env.BACKEND_PORT = String(backendPort);
  process.env.PORT = String(backendPort);
  process.env.EXPO_PUBLIC_API_BASE_URL = `http://127.0.0.1:${backendPort}/api`;
  process.env.EXPO_PUBLIC_SOCKET_URL = `http://127.0.0.1:${backendPort}`;

  const backend = spawn(process.execPath, ["backend/server.js"], commonOptions);

  // Start admin web (Vite)
  const frontend = spawn(
    shellCommand,
    [...shellFlag, "npm --prefix admin-web run dev"],
    commonOptions,
  );

  // Start mobile (Expo)
  const mobile = spawn(
    shellCommand,
    [...shellFlag, "npm --prefix mobile start"],
    commonOptions,
  );

  const stop = () => {
    backend.kill();
    frontend.kill();
    mobile.kill();
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  backend.on("exit", (code) => {
    if (code && code !== 0) {
      frontend.kill();
      mobile.kill();
      process.exit(code);
    }
  });

  frontend.on("exit", (code) => {
    if (code && code !== 0) {
      backend.kill();
      mobile.kill();
      process.exit(code);
    }
  });

  mobile.on("exit", (code) => {
    if (code && code !== 0) {
      backend.kill();
      frontend.kill();
      process.exit(code);
    }
  });
};

start().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
