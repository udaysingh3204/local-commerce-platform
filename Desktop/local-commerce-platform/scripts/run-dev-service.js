const net = require("net");
const { spawn } = require("child_process");
const { execSync } = require("child_process");
const path = require("path");

const [, , serviceName, portArg, cwdArg, ...commandParts] = process.argv;

if (!serviceName || !portArg || !cwdArg || commandParts.length === 0) {
  console.error("Usage: node run-dev-service.js <service> <port> <cwd> <command...>");
  process.exit(1);
}

const port = Number(portArg);
const cwd = path.resolve(process.cwd(), cwdArg);

const isPortOccupied = (targetPort) => new Promise((resolve) => {
  if (process.platform === "win32") {
    try {
      const output = execSync(`powershell -NoProfile -Command "Get-NetTCPConnection -State Listen -LocalPort ${targetPort} | Select-Object -First 1 -ExpandProperty LocalPort"`, {
        stdio: ["ignore", "pipe", "ignore"],
      }).toString();

      resolve(Boolean(output.trim()));
      return;
    } catch {
      resolve(false);
      return;
    }
  }

  const tester = net.createServer()

  tester.once("error", (error) => {
    if (error && error.code === "EADDRINUSE") {
      resolve(true)
      return
    }

    resolve(false)
  })

  tester.once("listening", () => {
    tester.close(() => resolve(false))
  })

  tester.listen(targetPort)
});

const run = async () => {
  const occupied = await isPortOccupied(port);

  if (occupied) {
    console.log(`[${serviceName}] Port ${port} already in use. Reusing existing dev server.`);
    return;
  }

  const child = spawn(commandParts[0], commandParts.slice(1), {
    cwd,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
};

run().catch((error) => {
  console.error(`[${serviceName}] ${error.message}`);
  process.exit(1);
});