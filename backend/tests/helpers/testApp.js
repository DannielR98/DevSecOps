import express from "express";

// Creates a small Express app for route-level testing.
// The provided router or routers are mounted under `/api`.
export function createTestApp(...routers) {
  const app = express();
  app.use(express.json());

  // Mount each route module under the same `/api` prefix.
  for (const router of routers) {
    app.use("/api", router);
  }

  return app;
}