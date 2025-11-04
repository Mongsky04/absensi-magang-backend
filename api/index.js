import app from "../src/app.js";

// Vercel @vercel/node prefers a default export function (req, res)
export default function handler(req, res) {
	return app(req, res);
}
