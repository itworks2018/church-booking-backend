import { Router } from "express";
import { getUsersSummary } from "../controllers/users.controller.js";
import { requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// 🔹 Metric card: Total users count
router.get("/summary", requireAdmin, getUsersSummary);

export default router;
