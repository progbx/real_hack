import express from "express";
import https from "https";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import selfsigned from "selfsigned";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Generate self-signed certificate
  const pems = selfsigned.generate(
    [{ name: "commonName", value: "localhost" }],
    { days: 365, algorithm: "sha256" }
  );

  https
    .createServer({ key: pems.private, cert: pems.cert }, app)
    .listen(PORT, "0.0.0.0", () => {
      console.log(`Frontend running on https://localhost:${PORT}`);
      console.log(`Open on phone:  https://172.20.10.8:${PORT}`);
      console.log(`Backend API running on http://localhost:8000`);
    });
}

startServer();
