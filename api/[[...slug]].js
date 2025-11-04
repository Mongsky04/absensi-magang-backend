import app from "../src/app.js";

// Catch-all serverless function so ALL paths are handled by Express app
export default function handler(req, res) {
  return app(req, res);
}
