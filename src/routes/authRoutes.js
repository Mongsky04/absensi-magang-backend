import express from "express";
import { register, login, me, logout } from "../controllers/authController.js";
import { changeMyPassword } from "../controllers/userController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.get("/me", me);
router.post("/logout", logout);
router.post("/register", register);
router.post("/change-password", requireAuth, changeMyPassword);

export default router;
