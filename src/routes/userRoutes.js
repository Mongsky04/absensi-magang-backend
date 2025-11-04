import express from "express";
import { requireAuth, isAdmin } from "../middleware/authMiddleware.js";
import { listUsers, createUser, updateUser, resetPassword, deleteUser } from "../controllers/userController.js";

const router = express.Router();

router.use(requireAuth, isAdmin);
router.get("/", listUsers);
router.post("/", createUser);
router.patch("/:id", updateUser);
router.post("/:id/reset-password", resetPassword);
router.delete("/:id", deleteUser);

export default router;
