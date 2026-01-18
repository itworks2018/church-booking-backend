import { Router } from "express";
import { getMetricsCounts } from "../controllers/metrics.controller.js";
import { requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/counts", requireAuth, requireAdmin, getMetricsCounts);

export default router;
