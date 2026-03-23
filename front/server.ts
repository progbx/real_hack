import express from "express";
import http from "http";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const BACKEND_HOST = "127.0.0.1";
const BACKEND_PORT = 8001;

function proxyTo(prefix: string) {
  return (req: any, res: any) => {
    const options = {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: prefix + req.url,
      method: req.method,
      headers: { ...req.headers, host: `${BACKEND_HOST}:${BACKEND_PORT}` },
    };
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode!, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });
    proxyReq.on("error", (e) => {
      console.error("Proxy error:", e.message);
      if (!res.headersSent) res.status(502).json({ error: "Backend unavailable" });
    });
    req.pipe(proxyReq, { end: true });
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Proxy /api and /uploads → FastAPI backend (before Vite middleware)
  app.use("/api", proxyTo("/api"));
  app.use("/uploads", proxyTo("/uploads"));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  http.createServer(app).listen(PORT, "0.0.0.0", () => {
    console.log(`Frontend: http://localhost:${PORT}`);
    console.log(`Phone:    http://172.20.10.8:${PORT}`);
    console.log(`Backend:  http://${BACKEND_HOST}:${BACKEND_PORT}`);
  });
}

startServer();
